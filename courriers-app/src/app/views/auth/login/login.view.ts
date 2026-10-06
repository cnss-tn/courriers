import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthController } from '../../../controllers/auth.controller';
import { BackgroundComponent } from '../../../shared/components/background/background';

// VIEW — connexion : saisie locale + appel AuthController (qui navigue).
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, BackgroundComponent],
  templateUrl: './login.view.html',
  styleUrl: './login.view.css',
})
export class LoginView {
  private auth = inject(AuthController);

  matricule = '';
  pw = '';
  error = signal('');
  loading = signal(false);

  async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      const err = await this.auth.login(this.matricule, this.pw);
      if (err) this.error.set(err);
    } finally {
      this.loading.set(false);
    }
  }
}
