import { Injectable, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { passwordMatches } from './crypto';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/user.model';

const LS_KEY = 'currentUser';
const COL_USERS = 'users';
const COL_SESSIONS = 'sessions';

/**
 * Authentification simple SANS code OTP et sans changement forcé :
 * matricule + mot de passe -> doc session Firestore -> currentUser en localStorage.
 * Hash sha256, session 4h + auto-logout + watchdog.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<AppUser | null>(AuthService.readStored());
  readonly currentUser = this._user.asReadonly();

  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  constructor(private fb: FirebaseService) {
    this.armTimer();
    this.watchdog = setInterval(() => this.checkNow(), 60 * 1000);
    window.addEventListener('focus', () => this.checkNow());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.checkNow();
    });
  }

  private static readStored(): AppUser | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const u = JSON.parse(raw);
      return u && typeof u === 'object' ? (u as AppUser) : null;
    } catch {
      return null;
    }
  }

  // ---------- session ----------

  get token(): string {
    return this._user()?.token || '';
  }

  isSessionExpired(): boolean {
    const u = this._user();
    if (!u || !u.token) return false; // pas de session (page login) -> pas « expirée »
    const exp = Number(u.sessionExpiresAt);
    if (!Number.isFinite(exp)) return true; // session legacy sans expiry -> reconnexion
    return Date.now() >= exp;
  }

  private armTimer(): void {
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    const u = this._user();
    if (!u?.token) return;
    const exp = Number(u.sessionExpiresAt);
    if (!Number.isFinite(exp)) {
      this.logout();
      return;
    }
    const delay = exp - Date.now();
    if (delay <= 0) {
      this.logout();
      return;
    }
    this.logoutTimer = setTimeout(() => this.logout(), delay);
  }

  checkNow(): boolean {
    if (this.isSessionExpired()) {
      if (!window.location.pathname.endsWith('/login')) this.logout();
      else localStorage.removeItem(LS_KEY);
      return true;
    }
    this.armTimer();
    return false;
  }

  // ---------- Firestore helpers ----------

  private async findUserDoc(matricule: string): Promise<{ id: string; data: any } | null> {
    const db = this.fb.firestore();
    const mat = String(matricule || '').trim();
    // Matricule stocké en number (comme campagnes) : essai number puis string.
    for (const v of [Number(mat), mat]) {
      if (typeof v === 'number' && !Number.isFinite(v)) continue;
      const snap = await getDocs(
        query(collection(db, COL_USERS), where('Matricule', '==', v), limit(1)),
      );
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, data: d.data() };
      }
    }
    return null;
  }

  // ---------- API ----------

  async login(matricule: string, pw: string): Promise<AppUser> {
    const mat = String(matricule || '').trim();
    if (!mat || !pw) throw new Error('missing_credentials');
    if (typeof navigator !== 'undefined' && navigator.onLine === false)
      throw new Error('network_error');

    const found = await this.findUserDoc(mat).catch(() => null);
    if (!found) throw new Error('invalid_credentials');
    const d = found.data;
    const storedPw = String(d['Pw'] ?? d['pw'] ?? d['password'] ?? '');
    if (!(await passwordMatches(mat, pw, storedPw))) throw new Error('invalid_credentials');

    const user: AppUser = {
      id: found.id,
      matricule: String(d['Matricule'] ?? mat),
      frName: String(d['FR_Name'] ?? ''),
      arName: String(d['AR_Name'] ?? ''),
      grade: String(d['Grade'] ?? ''),
      bureau: String(d['Code_BR'] ?? d['bureau'] ?? ''),
      userType: String(d['user_type'] ?? 'normal').toLowerCase() === 'admin' ? 'admin' : 'normal',
      pw_changed: Number(d['pw_changed'] ?? (String(d['user_type']).toLowerCase() === 'admin' ? 1 : 0)) || 0,
      email: String(d['email'] ?? d['Email'] ?? ''),
    };

    // Une seule session live par user : purge des anciennes puis création.
    const db = this.fb.firestore();
    try {
      const old = await getDocs(
        query(collection(db, COL_SESSIONS), where('matricule', '==', mat)),
      );
      await Promise.all(old.docs.map((s) => deleteDoc(s.ref).catch(() => undefined)));
    } catch {
      /* best-effort */
    }
    const token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await setDoc(doc(db, COL_SESSIONS, token), {
      matricule: mat,
      createdAt: Date.now(),
    });

    const startedAt = Date.now();
    const full: AppUser = {
      ...user,
      token,
      sessionStartedAt: startedAt,
      sessionExpiresAt: startedAt + environment.sessionTtlMs,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(full));
    this._user.set(full);
    this.armTimer();
    return full;
  }

  logout(): void {
    const token = this.token;
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* noop */
    }
    this._user.set(null);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    if (token) {
      try {
        deleteDoc(doc(this.fb.firestore(), COL_SESSIONS, token)).catch(() => undefined);
      } catch {
        /* offline */
      }
    }
    if (!window.location.pathname.endsWith('/login')) window.location.href = 'login';
  }
}
