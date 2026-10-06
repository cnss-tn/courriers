import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

// CONTROLLER — façade auth pour les vues : les vues n'injectent jamais
// AuthService directement, elles passent par ici (navigation incluse).
// Login simple : matricule + mot de passe, sans vérification supplémentaire.
@Injectable({ providedIn: 'root' })
export class AuthController {
  private auth = inject(AuthService);
  private router = inject(Router);

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
      if (code === 'network_error' || code === 'firebase_api_key_missing')
        return 'لا يوجد اتصال بالإنترنت';
      return 'بيانات الدخول غير صحيحة';
    }
  }

  logout(): void {
    this.auth.logout();
  }
}
