import { Routes } from '@angular/router';
import { HomeComponent } from "./home/home.component";
import { authGuard } from "./guards/auth.guard";
import { expenseTrackerGuard } from "./guards/expense-tracker.guard";

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./sign-up/sign-up.component').then(m => m.SignUpComponent),
    canMatch: [authGuard],
    data: { redirectLoggedInTo: '/expense-tracker', requiresLoggedOut: true }
  },
  {
    path: 'sign-in',
    loadComponent: () => import('./sign-in/sign-in.component').then(m => m.SignInComponent),
    canMatch: [authGuard],
    data: { redirectLoggedInTo: '/expense-tracker', requiresLoggedOut: true }
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    canMatch: [authGuard],
    data: { redirectLoggedInTo: '/expense-tracker', requiresLoggedOut: true }
  },
  {
    path: 'documents',
    loadComponent: () => import('./documents/documents.component').then(m => m.DocumentsComponent),
    canMatch: [authGuard],
    data: { redirectUnauthorizedTo: '/sign-in' }
  },
  {
    path: 'expense-tracker/:id',
    loadComponent: () => import('./expense-tracker/expense-tracker.component').then(m => m.ExpenseTrackerComponent),
    canMatch: [authGuard, expenseTrackerGuard],
    data: { redirectUnauthorizedTo: '/sign-in', redirectNotFoundTo: '/documents' }
  },
  {
    path: 'tos',
    loadComponent: () => import('./tos/tos.component').then(m => m.TosComponent)
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'donate',
    loadComponent: () => import('./donate/donate.component').then(m => m.DonateComponent)
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
