import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
// material
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
// services
import { SocketService } from '../../../services/socket.service';
import { ChatService } from '../../../services/chat.service';
// pipes
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { CustomSlice } from "../../../custom.slice.pipe";
import { SortByDatePipe } from "../pipe/sort-by-date.pipe";
import { TimeAgoConvPipe } from "../pipe/time-ago-conv.pipe";
import { SafeImageUrlPipe } from "../../../pipes/safe-image-url.pipe";

// NOTE: If <mat-icon> is not showing, ensure the Angular Material icons font is loaded in your index.html:
// <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

// Define an interface for structured grouping
interface GroupedData {
  today: any[];
  yesterday: any[];
  thisWeek: any[];
  thisMonth: any[];
  thisYear: any[];
  yearBefore: any[];
}

@Component({
  selector: 'app-unread-notification',
  templateUrl: './unread-notification.component.html',
  styleUrl: './unread-notification.component.scss',
  imports: [
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatCardModule,
    MatSlideToggleModule,
    FirstCharsPipe,
    NgClass,
    CustomSlice,
    TimeAgoConvPipe,
    SafeImageUrlPipe,
    NgTemplateOutlet // <-- Add NgTemplateOutlet to fix missing import for *ngTemplateOutlet
  ]
})
export class UnreadNotificationComponent {
  @Output() parentFun: EventEmitter<number> = new EventEmitter<number>();
  @Output() openContactTab_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() parentUpdateConvUnread: EventEmitter<number> = new EventEmitter<number>();
  @Input() chat: any;

  total_unread = 0;
  // No longer directly storing unread_msg and unread_notifications globally,
  // instead they will be processed into grouped data.
  // unread_msg: any[] = [];
  // unread_notifications: any[] = [];

