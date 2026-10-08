import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthController } from '../controllers/auth.controller';
import { BackgroundComponent } from '../shared/components/background/background';
import { FooterComponent } from '../shared/components/footer/footer';

/** Layout principal : logo + logout en positions fixes, contenu, crédit. */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, BackgroundComponent, FooterComponent],
  template: `
    <app-background></app-background>
    <img src="images/cnss_logo.svg" alt="CNSS" class="page-logo" width="34" height="34" />
    <button type="button" class="page-logout" (click)="logout()" title="خروج">
      <img src="images/off_icon.svg" alt="خروج" width="24" height="24" />
    </button>
    @if (auth.arName()) {
      <span class="page-user">{{ auth.arName() }}</span>
    }
    <main class="container-fluid composed-main" dir="rtl">
      <router-outlet></router-outlet>
    </main>
    <app-footer></app-footer>
  `,
})
export class MainLayoutComponent {
  protected auth = inject(AuthController);

  logout(): void {
    this.auth.logout();
  }
}
