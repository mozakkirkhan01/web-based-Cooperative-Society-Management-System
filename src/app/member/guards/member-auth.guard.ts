import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { LocalService } from '../../utils/local.service';

export const memberAuthGuard: CanActivateFn = () => {
  const localService = inject(LocalService);
  const router = inject(Router);

  if (localService.isMemberLoggedIn()) {
    return true;
  }

  localService.clearMemberSession();
  return router.createUrlTree(['/member/login']);
};

export const memberAuthChildGuard: CanActivateChildFn = (childRoute, state) => {
  return memberAuthGuard(childRoute, state);
};
