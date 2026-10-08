import { AfterViewInit, Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthController } from '../../../controllers/auth.controller';
import { BackgroundComponent } from '../../../shared/components/background/background';
import { FooterComponent } from '../../../shared/components/footer/footer';

// VIEW — connexion : saisie locale + appel AuthController (qui navigue).
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, BackgroundComponent, FooterComponent],
  templateUrl: './login.view.html',
  styleUrl: './login.view.css',
})
export class LoginView implements AfterViewInit {
  private auth = inject(AuthController);

  matricule = '';
  pw = '';
  error = signal('');
  loading = signal(false);

  @ViewChild('matriculeInput') matriculeInput?: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void {
    // Curseur automatique sur رقم التسجيل à l'ouverture/refresh.
    setTimeout(() => this.matriculeInput?.nativeElement.focus(), 0);
    // Message immédiat si on ouvre la page sans réseau.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.error.set('لا يوجد اتصال بالإنترنت');
    }
  }

  /** Pas de réseau en cours d'utilisation -> message immédiat. */
  @HostListener('window:offline')
  onOffline(): void {
    this.error.set('لا يوجد اتصال بالإنترنت');
  }

  /** Retour du réseau -> efface le message no-net (pas les autres erreurs). */
  @HostListener('window:online')
  onOnline(): void {
    if (this.error() === 'لا يوجد اتصال بالإنترنت') this.error.set('');
  }

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
