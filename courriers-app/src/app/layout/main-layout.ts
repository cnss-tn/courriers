import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthController } from '../controllers/auth.controller';
import { BackgroundComponent } from '../shared/components/background/background';
import { FooterComponent } from '../shared/components/footer/footer';
import { MyAccountView } from '../views/account/my-account.view';

/** Layout une seule page : logo + nom (bascule registre/mon-compte) + logout fixes, contenu, crédit. */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, BackgroundComponent, FooterComponent, MyAccountView],
  template: `
    <app-background></app-background>
    <img src="images/cnss_logo.svg" alt="CNSS" class="page-logo" width="34" height="34" />
    <button type="button" class="page-logout" (click)="logout()" title="خروج">
      <img src="images/off_icon.svg" alt="خروج" width="24" height="24" />
    </button>
    @if (auth.arName()) {
      <button type="button" class="page-user" [class.page-user-plain]="showAccount()" (click)="showAccount.set(true)" title="حساب المستعمل">{{ auth.arName() }}</button>
    }
    @if (showAccount()) {
      <button type="button" class="page-home" (click)="showAccount.set(false)" title="الصفحة الرئيسية" aria-label="الصفحة الرئيسية">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></svg>
      </button>
    }
    <main class="container-fluid composed-main" dir="rtl">
      @if (showAccount()) {
        <app-my-account></app-my-account>
      } @else {
        <router-outlet></router-outlet>
      }
    </main>
    <app-footer></app-footer>
  `,
})
export class MainLayoutComponent {
  protected auth = inject(AuthController);
  protected readonly showAccount = signal(false);

  logout(): void {
    this.auth.logout();
  }
}
