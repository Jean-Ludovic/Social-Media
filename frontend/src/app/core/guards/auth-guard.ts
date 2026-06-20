import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (token) return true;

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
