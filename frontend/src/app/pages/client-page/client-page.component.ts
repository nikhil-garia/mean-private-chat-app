import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-client-page',
  templateUrl: './client-page.component.html',
  styleUrls: ['./client-page.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ClientPageComponent implements OnInit, OnDestroy {
  isSigninOpen = false;
  isSidebarOpen = false;
  
  loginObj: Login;
  authFailError: string;
  isValid: boolean;
  loginLoading = false;
  
  private router = inject(Router);
  private authService = inject(AuthService);
  private socketService = inject(SocketService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    this.loginObj = new Login();
    this.authFailError = '';
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
}

export class Login {
  email: string;
  password: string;
  
  constructor() {
    this.email = '';
    this.password = '';
  }
}
