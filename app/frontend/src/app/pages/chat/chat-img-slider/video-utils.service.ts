// src/app/services/video-utils.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VideoUtilsService {
  capturePoster(videoUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.preload = 'auto';

      video.addEventListener('loadeddata', () => {
        video.currentTime = 1;
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg');
        resolve(dataUrl);
      });

      video.addEventListener('error', (err) => {
        reject(err);
      });
    });
  }
}
