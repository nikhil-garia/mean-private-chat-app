import { HttpErrorResponse,HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authToken = localStorage.getItem('auth_token');

  // Clone the request and add the authorization header
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  // Pass the cloned request with the updated header to the next handler
  return next(authReq).pipe(
    catchError((err: any) => {
      if (err instanceof HttpErrorResponse) {
        // Handle HTTP errors
        if (err.status === 401) {
          // Specific handling for unauthorized errors         
          console.error('Unauthorized request:', err);
          // You might trigger a re-authentication flow or redirect the user here
        } else {
          // Handle other HTTP error codes
          console.error('HTTP error:', err);
        }
      } else {
        // Handle non-HTTP errors (like network errors, invalid URLs, etc.)
        console.error('Non-HTTP error occurred:', err);
        
        // Check for specific error types
        if (err instanceof TypeError && err.message.includes('Invalid URL')) {
          console.error('Invalid URL detected:', err.message);
          // You might want to handle invalid URLs specifically
        } else if (err instanceof SyntaxError) {
          console.error('Syntax error detected:', err.message);
          // Handle syntax errors
        }
      }

      // Re-throw the error to propagate it further
      return throwError(() => err); 
    })
  );;
  // return next(req);
};
