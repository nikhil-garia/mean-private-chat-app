import { Component } from '@angular/core';
// import { HttpClient, HttpClientModule, HttpHeaders, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  imports: [FormsModule,RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  // providers: [provideHttpClient(withInterceptorsFromDi())] 
})
export class RegisterComponent {
  regObj:Reg;

  constructor(private http: HttpClient,private router:Router,private authService: AuthService,private snackBar: MatSnackBar){
    this.regObj=new Reg();
  }

  onReg(){
    this.authService.login('/api/v1/register',this.regObj).subscribe((res:any) => {
      // if (res.tokenObject) {
        if (res.status==200) {
          // console.log(res);
          // alert('Register successfully..');
          this.snackBar.open('Register successfully..', 'Close', {
            duration: 3000
          });
          this.router.navigateByUrl('/login');
        }else{
          this.snackBar.open(res.message, 'Close', {
            duration: 3000
          })
        }
      // }else{
      //   sessionStorage.setItem('isLoggedin', 'false');
      //   alert(res.message)
      // }
    }, error => {
      console.error('Reg failed: ', error);
      // Handle Reg error, show error message, etc.
    });
  }

}
export class Reg{
  fullName:string;
  email:string;
  password: string;
  constructor(){
    this.fullName='';
    this.email='';
    this.password='';
  }
}
