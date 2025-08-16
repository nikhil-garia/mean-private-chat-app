import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const _router = inject(Router);
  // let isLoggedin=  sessionStorage.getItem('isLoggedin');
  const isLoggedin = !!localStorage.getItem('auth_token'); // Example check using a token in localStorage
  // console.log('isLoggedin='+isLoggedin);
  
  if(isLoggedin){
    return true;
  }else{
    _router.navigate(['login']);
    return false;
  }
};