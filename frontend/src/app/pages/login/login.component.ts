import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ColorSchemeService } from '../../services/color-scheme.service';
import { GoogleLoginComponent } from "./google-login/google-login.component";
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterModule, MatProgressSpinnerModule, GoogleLoginComponent, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})


export class LoginComponent implements OnInit  {
  loginObj:Login;
  authFailError:string;
  isValid: boolean;
  loginLoading=false;
  private colorSchemeService = inject(ColorSchemeService);

  constructor(private router:Router,private authService: AuthService, private socketService:SocketService,private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef){
    this.loginObj=new Login();
    this.authFailError='';
    this.isValid=false;
    // Load Color Scheme base on user login or not
    if(!sessionStorage.getItem('isLoggedin')){
      this.colorSchemeService.load_unauth();
    }
  }
  ngOnInit(): void {
    const isLoggedIn = !!localStorage.getItem('auth_token');
    if (isLoggedIn) {
      this.router.navigate(['/chat']);
    }
  }


  onLogin(){
    this.loginLoading=true;
    if (!this.loginObj.email) {
      this.authFailError='Email Required';
      this.isValid=false;
    } else if (!this.loginObj.password) {
      this.authFailError='Password Required';
      this.isValid=false;
    }else{this.isValid=true; }
    if (this.isValid) {
      // debugger;
      this.authService.login('/api/v1/login',this.loginObj).subscribe((res:any) => {
          // this.loginLoading=false;
          if (res.tokenObject) {
            sessionStorage.setItem('isLoggedin', 'true');
            localStorage.setItem('auth_token', res.jwtToken);
            localStorage.setItem('user_id', res.tokenObject._id);
            this.socketService.onConnection(); //create a connection to socket
            this.snackBar.open('Login Successfully','🎉', {duration: 5000});
            this.router.navigateByUrl('/chat');
            this.cdr.detectChanges();
          }else{
            sessionStorage.setItem('isLoggedin', 'false');
            alert(res.message)
          }
      }, error => {
        this.loginLoading=false;
        console.error('Login failed: ', error);
        this.snackBar.open('Login failed.. try again','close', {duration: 5000});
        // Handle login error, show error message, etc.
        this.authFailError=error.error.message;
        this.cdr.detectChanges();
      });
    }else{
      this.loginLoading=false;
      this.cdr.detectChanges();
    }
  }
}

export class Login{
  email:string;
  password: string;
  constructor(){
    this.email='';
    this.password='';
  }
}


