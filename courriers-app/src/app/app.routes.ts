import { Routes } from '@angular/router';
import { authGuard } from './core/guards';
import { MainLayoutComponent } from './layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./views/auth/login/login.view').then((m) => m.LoginView),
  },
  {
    // Page principale : le registre des courriers (pas de page d'accueil intermédiaire)
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./views/courriers/courriers-list/courriers-list.view').then(
            (m) => m.CourriersListView,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
