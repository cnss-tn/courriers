import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthController } from '../../controllers/auth.controller';
import { LoaderComponent } from '../../shared/components/loader/loader';

// VIEW — حساب المستعمل : infos personnelles + changement de mot de passe
// (même contenu/fonctionnement que campagnes, styles de courriers-app).
// Ne persiste jamais rien : c'est AuthController qui change le mot de passe.
@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [FormsModule, LoaderComponent],
  templateUrl: './my-account.view.html',
  styleUrl: './my-account.view.css',
})
export class MyAccountView {
  protected auth = inject(AuthController);

  oldPw = '';
  newPw = '';
  newPw2 = '';
  alert = signal('');

  /** Nom français affiché capitalisé (les docs stockent souvent du MAJUSCULE). */
  frName(): string {
    const v = (this.auth.user()?.frName || '').trim().toLowerCase();
    if (!v) return '--';
    return v.replace(/(^|[\s\-'’])(\S)/g, (_m: string, sep: string, ch: string) => sep + ch.toUpperCase());
  }  alertOk = signal(false);
  saving = signal(false);
  /** Succès : masque le formulaire (comme campagnes), seul le message reste. */
  changed = signal(false);

  async submit(): Promise<void> {
    this.alert.set('');
    this.alertOk.set(false);
    this.saving.set(true);
    try {
      const err = await this.auth.changePassword(this.oldPw, this.newPw, this.newPw2);
      if (err) {
        this.alert.set(err);
        return;
      }
      this.oldPw = '';
      this.newPw = '';
      this.newPw2 = '';
      this.alert.set('تم تغيير كلمة المرور بنجاح');
      this.alertOk.set(true);
      this.changed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
