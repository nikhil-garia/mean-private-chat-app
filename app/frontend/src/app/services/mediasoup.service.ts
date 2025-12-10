import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

const httpOptions = {
  headers: new HttpHeaders({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS,POST,PUT",
    "Access-Control-Allow-Headers": "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers",
  }),
  withCredentials: true
};

@Injectable({ providedIn: 'root' })
export class MediasoupService {
  private apiUrl = environment.apiUrl + '/api/v1/mediasoup';

  constructor(private http: HttpClient) {
    console.log('MediasoupService API URL:', this.apiUrl);
  }

  getRouterRtpCapabilities(roomId: string) {
    return this.http.get(`${this.apiUrl}/router-rtp-capabilities/${roomId}`,httpOptions);
  }

  createTransport(roomId: string, direction: 'send' | 'recv') {
    return this.http.post(`${this.apiUrl}/create-transport`, { roomId, direction },httpOptions);
  }

  connectTransport(roomId: string, transportId: string, dtlsParameters: any) {
    return this.http.post(`${this.apiUrl}/connect-transport`, { roomId, transportId, dtlsParameters },httpOptions);
  }

  createProducer(roomId: string, transportId: string, kind: string, rtpParameters: any, userId: string) {
    return this.http.post(`${this.apiUrl}/create-producer`, { roomId, transportId, kind, rtpParameters, userId },httpOptions);
  }

  createConsumer(roomId: string, transportId: string, producerId: string, rtpCapabilities: any, userId: string) {
    return this.http.post(`${this.apiUrl}/create-consumer`, { roomId, transportId, producerId, rtpCapabilities, userId },httpOptions);
  }

  pauseProducer(roomId: string, producerId: string) {
    return this.http.post(`${this.apiUrl}/pause-producer`, { roomId, producerId },httpOptions);
  }

  resumeProducer(roomId: string, producerId: string) {
    return this.http.post(`${this.apiUrl}/resume-producer`, { roomId, producerId },httpOptions);
  }

  closeProducer(roomId: string, producerId: string) {
    return this.http.post(`${this.apiUrl}/close-producer`, { roomId, producerId },httpOptions);
  }

  closeTransport(roomId: string, transportId: string) {
    return this.http.post(`${this.apiUrl}/close-transport`, { roomId, transportId },httpOptions);
  }

  getRoomProducers(roomId: string) {
    return this.http.get(`${this.apiUrl}/room-producers/${roomId}`);
  }

  leaveRoom(roomId: string, userId: string) {
    return this.http.post(`${this.apiUrl}/leave-room`, { roomId, userId },httpOptions);
  }

  getRoomStats(roomId: string) {
    return this.http.get(`${this.apiUrl}/room-stats/${roomId}`,httpOptions);
  }

  getActiveRooms() {
    return this.http.get(`${this.apiUrl}/active-rooms`,httpOptions);
  }
} 