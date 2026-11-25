import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LocalService } from '../../utils/local.service';

export const memberGuestGuard: CanActivateFn = () => {
  const localService = inject(LocalService);
  const router = inject(Router);

  if (localService.isMemberLoggedIn()) {
    return router.createUrlTree(['/member/dashboard']);
  }

  return true;
};
