import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
// material
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {MatCardModule} from '@angular/material/card';
// services
import { SocketService } from '../../../services/socket.service';
import { ChatService } from '../../../services/chat.service';
// import { TimeAgoPipe } from "../../../pipes/timeago/time-ago.pipe";
// material
import {MatGridListModule} from '@angular/material/grid-list';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { NgClass } from '@angular/common';
import { CustomSlice } from "../../../custom.slice.pipe";
import { SortByDatePipe } from "../pipe/sort-by-date.pipe";
import { TimeAgoConvPipe } from "../pipe/time-ago-conv.pipe";
import { SafeImageUrlPipe } from "../../../pipes/safe-image-url.pipe";

@Component({
    selector: 'app-unread-notification',
    
    templateUrl: './unread-notification.component.html',
    styleUrl: './unread-notification.component.scss',
    imports: [MatMenuModule, MatIconModule, MatButtonModule, MatBadgeModule, MatBadgeModule, MatCardModule, MatGridListModule, FirstCharsPipe, NgClass, CustomSlice, SortByDatePipe, TimeAgoConvPipe, SafeImageUrlPipe]
})
export class UnreadNotificationComponent {
  @Output() parentFun:EventEmitter<number>= new EventEmitter<number>();
  @Output() openContactTab_parent:EventEmitter<any>= new EventEmitter<any>();
  @Output() parentUpdateConvUnread:EventEmitter<number>= new EventEmitter<number>();
  @Input() chat : any; //getting chat var from parent component

  total_unread=0;
  unread_msg:any;
  unread_notifications:any;
  serverPath: any;
  constructor(private socketService: SocketService,private chatService: ChatService,private cdr: ChangeDetectorRef) {
    this.serverPath=chatService.serverPath;
    this.getUnreadMessageCount();
  }

  // get unread messages data strat
  getUnreadMessageCount() {
    // console.log('getUnreadMessageCount calling from child component');
    
    this.chatService
      .getUnreadMsg('/api/v1/get-unread-message-count')
      .subscribe({
        next: (res: any) => {
          // console.log(res);
          res = res.data;
          this.chat.unread.total_unread_count=0;//reset total unread
          if (res.unread_count.length>0) {
            res.unread_count.forEach((e: { ucount: number; }) => {
              this.chat.unread.total_unread_count+=e.ucount;
            });
            // this.parentUpdateConvUnread.emit(res.unread_count); //calling parent function to update in conv list 
          } 
          // add on total for unread notificaton
          if(res.unread_notificaton>0){
              this.chat.unread.total_unread_count+=res.unread_notificaton;
            // this.parentUpdateConvUnread.emit(res.unread_count); //calling parent function to update in conv list 
          }
          this.parentUpdateConvUnread.emit(res.unread_count); //calling parent function to update in conv list 
        },
        error:(error) => {
          console.log(error);
        }
      });
  }
  // get unread messages data end

   // get unread messages data strat
   getUnreadMessage() {
    this.chatService
      .getUnreadMsg('/api/v1/get-unread-message')
      .subscribe({
        next: (res: any) => {
          // console.log(res);
          res = res.data;
          if(res.unread_msg.length>0){
            this.unread_msg=res.unread_msg;
          }
          if(res.notifications.length>0){
            this.unread_notifications=res.notifications;
          }
          this.cdr.detectChanges();
        },
        error:(error) => {
          console.log(error);
        }
      });
  }
  // get unread messages data end

  // for open chat box
  openInChatBox(conv_id:any) {
    this.parentFun.emit(conv_id);
  }
  // getting user status class end
  checkPic_privacy(user: { profilePhotoVisibility: string; _id?: any;  }):boolean{
    // console.log(this.chat.room.loggedUser);
    return this.chatService.checkPic_privacy(user,this.chat.room.loggedUser);
  }
  // for open chat box
  openContactTab(notification_id:any) {
    this.openContactTab_parent.emit(notification_id);
  }
  openContactDialog(notification_id:any){
    
  }

  onAccept(connectionId:string) {
    this.socketService.emit('accept_request',{request_id:connectionId,from:this.chat.room.loggedUser.id});
    this.chat.unread.total_unread_count-=1;
    this.cdr.detectChanges();
  }
  
  onReject(connectionId:string) {
    this.socketService.emit('reject_request',{request_id:connectionId,from:this.chat.room.loggedUser.id});
  }
  
}
