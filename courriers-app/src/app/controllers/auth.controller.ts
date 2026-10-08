import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

// CONTROLLER — façade auth pour les vues : les vues n'injectent jamais
// AuthService directement, elles passent par ici (navigation incluse).
// Login simple : matricule + mot de passe, sans vérification supplémentaire.
@Injectable({ providedIn: 'root' })
export class AuthController {
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Nom arabe de l'utilisateur connecté (affiché près du logout). */
  readonly arName = computed(() => (this.auth.currentUser()?.arName || '').trim());

  /** @returns message d'erreur (arabe) ou null si succès (navigation effectuée). */
  async login(matricule: string, pw: string): Promise<string | null> {
    if (!matricule.trim() || !pw) return 'يرجى إدخال رقم التسجيل وكلمة المرور';
    if (typeof navigator !== 'undefined' && navigator.onLine === false)
      return 'لا يوجد اتصال بالإنترنت';
    try {
      await this.auth.login(matricule, pw);
      await this.router.navigate(['/']);
      return null;
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : '';
      const fbCode = (e as { code?: unknown })?.code;
      const offlineNow = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (
        code === 'network_error' ||
        code === 'firebase_api_key_missing' ||
        offlineNow ||
        fbCode === 'unavailable' ||
        fbCode === 'deadline-exceeded' ||
        fbCode === 'auth/network-request-failed' ||
        /network|offline|failed to fetch|load failed|fetch dynamically|err_internet|err_network|timeout|timed out|abort/i.test(
          code,
        )
      )
        return 'لا يوجد اتصال بالإنترنت';
      if (fbCode === 'permission-denied' || /permission|PERMISSION_DENIED/.test(code))
        return 'مرفوض من قاعدة البيانات : règles Firestore non publiées';
      return 'بيانات الدخول غير صحيحة';
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
