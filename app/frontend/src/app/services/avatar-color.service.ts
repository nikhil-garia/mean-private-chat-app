import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AvatarColorService {
private colorMap: { [userId: string]: string } = {};

  // Optionally initialize from localStorage
  constructor() {
    const stored = localStorage.getItem('avatarColorMap');
    if (stored) {
      this.colorMap = JSON.parse(stored);
    }
  }

  getColorForUser(userId: string): string {
    // If no color yet, generate and save it
    if (!this.colorMap[userId]) {
      this.colorMap[userId] = this.randomColor();
      localStorage.setItem('avatarColorMap', JSON.stringify(this.colorMap));
    }
    return this.colorMap[userId];
  }

  private randomColor(): string {
    // e.g. random hex color
    const hex = Math.floor(Math.random() * 16777215).toString(16);
    return '#' + hex.padStart(6, '0');
  }
}
