import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { SocketService } from '../../../services/socket.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class ClientGoogleAuthService {
  private clientId = environment.clientId; // Replace with your actual client ID

  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private router = inject(Router);

  initialize(): void {
    // Check if Google script is loaded and available
    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
      console.warn('Google Sign-In script not loaded yet. Retrying in 100ms...');
      // Retry after a short delay to allow script to load
      setTimeout(() => this.initialize(), 100);
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this)
      });

      // Check if the button element exists
      const buttonElement = document.getElementById("client-google-button");
      if (buttonElement) {
        google.accounts.id.renderButton(
          buttonElement,
          { theme: "outline", size: "large", text: "continue_with" } // customize as needed
        );
        
        // Optional: prompt for one-tap sign-in
        google.accounts.id.prompt();
      } else {
        console.warn('Google Sign-In button element not found');
      }
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
    }
  }

  handleCredentialResponse(response: any): void {
    const token = response.credential;
    console.log("JWT Token:", token);
    // Send token to backend for verification or decode as needed
    // Send token to your backend
      this.authService.POST('/api/v1/auth/google',{ token:token })
        .subscribe({
          next: (res: any) => {
            console.log(res);
            if (res.tokenObject) {
              sessionStorage.setItem('isLoggedin', 'true');
              localStorage.setItem('auth_token', res.jwtToken);
              localStorage.setItem('user_id', res.tokenObject._id);
              this.socketService.onConnection(); //create a connection to socket
              this.router.navigateByUrl('/chat');
            }else{
              sessionStorage.setItem('isLoggedin', 'false');
              alert(res.message)
            }
          },
          error: (error:any) => {
            if (error.status == 403) {
              console.error(error);
            }
          },
        });
  }
}
