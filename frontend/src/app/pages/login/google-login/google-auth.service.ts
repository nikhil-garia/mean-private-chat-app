import { inject, Injectable,ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { SocketService } from '../../../services/socket.service';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
declare const google: any;


@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private clientId = environment.clientId; // Replace with your actual client ID

  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  // private cdr = inject(ChangeDetectorRef);
  private router=inject(Router);
  initialize(): void {
    window.onload = () => {
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this)
      });

      google.accounts.id.renderButton(
        document.getElementById("google-button"),
        { theme: "outline", size: "large", text: "continue_with" } // customize as needed
      );
      
      google.accounts.id.prompt(); // optional auto prompt
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
              // this.snackBar.open('Login Successfully','🎉', {duration: 5000});
              this.router.navigateByUrl('/chat');
              // this.cdr.detectChanges();
            }else{
              sessionStorage.setItem('isLoggedin', 'false');
              alert(res.message)
            }
          },
          error: (error:any) => {
            // console.log(error);
            if (error.status == 403) {
              console.error(error);
              // this.onLogout(1);
            }
          },
        });
    // fetch('http://localhost:8080/auth/google', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ token })
    // })
    //   .then(res => res.json())
    //   .then(data => {
    //     console.log("Backend response:", data);
    //     // e.g., store JWT, redirect, show success, etc.
    //   })
    //   .catch(err => console.error("Login failed", err));
  }
}
