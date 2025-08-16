import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const loginGuard: CanActivateFn = (route, state) => {
  const _router = inject(Router);
  // let isLoggedin=  sessionStorage.getItem('isLoggedin');
  const isLoggedIn = !!localStorage.getItem('auth_token'); // Example check using a token in localStorage
  // console.log('login_guard isLoggedIn='+isLoggedIn);
  
  if (isLoggedIn) {
    _router.navigate(['chat']);
    return false;
  } else {
    return true;
  }
};
