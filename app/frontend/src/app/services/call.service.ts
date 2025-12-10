import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpProgressEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Call } from '../pages/chat/model/call_model';

const httpOptions = {
  headers: new HttpHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
  }),
  observe: 'response' as 'body',
  withCredentials: true
};
@Injectable({
  providedIn: 'root'
})
export class CallService {
  serverPath: string;

  constructor(private http: HttpClient) {
    this.serverPath = environment.apiUrl;
  }
  getCall_list(Url: string): Observable<Call[]> {
    return this.http.get(this.serverPath + Url, httpOptions).pipe(map(calls => calls as Call[]));
  }
  
  getCallDetails(callId: string): Observable<any> {
    return this.http.get(this.serverPath + `/api/v1/call/${callId}`, httpOptions).pipe(map(response => response));
  }
  // getZegoToken(Url: string): Observable<HttpResponse<any>> {
  //   return this.http.get<any>(this.serverPath + Url, httpOptions).pipe(map(user => {
  //     return user;
  //   }));
  // }
}