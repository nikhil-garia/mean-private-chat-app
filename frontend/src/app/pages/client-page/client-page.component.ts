import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientGoogleLoginComponent } from './google-login/google-login.component';

@Component({
  selector: 'app-client-page',
  templateUrl: './client-page.component.html',
  styleUrls: ['./client-page.component.scss'],
  imports: [CommonModule, FormsModule, ClientGoogleLoginComponent]
})
export class ClientPageComponent implements OnInit, OnDestroy {
  isSigninOpen = false;
  isSidebarOpen = false;
  isRegisterMode = false;
  isForgotPasswordMode = false;
  isSecretChatRoomOpen = false;
  
  loginObj: Login;
  regObj: Reg;
  secretChatRoomObj: SecretChatRoom;
  forgotPasswordEmail: string;
  authFailError: string;
  secretChatRoomError: string;
  isValid: boolean;
  loginLoading = false;
  registerLoading = false;
  forgotPasswordLoading = false;
  secretChatRoomLoading = false;
  
  private router = inject(Router);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.loginObj = new Login();
    this.regObj = new Reg();
    this.secretChatRoomObj = new SecretChatRoom();
    this.forgotPasswordEmail = '';
    this.authFailError = '';
    this.secretChatRoomError = '';
    this.isValid = false;
  }

  ngOnInit() {
    this.setupParallaxEffect();
    this.setupSigninButton();
    this.setupSidebar();
  }

  ngOnDestroy() {
    // Clean up any event listeners if needed
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.handleParallax(event);
  }

  private setupParallaxEffect() {
    // Initial setup for parallax elements
  }

  private handleParallax(event: MouseEvent) {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;

    const parallaxElements = document.querySelectorAll('.parallax');
    parallaxElements.forEach((element) => {
      const speed = element.getAttribute('data-speed');
      if (speed && element instanceof HTMLElement) {
        element.style.transform = `translate(${x * Number(speed) * 20}px, ${y * Number(speed) * 20}px)`;
      }
    });
  }

  private setupSigninButton() {
    // This will be handled by Angular's template binding
  }

  private setupSidebar() {
    // This will be handled by Angular's template binding
  }

  openSignin() {
    this.isSigninOpen = true;
    // Remove any close animation classes and add open animation
    setTimeout(() => {
      const signinPage = document.getElementById('signinPage');
      if (signinPage) {
        signinPage.classList.remove('closeSignin');
        signinPage.classList.add('openSignin');
      }
    }, 0);
  }

  closeSignin() {
    this.isSigninOpen = false;
    // Remove open animation and add close animation
    setTimeout(() => {
      const signinPage = document.getElementById('signinPage');
      if (signinPage) {
        signinPage.classList.remove('openSignin');
        signinPage.classList.add('closeSignin');
      }
    }, 0);
  }

  openSidebar() {
    this.isSidebarOpen = true;
    // Remove any close animation classes and add open animation
    setTimeout(() => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.remove('close-sidebar');
        sidebar.classList.add('open-sidebar');
      }
    }, 0);
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    // Remove open animation and add close animation
    setTimeout(() => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.remove('open-sidebar');
        sidebar.classList.add('close-sidebar');
      }
    }, 0);
  }

  // Toggle between login and register modes
  setAuthMode(isRegister: boolean) {
    this.isRegisterMode = isRegister;
    this.isForgotPasswordMode = false;
    this.authFailError = '';
  }

  // Method to switch to forgot password mode
  setForgotPasswordMode() {
    this.isForgotPasswordMode = true;
    this.isRegisterMode = false;
    this.authFailError = '';
  }

  // Method to open secret chat room modal
  openSecretChatRoom() {
    this.isSecretChatRoomOpen = true;
    // Remove any close animation classes and add open animation
    setTimeout(() => {
      const secretChatRoomPage = document.getElementById('secretChatRoomPage');
      if (secretChatRoomPage) {
        secretChatRoomPage.classList.remove('closeSignin');
        secretChatRoomPage.classList.add('openSignin');
      }
    }, 0);
  }

  // Method to close secret chat room modal
  closeSecretChatRoom() {
    this.isSecretChatRoomOpen = false;
    // Remove open animation and add close animation
    setTimeout(() => {
      const secretChatRoomPage = document.getElementById('secretChatRoomPage');
      if (secretChatRoomPage) {
        secretChatRoomPage.classList.remove('openSignin');
        secretChatRoomPage.classList.add('closeSignin');
      }
    }, 0);
  }

  // Method to handle secret chat room creation
  onCreateSecretRoom() {
    this.secretChatRoomLoading = true;
    this.secretChatRoomError = '';
    
    if (!this.secretChatRoomObj.name) {
      this.secretChatRoomError = 'Name Required';
      this.isValid = false;
    } else {
      this.isValid = true;
    }
    
    if (this.isValid) {
      // Here you would typically call a service to create the secret chat room
      // For now, we'll just show a success message
      this.snackBar.open(`Secret chat room "${this.secretChatRoomObj.name}" created successfully!`, '🎉', { duration: 5000 });
      
      // Reset the form and close the modal
      this.secretChatRoomObj.name = '';
      this.secretChatRoomLoading = false;
      this.closeSecretChatRoom();
      this.cdr.detectChanges();
    } else {
      this.secretChatRoomLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Method to handle signin form submission
  onSigninSubmit() {
    this.loginLoading = true;
    this.authFailError = '';
    
    if (!this.loginObj.email) {
      this.authFailError = 'Email Required';
      this.isValid = false;
    } else if (!this.loginObj.password) {
      this.authFailError = 'Password Required';
      this.isValid = false;
    } else {
      this.isValid = true;
    }
    
    if (this.isValid) {
      this.authService.login('/api/v1/login', this.loginObj).subscribe((res: any) => {
        if (res.tokenObject) {
          sessionStorage.setItem('isLoggedin', 'true');
          localStorage.setItem('auth_token', res.jwtToken);
          localStorage.setItem('user_id', res.tokenObject._id);
          this.socketService.onConnection(); // create a connection to socket
          this.snackBar.open('Login Successfully', '🎉', { duration: 5000 });
          this.router.navigateByUrl('/chat');
          this.cdr.detectChanges();
        } else {
          sessionStorage.setItem('isLoggedin', 'false');
          this.authFailError = res.message || 'Login failed';
          this.loginLoading = false;
          this.cdr.detectChanges();
        }
      }, error => {
        this.loginLoading = false;
        console.error('Login failed: ', error);
        this.snackBar.open('Login failed.. try again', 'close', { duration: 5000 });
        this.authFailError = error.error?.message || 'Login failed';
        this.cdr.detectChanges();
      });
    } else {
      this.loginLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Method to handle forgot password form submission
  onForgotPasswordSubmit() {
    this.forgotPasswordLoading = true;
    this.authFailError = '';
    
    if (!this.forgotPasswordEmail) {
      this.authFailError = 'Email Required';
      this.isValid = false;
    } else {
      this.isValid = true;
    }
    
    if (this.isValid) {
      this.authService.forgotPassword(this.forgotPasswordEmail).subscribe((res: any) => {
        if (res.status === 200) {
          this.snackBar.open('Password reset link sent to your email!', '🎉', { duration: 5000 });
          // Switch back to login mode after successful request
          this.isForgotPasswordMode = false;
          // Clear forgot password form
          this.forgotPasswordEmail = '';
          this.forgotPasswordLoading = false;
          this.cdr.detectChanges();
        } else {
          this.authFailError = res.message || 'Failed to send reset link';
          this.forgotPasswordLoading = false;
          this.cdr.detectChanges();
        }
      }, error => {
        this.forgotPasswordLoading = false;
        console.error('Forgot password failed: ', error);
        this.snackBar.open('Failed to send reset link.. try again', 'close', { duration: 5000 });
        this.authFailError = error.error?.message || 'Failed to send reset link';
        this.cdr.detectChanges();
      });
    } else {
      this.forgotPasswordLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Method to handle registration form submission
  onRegisterSubmit() {
    this.registerLoading = true;
    this.authFailError = '';
    
    if (!this.regObj.fullName) {
      this.authFailError = 'Full Name Required';
      this.isValid = false;
    } else if (!this.regObj.email) {
      this.authFailError = 'Email Required';
      this.isValid = false;
    } else if (!this.regObj.password) {
      this.authFailError = 'Password Required';
      this.isValid = false;
    } else {
      this.isValid = true;
    }
    
    if (this.isValid) {
      this.authService.register('/api/v1/register', this.regObj).subscribe((res: any) => {
        // Registration successful - automatically log the user in
        this.snackBar.open('Registration successful! Logging you in...', '🎉', { duration: 3000 });
        
        // Automatically log the user in with the newly created credentials
        const loginCredentials = {
          email: this.regObj.email,
          password: this.regObj.password
        };
        
        this.authService.login('/api/v1/login', loginCredentials).subscribe((loginRes: any) => {
          if (loginRes.tokenObject) {
            sessionStorage.setItem('isLoggedin', 'true');
            localStorage.setItem('auth_token', loginRes.jwtToken);
            localStorage.setItem('user_id', loginRes.tokenObject._id);
            this.socketService.onConnection(); // create a connection to socket
            this.snackBar.open('Login Successfully', '🎉', { duration: 5000 });
            this.router.navigateByUrl('/chat');
            this.cdr.detectChanges();
          } else {
            sessionStorage.setItem('isLoggedin', 'false');
            this.authFailError = loginRes.message || 'Auto-login failed';
            this.registerLoading = false;
            this.cdr.detectChanges();
          }
        }, loginError => {
          this.registerLoading = false;
          console.error('Auto-login failed: ', loginError);
          this.snackBar.open('Registration successful but auto-login failed. Please login manually.', 'close', { duration: 5000 });
          // Switch back to login mode
          this.isRegisterMode = false;
          this.cdr.detectChanges();
        });
        
      }, error => {
        this.registerLoading = false;
        console.error('Registration failed: ', error);
        this.snackBar.open('Registration failed.. try again', 'close', { duration: 5000 });
        this.authFailError = error.error?.message || 'Registration failed';
        this.cdr.detectChanges();
      });
    } else {
      this.registerLoading = false;
      this.cdr.detectChanges();
    }
  }
}

export class Login {
  email: string;
  password: string;
  
  constructor() {
    this.email = '';
    this.password = '';
  }
}

export class Reg {
  fullName: string;
  email: string;
  password: string;

  constructor() {
    this.fullName = '';
    this.email = '';
    this.password = '';
  }
}

export class SecretChatRoom {
  name: string;

  constructor() {
    this.name = '';
  }
}
