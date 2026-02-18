import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login.component';
import { ManagerDashboardComponent } from './features/manager/manager-dashboard.component';
import { UserDashboardComponent } from './features/user/user-dashboard.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'manager',
    component: ManagerDashboardComponent,
    canActivate: [authGuard, roleGuard('MANAGER')]
  },
  {
    path: 'user',
    component: UserDashboardComponent,
    canActivate: [authGuard, roleGuard('USER')]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
