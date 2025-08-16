import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

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
export class LocationService {
  serverPath: string;

  constructor(private http: HttpClient) {
    this.serverPath=environment.apiUrl;
  }

  // Function to get a tile from the server proxy
  getTile(z: number, x: number, y: number) {
    return this.http.get(this.serverPath+`/api/v1/tiles/${z}/${x}/${y}`,httpOptions);
    // return this.http.get(this.serverPath+`/api/v1/tiles/${z}/${x}/${y}`, { responseType: 'blob' });
  }
}
