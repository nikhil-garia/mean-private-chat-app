import { NgClass, NgFor,NgOptimizedImage } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { SortByDatePipe } from "../pipe/sort-by-date.pipe";
import { SearchConvPipe } from "../pipe/search-conv.pipe";
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { CustomSlice } from "../../../custom.slice.pipe";
import { TypingDotsComponent } from "../typing-dots/typing-dots.component";
import { TimeAgoConvPipe } from "../pipe/time-ago-conv.pipe";
import { ChatService } from '../../../services/chat.service';
import { ConversationFilterPipe } from "./pipe/conversation-filter.pipe";
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// import { animate, query, stagger, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-conversation-list',
  imports: [NgClass, NgFor, SortByDatePipe, SearchConvPipe, NgOptimizedImage, FirstCharsPipe, CustomSlice, TypingDotsComponent, TimeAgoConvPipe, ConversationFilterPipe,MatRippleModule,SafeImageUrlPipe],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
  // animations: [
  //   trigger('flyInOut', [
  //     state('in', style({ transform: 'translateX(0)' })),
  //     transition('void => *', [style({ transform: 'translateX(-100%)' }), animate(100)]),
  //     transition('* => void', [animate(100, style({ transform: 'translateX(100%)' }))]),
  //   ]),
  //   trigger('fadeIn', [
  //     transition(':enter', [
  //       style({ opacity: 0 }),
  //       animate('500ms ease-in', style({ opacity: 1 })),
  //     ]),
  //   ]),
  //   trigger('slideDown', [
  //     transition(':enter', [
  //       style({ transform: 'translateY(-100%)' }),
  //       animate('300ms ease-out', style({ transform: 'translateY(0)' })),
  //     ]),
  //     transition(':leave', [
  //       style({ transform: 'translateX(0)' }),
  //       animate('300ms ease-in', style({ transform: 'translateX(120%)' })),
  //     ]),
  //   ]),
  // ],
})
export class ConversationListComponent {
  @Input() chat : any; //getting chat var from parent component
  @Input() search:any;
  @Input() serverPath:any;
  @Input() is_archive_open:any;
  @Input() getLikeData:any;
  @Output() showConvMsg_parent:EventEmitter<any>= new EventEmitter<any>();
  @Output() getUserStatusClass_parent:EventEmitter<any>= new EventEmitter<any>();
  @Output() joinCallParent: EventEmitter<any> = new EventEmitter<any>();
  private chatService = inject(ChatService);
  private sanitizer = inject(DomSanitizer);
  


  // show conversation message start
  showConvMsg(conv: any) {
    this.showConvMsg_parent.emit(conv);
  }
  
  // getUserStatusClass(is_online: any, status: any) {
  //   this.getUserStatusClass_parent.emit({is_online,status});
  // }
  // getting user status class start
  getUserStatusClass(is_online: any, status: any) {
    switch (status) {
      case 'dnd':
        return 'bg-danger';
      case 'away':
        return 'bg-warning';
      default:
        if (!is_online || is_online == false) {
          return ''; // No class if user is offline
        } else if (status == 'online') {
          return 'bg-success';
        } else {
          return ''; // No class if user is offline
        }
    }
  }
  // getting user status class end
  checkPic_privacy(user: { profilePhotoVisibility: string; _id?: any;  }):boolean{
    // console.log(this.chat.room.loggedUser);
    return this.chatService.checkPic_privacy(user,this.chat.room.loggedUser);
  }

  joinCall(conv: any) {
    this.joinCallParent.emit(conv);
  }

  getSanitizedMessage(htmlContent: string): string {
    if (!htmlContent) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
}
