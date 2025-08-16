import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { FileSizePipe } from '../../../pipes/file-size.pipe';
import { FirstCharsPipe } from '../../../pipes/first-chars.pipe';
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';

@Component({
  selector: 'app-profile-tab',
  imports: [NgOptimizedImage,NgClass,FileSizePipe,FirstCharsPipe,SafeImageUrlPipe],
  templateUrl: './profile-tab.component.html',
  styleUrl: './profile-tab.component.scss'
})
export class ProfileTabComponent implements AfterViewInit{
  @Input() chat: any; //getting chat var from parent component
  @Input() ActiveTab: string | undefined;//for tab
  @Input() serverPath:any;
  @Input() localZone:any;
  private chatService = inject(ChatService);
  @Output() getUserStatusClass_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() setTab_parent: EventEmitter<any> = new EventEmitter<any>();
  constructor(private cdr: ChangeDetectorRef){
  }
  ngAfterViewInit(){
    this.getAllAttachment();
  }
  
  // show all profile media start
  show_all_media_profile = false;
  showAll_media_profile() {
    this.show_all_media_profile = !this.show_all_media_profile;
  }
  // show all profile media end

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
  
  // get all attached file start
  all_attached_files: any = [];
  getAllAttachment() {
    this.all_attached_files = [];
    this.chatService
      .getAllAttachement('/api/v1/get-attached-file')
      .subscribe({
        next: (res: any) => {
          if (res) {
            res.body.data.all_attached_file.forEach((e: { attachments: any; }) => {
              if (e.attachments) {
                e.attachments.forEach((e2: any) => {
                  this.all_attached_files.push(e2);
                });
              }
            });
            this.cdr.detectChanges();
          } else {
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
  // get all attached file end

  gotosetting(val:string){
    this.setTab_parent.emit(val);
    this.cdr.detectChanges();
  }

}
