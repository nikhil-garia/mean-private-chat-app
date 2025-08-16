import { Injectable } from '@angular/core';
import io from "socket.io-client";
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService { 
  private socket: any;
  public mySockeid:any;
  public myUserid:any;

  public on(eventName: string, callback: Function) {
    this.socket.on(eventName, callback);
  }

  public off(eventName: string, callback?: Function) {
    if (callback) {
      this.socket.off(eventName, callback);
    } else {
      this.socket.off(eventName);
    }
  }

  public emit(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
  public emit_callback(eventName: string, data: any, callback: (success: boolean) => void): void {
    // Emit a message and provide a callback
    this.socket.emit(eventName, data, (booleanArg: any) => {
      // Handle the callback response (e.g., do something with booleanArg)
      callback(booleanArg);
    });
  }
 
  public onConnection() {
    this.socket = io(environment.apiUrl, {
      forceNew: true,
      auth: { token: localStorage.getItem('auth_token') },
      withCredentials: true,
      query: {user_id:localStorage.getItem('user_id')},
    });
    
    this.socket.on('connect', () => {
      this.mySockeid=this.socket.id;
      this.myUserid=localStorage.getItem('user_id');
      let data = {'userid':localStorage.getItem('user_id'),'socket_id':this.socket.id};
      ;
      // After logging in, emit the 'userLoggedIn' event with the user's ID
      this.socket.emit('addSocket', data);
    });
  }
  public getSocketId(){
    return this.mySockeid;
  }
  public disconnect() {
    if (this.socket) {
      // console.log('Disconnected from server1');
      this.socket.disconnect();
    }
  }
  // Listen for profile photo updates
  public onProfilePhotoUpdate(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('profilePhotoUpdated', (data: any) => {
        observer.next(data);
      });
    });
  }

  // for video call
  joinRoom(room: string) {
    this.socket.emit('join-room', room);
  }

  sendSignal(data: any) {
    this.socket.emit('signal', data);
  }

  onSignal(callback: (data: any) => void) {
    this.socket.on('signal', callback);
  }

  oniceCandidate(callback: (data: any) => void) {
    this.socket.on('ice-candidate', callback);
  }
  onAnswer(callback: (data: any) => void) {
    this.socket.on('answer', callback);
  }
  onOffer(callback: (data: any) => void) {
    this.socket.on('incomingOffer', callback);
  }
  // Listen for the user_busy_notification event
  // onUserBusyNotification(): Observable<any> {
  //   return new Observable((observer) => {
  //     this.socket.on('user_busy_notification', (data:any) => {
  //       observer.next(data);
  //     });
  //   });
  // }
  onUserAvailable(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('user_available', (data:any) => {
        observer.next(data);
      });
    });
  }
  // Method to emit the emit_callback2 event with a callback
  emit_callback2(eventName: string,data: any): Observable<any> {
    return new Observable((observer) => {
      // Emit the start call event to the server
      this.socket.emit(eventName, data, (response: any) => {
        // Notify observer with the response from the server
        observer.next(response);
        observer.complete();
      });
    });
  }
}
