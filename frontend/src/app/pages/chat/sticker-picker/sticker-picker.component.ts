import { Component,EventEmitter, Output  } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-sticker-picker',
  imports: [NgFor],
  templateUrl: './sticker-picker.component.html',
  styleUrl: './sticker-picker.component.scss'
})
export class StickerPickerComponent {
  stickers = [
    { url: 'assets/stickers/cake.png' },
    { url: 'assets/stickers/happy-birthday.png' },
    { url: 'assets/stickers/man_expression1.png'},
    { url: 'assets/stickers/1.webp'},
    { url: 'assets/stickers/1.gif'},
    { url: 'assets/stickers/2.webp'}
    // Add more stickers here
  ];

  @Output() stickerSelected = new EventEmitter<string>();

  selectSticker(sticker: any) {
    this.stickerSelected.emit(sticker.url);
  }
}