  groupedMessages: GroupedData = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    thisYear: [],
    yearBefore: []
  };

  groupedNotifications: GroupedData = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    thisYear: [],
    yearBefore: []
  };

  serverPath: any;

  constructor(
    private socketService: SocketService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {
    this.serverPath = chatService.serverPath;
    this.getUnreadMessageCount();
  }

  // ============ API Methods ============
  getUnreadMessageCount() {
    this.chatService
      .getUnreadMsg('/api/v1/get-unread-message-count')
      .subscribe({
        next: (res: any) => {
          res = res.data;
          this.chat.unread.total_unread_count = 0;

          if (res.unread_count.length > 0) {
            res.unread_count.forEach((e: { ucount: number; }) => {
              this.chat.unread.total_unread_count += e.ucount;
            });
          }

          if (res.unread_notificaton > 0) {
            this.chat.unread.total_unread_count += res.unread_notificaton;
          }

          this.parentUpdateConvUnread.emit(res.unread_count);
        },
        error: (error) => {
          console.log(error);
        }
      });
  }

  getUnreadMessage() {
    this.chatService
      .getUnreadMsg('/api/v1/get-unread-message')
      .subscribe({
        next: (res: any) => {
          this.initializeGroupedData(); // Reset groups before processing new data

          // Sort all messages once by date in descending order
          const allUnreadMessages = res.data.unread_msg.sort((a: any, b: any) =>
            new Date(b.send_datetime).getTime() - new Date(a.send_datetime).getTime()
          );

          // Sort all notifications once by date in descending order
          const allUnreadNotifications = res.data.notifications.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Group messages
          allUnreadMessages.forEach((msg: any) => {
            const msgDate = new Date(msg.send_datetime);
            if (this.isToday(msgDate)) {
              this.groupedMessages.today.push(msg);
            } else if (this.isYesterday(msgDate)) {
              this.groupedMessages.yesterday.push(msg);
            } else if (this.isThisWeek(msgDate)) {
              this.groupedMessages.thisWeek.push(msg);
            } else if (this.isThisMonth(msgDate)) {
              this.groupedMessages.thisMonth.push(msg);
            } else if (this.isThisYear(msgDate)) {
              this.groupedMessages.thisYear.push(msg);
            } else {
              this.groupedMessages.yearBefore.push(msg);
            }
          });

          // Group notifications
          allUnreadNotifications.forEach((notif: any) => {
            const notifDate = new Date(notif.createdAt);
            if (this.isToday(notifDate)) {
              this.groupedNotifications.today.push(notif);
            } else if (this.isYesterday(notifDate)) {
              this.groupedNotifications.yesterday.push(notif);
            } else if (this.isThisWeek(notifDate)) {
              this.groupedNotifications.thisWeek.push(notif);
            } else if (this.isThisMonth(notifDate)) {
              this.groupedNotifications.thisMonth.push(notif);
            } else if (this.isThisYear(notifDate)) {
              this.groupedNotifications.thisYear.push(notif);
            } else {
              this.groupedNotifications.yearBefore.push(notif);
            }
          });

          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.log(error);
        }
      });
  }

  private initializeGroupedData() {
    this.groupedMessages = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      thisYear: [],
      yearBefore: []
    };
    this.groupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      thisYear: [],
      yearBefore: []
    };
  }

  // ============ Date Filtering Helper Methods (no changes here, they are still valid helpers) ============
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }

  private isThisWeek(date: Date): boolean {
    const today = new Date();
    const startOfCurrentWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    // Exclude today and yesterday from "This Week" category to avoid overlap
    return date >= startOfCurrentWeek && !this.isToday(date) && !this.isYesterday(date);
  }

  private isThisMonth(date: Date): boolean {
    const today = new Date();
    // Exclude messages that fall into Today, Yesterday, or This Week
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear() &&
           !this.isToday(date) && !this.isYesterday(date) && !this.isThisWeek(date);
  }

  private isThisYear(date: Date): boolean {
    const today = new Date();
    // Exclude messages that fall into Today, Yesterday, This Week, or This Month
    return date.getFullYear() === today.getFullYear() &&
           !this.isToday(date) && !this.isYesterday(date) && !this.isThisWeek(date) && !this.isThisMonth(date);
  }

  private isYearBefore(date: Date): boolean {
    const today = new Date();
    return date.getFullYear() < today.getFullYear();
  }


  // ============ Data Retrieval Methods (now simple getters) ============
  getTodayMessages(): any[] {
    return this.groupedMessages.today;
  }

  getYesterdayMessages(): any[] {
    return this.groupedMessages.yesterday;
  }

  getThisWeekMessages(): any[] {
    return this.groupedMessages.thisWeek;
  }

  getThisMonthMessages(): any[] {
    return this.groupedMessages.thisMonth;
  }

  getThisYearMessages(): any[] {
    return this.groupedMessages.thisYear;
  }

  getYearBeforeMessages(): any[] {
    return this.groupedMessages.yearBefore;
  }

  getTodayConnectionRequests(): any[] {
    return this.groupedNotifications.today;
  }

  getYesterdayConnectionRequests(): any[] {
    return this.groupedNotifications.yesterday;
  }

  getThisWeekConnectionRequests(): any[] {
    return this.groupedNotifications.thisWeek;
  }

  getThisMonthConnectionRequests(): any[] {
    return this.groupedNotifications.thisMonth;
  }

  getThisYearConnectionRequests(): any[] {
    return this.groupedNotifications.thisYear;
  }

  getYearBeforeConnectionRequests(): any[] {
    return this.groupedNotifications.yearBefore;
  }

  // ============ Visibility Check Methods (no changes required here) ============
  hasNotificationsForToday(): boolean {
    return this.getTodayMessages().length > 0 || this.getTodayConnectionRequests().length > 0;
  }

  hasNotificationsForYesterday(): boolean {
    return this.getYesterdayMessages().length > 0 || this.getYesterdayConnectionRequests().length > 0;
  }

  hasNotificationsForThisWeek(): boolean {
    return this.getThisWeekMessages().length > 0 || this.getThisWeekConnectionRequests().length > 0;
  }

  hasNotificationsForThisMonth(): boolean {
    return this.getThisMonthMessages().length > 0 || this.getThisMonthConnectionRequests().length > 0;
  }

  hasNotificationsForThisYear(): boolean {
    return this.getThisYearMessages().length > 0 || this.getThisYearConnectionRequests().length > 0;
  }

  hasNotificationsForYearBefore(): boolean {
    return this.getYearBeforeMessages().length > 0 || this.getYearBeforeConnectionRequests().length > 0;
  }

  hasAnyNotifications(): boolean {
    return this.hasNotificationsForToday() ||
           this.hasNotificationsForYesterday() ||
           this.hasNotificationsForThisWeek() ||
           this.hasNotificationsForThisMonth() ||
           this.hasNotificationsForThisYear() ||
           this.hasNotificationsForYearBefore();
  }

  // ============ Action Methods ============
  openInChatBox(conv_id: any) {
    this.parentFun.emit(conv_id);
  }

  openContactTab(notification_id: any) {
    this.openContactTab_parent.emit(notification_id);
  }

  openContactDialog(notification_id: any) {
    // Implementation for opening contact dialog
  }

  onAccept(connectionId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.socketService.emit('accept_request', {
      request_id: connectionId,
      from: this.chat.room.loggedUser.id
    });
    this.chat.unread.total_unread_count -= 1;
    // Remove the accepted notification from the local grouped array
    this.removeNotificationFromGroups(connectionId);
    this.cdr.detectChanges();
  }

  onReject(connectionId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.socketService.emit('reject_request', {
      request_id: connectionId,
      from: this.chat.room.loggedUser.id
    });
    // Remove the rejected notification from the local grouped array
    this.removeNotificationFromGroups(connectionId);
    this.cdr.detectChanges();
  }

  private removeNotificationFromGroups(connectionId: string) {
    for (const key in this.groupedNotifications) {
      if (this.groupedNotifications.hasOwnProperty(key)) {
        this.groupedNotifications[key as keyof GroupedData] = this.groupedNotifications[key as keyof GroupedData].filter(
          notif => notif.connectionId !== connectionId
        );
      }
    }
  }


  checkPic_privacy(user: { profilePhotoVisibility: string; _id?: any; }): boolean {
    return this.chatService.checkPic_privacy(user, this.chat.room.loggedUser);
  }
}