import { Injectable, signal } from '@angular/core';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { passwordMatches } from './crypto';
import { FirebaseService } from './firebase.service';
import { computeSessionExpiry } from './session-policy';
import { AppUser } from '../models/user.model';

const LS_KEY = 'currentUser';
const COL_USERS = 'users';
const COL_SESSIONS = 'sessions';

/** Doc sessions : id `matricule-frName` (ex. 16359-Zakraoui Ahmed). */
function sessionDocId(matricule: string, frName: string): string {
  const safe = (s: string) => String(s || '').trim().replace(/\//g, '-');
  return `${safe(matricule)}-${safe(frName)}`;
}

/** ms depuis un Firestore Timestamp, un number, ou NaN. */
function toMillis(v: unknown): number {
  if (v != null && typeof (v as { toMillis?: unknown }).toMillis === 'function') {
    try {
      return Number((v as { toMillis: () => number }).toMillis());
    } catch {
      return NaN;
    }
  }
  return Number(v);
}

/**
 * Authentification simple SANS code OTP et sans changement forcé :
 * matricule + mot de passe -> doc session Firestore -> currentUser en localStorage.
 * Hash sha256, session 7h00-19h00 + auto-logout + watchdog.
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
    // Fermeture d'onglet : tentative best-effort (le navigateur peut l'annuler).
    window.addEventListener('pagehide', () => {
      const u = this._user();
      if (u?.token) void this.deleteServerSessionAsync(u).catch(() => undefined);
    });
    // Nettoie les sessions expirées restantes (ex. onglet fermé sans logout).
    void this.purgeExpiredSessions();
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

  isSessionExpired(): boolean {
    const u = this._user();
    if (!u || !u.token) return false; // pas de session (page login) -> pas « expirée »
    const exp = toMillis(u.sessionExpiresAt);
    if (!Number.isFinite(exp)) return true; // session legacy sans expiry -> reconnexion
    return Date.now() >= exp;
  }

  private armTimer(): void {
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    const u = this._user();
    if (!u?.token) return;
    const exp = toMillis(u.sessionExpiresAt);
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
      else this.dropExpiredSession();
      return true;
    }
    this.armTimer();
    return false;
  }

  /** Supprime le doc session expiré côté serveur puis oublie la session locale. */
  private dropExpiredSession(): void {
    const u = this._user();
    void this.deleteServerSessionAsync(u).catch(() => undefined);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* noop */
    }
    this._user.set(null);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    void this.purgeExpiredSessions();
  }

  /**
   * Supprime les docs sessions expirés (ou legacy sans expiresAt).
   * Best-effort : appelé au démarrage et après chaque login.
   */
  private async purgeExpiredSessions(): Promise<void> {
    try {
      const db = this.fb.firestore();
      const snap = await getDocs(query(collection(db, COL_SESSIONS), limit(500)));
      const now = Date.now();
      const dead = snap.docs.filter((d) => {
        const exp = toMillis(d.data()['expiresAt']);
        return !Number.isFinite(exp) || exp <= now;
      });
      await Promise.all(dead.map((d) => deleteDoc(d.ref).catch(() => undefined)));
    } catch {
      /* best-effort */
    }
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

  /**
   * Sonde réseau réelle (navigateur + internet) : échoue -> network_error.
   * Utilise le point de contrôle standard generate_204, sans CORS, timeout court.
   */
  private async ensureOnline(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false)
      throw new Error('network_error');
    if (typeof fetch === 'undefined') return;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 3500) : null;
    try {
      await fetch(`https://www.gstatic.com/generate_204?t=${Date.now()}`, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: ctrl?.signal,
      });
    } catch {
      throw new Error('network_error');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async login(matricule: string, pw: string): Promise<AppUser> {
    const mat = String(matricule || '').trim();
    if (!mat || !pw) throw new Error('missing_credentials');
    // Vérification ACTIVE du réseau AVANT toute requête (navigator.onLine
    // seul ne suffit pas : câble débranché, wifi sans internet...).
    await this.ensureOnline();

    let found;
    try {
      found = await this.findUserDoc(mat);
    } catch (e) {
      // Échec de la requête elle-même : hors-ligne (ou règles). Ne jamais
      // le déguiser en identifiants incorrects si on est offline.
      if (typeof navigator !== 'undefined' && navigator.onLine === false)
        throw new Error('network_error');
      throw e;
    }
    if (!found) throw new Error('invalid_credentials');
    const d = found.data;
    const storedPw = String(d['Pw'] ?? d['pw'] ?? d['password'] ?? '');
    if (!(await passwordMatches(mat, pw, storedPw))) throw new Error('invalid_credentials');

    const user: AppUser = {
      id: found.id,
      matricule: String(d['Matricule'] ?? mat),
      frName: String(d['FR_Name'] ?? ''),
      arName: String(d['AR_Name'] ?? ''),
    };

    // Une seule session live par user : supprime tout doc résiduel de ce
    // matricule (quel que soit son id), puis crée le doc frais.
    // Garantit : table sessions = uniquement les connectés.
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
    const startedAt = Date.now();
    const expiresAt = computeSessionExpiry(startedAt);
    await setDoc(doc(db, COL_SESSIONS, sessionDocId(user.matricule, user.frName)), {
      matricule: mat,
      createdAt: Timestamp.fromMillis(startedAt),
      expiresAt: Timestamp.fromMillis(expiresAt),
    });

    const full: AppUser = {
      ...user,
      token,
      sessionStartedAt: startedAt,
      sessionExpiresAt: expiresAt,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(full));
    this._user.set(full);
    this.armTimer();
    void this.purgeExpiredSessions();
    return full;
  }

  logout(): void {
    const u = this._user();
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* noop */
    }
    this._user.set(null);
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    const cleanup = (async () => {
      await this.deleteServerSessionAsync(u);
      await this.purgeExpiredSessions();
    })().catch(() => undefined);
    const go = () => {
      if (!window.location.pathname.endsWith('/login')) window.location.href = 'login';
    };
    // Attendre la suppression serveur (max 2,5 s) AVANT de naviguer :
    // la navigation annule les requêtes Firestore encore en cours.
    void Promise.race([cleanup, new Promise((r) => setTimeout(r, 2500))]).then(go, go);
  }

  /** Supprime le doc session (id actuel `matricule-frName` + legacy par token). Ne jette jamais. */
  private async deleteServerSessionAsync(u: AppUser | null): Promise<void> {
    try {
      const ids = new Set<string>();
      if (u?.matricule && u?.frName) ids.add(sessionDocId(u.matricule, u.frName));
      if (u?.token) ids.add(String(u.token));
      if (!ids.size) return;
      const db = this.fb.firestore();
      await Promise.all(
        [...ids].map((id) => deleteDoc(doc(db, COL_SESSIONS, id)).catch(() => undefined)),
      );
    } catch {
      /* offline */
    }
  }
}
