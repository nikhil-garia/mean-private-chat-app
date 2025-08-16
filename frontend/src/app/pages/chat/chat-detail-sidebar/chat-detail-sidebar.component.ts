import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import {MatProgressBarModule} from '@angular/material/progress-bar';
import { ChatService } from '../../../services/chat.service';
import { FileSizePipe } from "../../../pipes/file-size.pipe";
import { MatSidenav } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HeartAnimationComponent } from "./heart-animation/heart-animation.component";
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';

@Component({
  selector: 'app-chat-detail-sidebar',
  templateUrl: './chat-detail-sidebar.component.html',
  styleUrl: './chat-detail-sidebar.component.scss',
  imports: [NgClass, FirstCharsPipe, MatProgressBarModule, FileSizePipe, HeartAnimationComponent,SafeImageUrlPipe],
})
export class ChatDetailSidebarComponent {
  loading: boolean = true;
  @Input() chat: any; //getting chat var from parent component
  @Input() drawer!: MatSidenav; // Get the MatSidenav instance from parent
  @Input() selectedConv: any;
  @Output() parentArchiveConv:EventEmitter<any>= new EventEmitter<any>();
  @Output() parentConfirmDelete:EventEmitter<any>= new EventEmitter<any>();
  @Output() parent_addUserTOConv:EventEmitter<any>= new EventEmitter<any>();
  @Output() parent_openCall_dialog:EventEmitter<any>= new EventEmitter<any>();
  @Output() muteConversationParent:EventEmitter<any>= new EventEmitter<any>();
  attached_files: any;
  serverPath: string;
  common_group: any;
  ngOnInit(): void {
    this.getAttachementByConv(this.selectedConv);
    setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 100);
  }
  constructor(private chatService: ChatService,private cdr: ChangeDetectorRef,private snackBar: MatSnackBar,public dialog: MatDialog) {
    // console.log(this.selectedConv);
    this.serverPath=chatService.serverPath;
  }
  getAttachementByConv(selectedConv: any) {
    this.attached_files=[];
    this.cdr.detectChanges();
    // console.log(selectedConv);
    let data={
      conv_id:selectedConv._id,
      is_group:selectedConv.is_group,
      participants:null,
    }
    if (selectedConv.is_group==false) {
      data.participants=selectedConv.participants;
    }
    // console.log(data);
    this.chatService
      .getAttachementByConv('/api/v1/get-attachment-by-convId', data)
      .subscribe({
        next: (res: any) => {
          // console.log(res);
          if (res) {
            this.attached_files = res.body.data.AllAttached;
            this.common_group = res.body.data.commonGroup;
            this.cdr.detectChanges();
          } else {
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
    
  // show all sidbar media start
  show_all_media_profile=false;
  showAll_media_sidebar(){
    this.show_all_media_profile=!this.show_all_media_profile;
  }
  archive_conv2(){
    this.parentArchiveConv.emit(this.selectedConv);
    this.cdr.detectChanges();
  }
  parentConfirmDelete1(){
    this.parentConfirmDelete.emit();
    this.cdr.detectChanges();
  }
  // show all sidbar media end
  remove_user_conv(remove_user_id:any){
    let data={
      removerId:this.chat.room.loggedUser.id,
      removedUserId:remove_user_id,
    }
    let url='/api/v1/conversation/'+this.selectedConv._id+'/remove';
    this.chatService
      .POST(url, data)
      .subscribe({
        next: (res: any) => {
          console.log(res);
          if (res) {
            this.selectedConv.participants=this.selectedConv.participants.filter((i: { _id: any; })=>{return i._id!=remove_user_id;});
            this.cdr.detectChanges();
            this.snackBar.open('user removed from conversation..', 'close', {
              duration: 3000
            });
          } else {
            this.snackBar.open('user not removed from conversation..', 'close', {
              duration: 3000
            });
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
  add_user_conv(){    
    import('../contact-dialog2/contact-dialog2.component').then(({ ContactDialog2Component }) => {
      const dialogRef = this.dialog.open(ContactDialog2Component, {
        height: '500px',
        width: '600px',
        data: {
          intData: this.chat,
          addUserTOConv: this.parent_addUserTOConv,
          addUserTOConv2: this.addParticipant.bind(this),
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        console.log(`Dialog result: ${result}`);
      });
    });
  }
  addParticipant(data: any){
    // console.log('chat detail addParticipant');
    this.chat.room.selectedRoomDetail.row.participants=data;
    this.cdr.detectChanges();
  }
  checkAdmin(){
    let isadmin=false;
    this.selectedConv.participants.forEach((i: { _id: any; }) => {
      if(this.chat.room.loggedUser.id==this.selectedConv.created_by._id){
        if(i._id!=this.chat.room.loggedUser.id){
          isadmin=true;
        }
      }
    });
    return isadmin;
  }
  // getting user status class end

  // checking profile image privacy status for display image 
  checkPic_privacy(user: { profilePhotoVisibility: string; }){
    return this.chatService.checkPic_privacy(user,this.chat.room.loggedUser);
  }

  // open audio/video call dialog from parent
  openCall_dialog_parent(type: string) {
    this.parent_openCall_dialog.emit(type);
    this.cdr.detectChanges();
  }
  // for mute conversation  
  muteConversation(muted1:boolean){
    this.muteConversationParent.emit(muted1);
  }
}
