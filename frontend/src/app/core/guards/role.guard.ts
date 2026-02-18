import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export function roleGuard(role: 'MANAGER' | 'USER'): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Evita que un usuario autenticado entre al dashboard de otro rol.
    if (authService.hasRole(role)) {
      return true;
    }

    return router.createUrlTree(['/login']);
  };
}
