import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import { SocketService } from './socket.service';
import { environment } from '../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

const httpOptions = {
  headers: new HttpHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
  }),
  withCredentials: true
};
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  serverPath: string;

  constructor(private router: Router,private socketService: SocketService,private http:HttpClient,private snackBar: MatSnackBar) {
    this.serverPath=environment.apiUrl;
  }
  login(loginUrl:string, body:any): Observable<any> {
    return this.http.post<any>(this.serverPath+loginUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  POST(url:string, body:any): Observable<HttpResponse<any>> {
    return this.http.post<any>(this.serverPath+url, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }
  logout(url:string,unhadleError:number | undefined=undefined) {
    // return this.http.post<any>(this.serverPath+url, httpOptions).pipe(user => {
      sessionStorage.removeItem('isLoggedin');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      this.socketService.disconnect();
      this.router.navigateByUrl('/client-page');
      if(unhadleError){
        this.snackBar.open('Sorry, Something went wrong..', 'close', {duration: 3000});
      }else{
        this.snackBar.open('Logout successfully..', 'close', {duration: 3000});
      }
    //   return user;
    // });
  }
  register(signupUrl:string, body:any): Observable<any> {
    return this.http.post<any>(this.serverPath+signupUrl, body, httpOptions).pipe(map(user => {
      return user;
    }));
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(this.serverPath + '/api/v1/forgot-password', { email }, httpOptions).pipe(
      map(response => {
        return response;
      })
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post<any>(this.serverPath + '/api/v1/reset-password', { 
      token, 
      newPassword 
    }, httpOptions).pipe(
      map(response => {
        return response;
      })
    );
  }
}
