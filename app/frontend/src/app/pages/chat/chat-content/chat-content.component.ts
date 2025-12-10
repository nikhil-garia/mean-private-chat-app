import { AfterViewInit, ChangeDetectorRef, Component, ComponentRef, ElementRef, EnvironmentInjector, EventEmitter, inject, Injector, Input, Output, QueryList, Renderer2, ViewChild, ViewChildren, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { CallService } from '../../../services/call.service';
import { TypingDotsComponent } from "../typing-dots/typing-dots.component";
import { format, parse, parseISO, isSameDay, isSameWeek, subDays, differenceInHours, formatDistanceToNow } from 'date-fns';
import { HttpEventType, HttpResponse } from '@angular/common/http';
// material
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
// pipes
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { FileSizePipe } from "../../../pipes/file-size.pipe";
import { TimeAgoPipe } from "../../../pipes/timeago/time-ago.pipe";
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';

// services
import { SocketService } from '../../../services/socket.service';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
// infinite scroll
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
// child component
import { ImgUploadDialogComponent } from '../img-upload-dialog/img-upload-dialog.component';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';
import { LeatletMapComponent } from '../leatlet-map/leatlet-map.component';
// component
import { ShareLocationDialogComponent } from '../share-location-dialog/share-location-dialog.component';
// import { ContactDialogComponent } from '../contact-dialog/contact-dialog.component';
import { WaveformComponent } from '../waveform/waveform.component';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { EditorComponent } from "../editor/editor.component";
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav } from '@angular/material/sidenav';
import { TimeAgoConvPipe } from "../pipe/time-ago-conv.pipe";
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MediaGallery } from "../media-gallery/media-gallery";
// import { ChatImgSliderComponent } from '../chat-img-slider/chat-img-slider.component';

@Component({
  selector: 'app-chat-content',
  // styles: [`@import "https://cdnjs.cloudflare.com/ajax/libs/quill/2.0.2/quill.snow.css";`],
  imports: [FirstCharsPipe,
    FormsModule,
    NgClass,
    NgIf, TypingDotsComponent,
    InfiniteScrollDirective,
    MatProgressSpinnerModule, FileSizePipe,
    WaveformComponent,
    LeatletMapComponent,
    ClipboardModule,
    MatTooltipModule, TimeAgoPipe,
    PickerComponent, EditorComponent, MatButtonModule, TimeAgoConvPipe, SafeImageUrlPipe, MediaGallery],
  templateUrl: './chat-content.component.html',
  styleUrl: './chat-content.component.scss',
  encapsulation: ViewEncapsulation.None // or Encapsulation.Emulated (default)
})
export class ChatContentComponent implements AfterViewInit  {
  @Input() chat: any; //getting chat var from parent component
  // @Input() drawer: any;
  @Input() drawer!: MatSidenav; // Get the MatSidenav instance from parent
  @Input() userChatElement: any;
  @Input() opened: boolean | undefined;//for sidenav
  @Input() ActiveTab: string | undefined;//for tab
  @Output() archive_conv_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() removeUserChat_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() bookmark_msg_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() openContactPopup_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() markConvAsRead_parent: EventEmitter<any>=new EventEmitter<any>();
  @Output() getUnreadMsgCount_parent: EventEmitter<any>=new EventEmitter<any>();
  @Output() child_get_sidebardAttachment: EventEmitter<any> = new EventEmitter<any>();
  // get archive data
  // @Output() get_archive_data_parent: EventEmitter<void> = new EventEmitter();

  @ViewChildren('item') itemElements!: QueryList<ElementRef>;

  // for load child sticker compoment
  @ViewChild('stickerPickerContainer', { read: ViewContainerRef }) stickerPickerContainer!: ViewContainerRef;

  // @ViewChild('msginputField') msginputField!: ElementRef;
  @ViewChild('attachedfileInput') attachFileInput!: ElementRef;
  @ViewChild('attachedprofileInput') attachProfileInput!: ElementRef;
  @ViewChild('chatMsgList_element') chatMsgList_element!: ElementRef;
  @ViewChild(EditorComponent) child_EditorComponent!: EditorComponent;

  private stickerComponentRef?: ComponentRef<any>;

  message: string;
  sticker: any = '';
  serverPath: string;

  loadingMoreMsg: boolean | undefined=false;
  editedChat: '' | undefined;
  isMoreActive: boolean = false;
  isReaplyActive: boolean = false;
  isAttachedPrevActive: boolean = false;

  private chatService = inject(ChatService);
  // private callService = inject(CallService);
  // drawer: any;
  nsend_date: any;
  chat_conv_list_loading: boolean | undefined;

  showSticker = false;
  loadedMessages = 0; //for count loaded msg
  // for infinite scroll
  scrollDistance = 1.5; // Trigger when 80% of the container is scrolled
  scrollUpDistance = 1.2; // Trigger when scrolling up
  loadingThrottle = 150;
  previousScrollHeightMinusTop: any;
  chat_conv_msg_list_loading: boolean | undefined;
  shoEmojiPicker = false;
  isMobile=false;
  isScrollable: boolean = false;

  constructor(private snackBar: MatSnackBar, private cdr: ChangeDetectorRef, private renderer: Renderer2,
    public dialog: MatDialog,
    private socketService: SocketService,
    private authService: AuthService,
    private injector: Injector,
    private environmentInjector: EnvironmentInjector,private sanitizer: DomSanitizer, private el: ElementRef) {
    this.serverPath = this.chatService.serverPath;
    this.message = '';
    window.addEventListener('resize', this.checkLayout.bind(this));
  }

  // ngAfterViewChecked() {
  //   this.checkIfScrollable();
  // }

  private checkLayout() {
    const isMobile = window.innerWidth < 768; // Adjust the breakpoint as needed
    this.isMobile=isMobile;
    this.cdr.detectChanges();
  }

  // show conversation message start
  showConvMsg(conv: any) {
    if(!this.chat_conv_msg_list_loading){
      this.chat.room.selectedRoomId = conv._id;
      this.chat.room.selectedRoomDetail.row = conv;
      this.loadedMessages = 0; //for count loaded msg
      this.chat.room.selectedRoomDetail.msgs = [];
      this.chat_conv_msg_list_loading = true;
      this.cdr.detectChanges();
      this.getChatMsgByConv(); //getting message data
      if (conv.unread_cov_count && conv.unread_cov_count > 0) {
        this.markConvAsRead(conv, 'showCovmsg', '');
      }
      // if right sidenav bar opened
      if (this.opened) {
        // get attachment files
        this.child_get_sidebardAttachment.emit();
      }
      // mobile view show ful width conv or msg area
      this.renderer.addClass(this.userChatElement.nativeElement, 'user-chat-show');
      if (!this.isMobile) {
        setTimeout(() => {
          // this.msginputField.nativeElement.focus(); //focus on msg input
          this.child_EditorComponent.focusOnEditor();
        }, 200);
      }
    }
  }
  // show conversation message end

  // update after message is read start
  // Note this method calling from 2 place (1. when select conv list and 2.)
  markConvAsRead(select_item: any, source: string, on_rec_msg_data: any) {
    this.markConvAsRead_parent.emit({select_item,source,on_rec_msg_data});
  }
  // update after message is read end

  // for mobile view : showing conversation msg when click on conversation
  removeUserChat() {
    this.removeUserChat_parent.emit();
  }

  // send message start
  // progress = 0;
  final_uploaded_file: any = []
  sendMessage(message: any, loggedUser: any, attach_file: any, location?: any) {
    if (this.msgText != '' || (attach_file && attach_file.length > 0) || (location && location.length > 0 && location != undefined) || this.sticker != '') {
      let temp_id = new Date().getTime();
      var tempObj = {
        message_id: null,
        from_id: loggedUser.id,
        to_id: '',
        message: message,
        sticker: this.sticker,
        attachments: attach_file.length > 0 ? attach_file : '',
        location: location ? location : '',
        // send_datetime:moment(new Date()).format('h:mm A'),
        send_datetime: 'just now',
        conversation_id: this.chat.room.selectedRoomId,
        chat_type: this.chat.room.selectedRoomDetail.row.is_group,
        is_edit: 0,
        is_delete: 0,
        deleted_by: '',
        user_name: loggedUser.fullName,
        // last_name: '',
        profile_pic: loggedUser.profile_pic,
        full_send_datetime: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        from: loggedUser,
        temp_id,
        reply_to: {},
        replyToId: '',
        deliveredTo: [],
        readBy: [],
        is_conv_temp: this.chat.room.selectedRoomDetail.row.is_conv_temp,
      }
      if (tempObj.chat_type == false) {
        let touserid = this.chat.room.selectedRoomDetail.row.participants.filter(
          (participant: any) => {
            return participant.isme == 'no';
          }
        );
        tempObj.to_id = touserid[0]._id;
      }
      //for edited msg
      if (this.editedChat && this.editedChat != '') {

      } else {
        if (this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg) {
          tempObj.reply_to = this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg;
          tempObj.replyToId = this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg._id;
        }
        // tempObj.temp_id: any='sdfs';
        tempObj.temp_id = temp_id;
        tempObj.from.isme = 'yes';
        // ctrl.fileProgress_2[temp_id] = attach_file;
        // for insert
        if (this.chat.room.selectedRoomDetail.msgs.length > 0) {
          let lastInd = this.chat.room.selectedRoomDetail.msgs.length - 1;
          if (this.chat.room.selectedRoomDetail.msgs[lastInd].date == "Today") {
            this.chat.room.selectedRoomDetail.msgs[lastInd].collection.push(tempObj);
          } else {
            this.chat.room.selectedRoomDetail.msgs.push({
              "date": "Today",
              "collection": [tempObj]
            });
          }
        } else {
          this.chat.room.selectedRoomDetail.msgs.push({
            "date": "Today",
            "collection": [tempObj]
          })
        }
        // End set in today group data
        // setRecentChat(resdata,1);

        this.scrollToBottom2();//scroll to bottom
        this.prev_files = [];//reset prev attached file
        this.dialog.closeAll(); //close location popup
        this.isMoreActive = false;//hide more section
      }
      // this.progress = 0;
      // upload attached file start  
      let ftoday = this.chat.room.selectedRoomDetail.msgs.filter((v: { date: string; }) => { return v.date == "Today" });
      let filterData: any = ftoday[0].collection;
      let fattachData = filterData.filter((v: { temp_id: number; }) => { return v.temp_id == tempObj.temp_id });
      let filteredAttachment = fattachData[0].attachments;

      if (attach_file.length > 0) {
        this.final_uploaded_file = [];
        let uploadPromises = attach_file.map((file: { progress: any; original: File; }, _index: number) => {
          return new Promise((resolve, reject) => {
            // Replace with your actual upload function
            this.chatService.uploadFile(file.original, '/api/v1/upload_chat_file')
              .subscribe((event) => {
                if (event.type === HttpEventType.UploadProgress) {
                  file.progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
                  filteredAttachment[_index].progress = file.progress;
                } else if (event instanceof HttpResponse) {
                  this.final_uploaded_file.push(event.body.data);
                  filteredAttachment[_index].destination = event.body.data.destination;
                  filteredAttachment[_index].path = event.body.data.path;
                  resolve(event);
                }
              }, error => {
                console.error('Error uploading file', error);
                reject(error);
              }
              )
          });
        });
        Promise.all(uploadPromises)
          .then(results => {
            this.sendMsgFinal(message, loggedUser, tempObj, this.final_uploaded_file);
          })
          .catch(error => {
            console.error('An error occurred while uploading the files', error);
          });
        // upload attached file end  
      } else {
        this.sendMsgFinal(message, loggedUser, tempObj);
      }
      // for recorded audio
      // else if(this.recordedBlob!=''){
      //   // for upload recorded voice audio
      //   this.sendAudioMessage(this.recordedBlob,message, loggedUser, tempObj);
      // } 
    }
  }
  sendMsgFinal(message: any, loggedUser: any, tempObj: any, uploaded_file: any = null) {
    let data = {
      message: message,
      sticker: tempObj.sticker,
      sendFrom: loggedUser,
      chat_type: tempObj.chat_type,
      attachment: uploaded_file,
      location: tempObj.location ? tempObj.location : '',
      conversation_id: this.chat.room.selectedRoomId,
      from: {},
      fromUser2:tempObj.from, 
      from2:tempObj.from_id,
      to: '',
      is_conv_temp: '',
      temp_id: tempObj.temp_id,
      reply_to: tempObj.reply_to ? tempObj.reply_to : '',
    };
    // for single chat
    if (tempObj.chat_type == false) {
      data.to = tempObj.to_id;
    }
    // if it temp conversation
    if(tempObj.is_conv_temp){
      data.is_conv_temp = tempObj.is_conv_temp;
    }
    let data2 = JSON.parse(JSON.stringify(data)); //deep copy
    data.from = {
      isme: 'yes',
    };
    this.message = '';//set message empty
    this.msgText='';
    this.child_EditorComponent.setQuillEmpty(); // set quill editor value empty
    this.sticker = '';//reset sticker
    console.log('before emit to send_msg');
    this.socketService.emit('send_msg', data2); //send message data to backend
    if (this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg) {
      setTimeout(() => {
        this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg = null;
      }, 2000);
      this.isReaplyActive = false;
    }
    // this.msginputField.nativeElement.focus(); //focus on msg input
    this.child_EditorComponent.focusOnEditor();//focus on child msg input

    // set last message and date in conv list
    this.setLastMsgConv(message, { conversation_id: tempObj.conversation_id, full_send_datetime: tempObj.full_send_datetime, attachments: data.attachment, sent_by_u: true,fromUser:data.fromUser2, from:data.from2,is_conv_temp:data.is_conv_temp });
  }

  setLastMsgConv(message: any, tempObj: any) {
    this.chat.room.conv_list.forEach((cl: any, i: number) => {
      if (cl._id == tempObj.conversation_id) {
        cl.last_message = message;
        cl.last_msg_row.sent_by_u = tempObj.sent_by_u;
        cl.last_msg_row._id = tempObj.conversation_id;
        cl.last_msg_row.send_datetime = tempObj.full_send_datetime;
        cl.last_msg_row.message = message;
        cl.last_msg_row.readBy = [];
        cl.last_msg_row.deliveredTo = [];
        if (tempObj.attachments && tempObj.attachments.length > 0) {
          cl.last_msg_row.attachments = tempObj.attachments
        }
        cl.last_msg_date = tempObj.full_send_datetime;
        cl.last_msg_row.fromUser = tempObj.fromUser;
        cl.last_msg_row.from = tempObj.from;
        this.cdr.detectChanges();
      }
    });
  }
  // send message end

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

  // open audio call dialog
  async openCall_dialog(type: string) {
    let to_user_id;
    let groupName = '';
    if (this.chat.room.selectedRoomDetail.row.is_group == false) {
      let touserid = this.chat.room.selectedRoomDetail.row.participants.filter(
        (participant: any) => {
          return participant.isme == 'no';
        }
      );
      to_user_id = touserid[0]._id;
    } else {
      to_user_id = '';
      // Try to get group name from row
      groupName = this.chat.room.selectedRoomDetail.row.groupName || this.chat.room.selectedRoomDetail.row.fullName || '';
    }
    let media_access=type == "video" ? { video: true, audio: true } : { audio: true };
    await navigator.mediaDevices.getUserMedia(media_access).then(async(steam)=>{
      // emit for start call
      this.socketService.emit_callback2('start_call', { from_user_id:this.chat.room.loggedUser.id,to_user_id: to_user_id, conversation_id:this.chat.room.selectedRoomId,is_group:this.chat.room.selectedRoomDetail.row.is_group,conv_participant: this.chat.room.selectedRoomDetail.row.participants, type: type, groupName }).subscribe({
        next: (res:any) => {
          if (res.status == 200) {
            let dialogRef;
            if (type == "video") {
              import('../video-call-dialog2/video-call-dialog2.component').then(({ VideoCallDialog2Component }) => {
                dialogRef = this.dialog.open(VideoCallDialog2Component, {
                  height: '500px',
                  width: '500px',
                  data: {
                    intData: this.chat,
                    videoCall_detail: res.data
                  },
                  disableClose: true
                });
                dialogRef.afterClosed().subscribe((result) => {});
              });
            } else {
              import('../audio-call-dialog2/audio-call-dialog2.component').then(({ AudioCallDialog2Component }) => {
                dialogRef = this.dialog.open(AudioCallDialog2Component, {
                  height: '500px',
                  width: '500px',
                  data: {
                    intData: this.chat,
                    audioCall_detail: { ...res.data, groupName }
                  },
                  disableClose: true
                });
                dialogRef.afterClosed().subscribe((result) => {});
              });
            }
          } else {
            console.log(res.message);
          }
        },
        error: (error:any) => {
          console.error('Error in starting call:', error);
          if (error.status == 403) {
            console.error(error);
            this.onLogout(1);
          }
        },
        complete: () => {
          console.log('Call initiation complete');
        }
      });
    });
  }
  // End open audio call dialog

  //====== attachment start=====
  prev_files: any = [];
  prev_profile: any = [];
  previewFile(event: any, source: any = 'null') {
    // this.prev_files=[];
    let files: any = event.target.files;
    if (source == 'profile') {
      this.prev_profile = [];
    } else {
      this.isAttachedPrevActive = true;
      this.isMoreActive = false;
    }
    // allowed file types
    var allowedTypes = /image.*|application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|application\/vnd.openxmlformats-officedocument.presentationml.presentation|application\/x-zip-compressed|text\/plain|video.*|audio.*/;
    var maxSize = 5 * 1024 * 1024; // 5MB


    if (files) {
      if (files.length > 5) {
        this.snackBar.open('You can select max 5 files at a time.', 'close', {
          duration: 5000
        });
        return;
      }
      for (let file of files) {
        // Check if the uploaded file is an image, pdf, doc, video or audio
        if (!file.type.match(allowedTypes)) {
          this.snackBar.open('File is not an image, PDF, DOC,Excel,PPT,zip video or audio.', 'close', {
            duration: 5000
          });
          return;
        } else if (file.size > maxSize) {
          this.snackBar.open('File is too large. Maximum file size is 5MB.', 'close', {
            duration: 5000
          });
          return;
        }
        let reader = new FileReader();
        reader.onload = (e: any) => {
          var data: any = {
            originalname: file.name,
            size: file.size,
            mimetype: file.type,
            url: e.target.result,
            original: file,
          }
          if (source == 'profile') {
            data.event = event;
            this.prev_profile.push(data);
            this.openUploadImgPopup();
            this.cdr.detectChanges();
          } else {
            this.prev_files.push(data);
            this.cdr.detectChanges();
          }
        }
        reader.readAsDataURL(file);
      }
    }
    setTimeout(() => {
      if (source == 'profile') {
        this.attachProfileInput.nativeElement.value = '';
      } else {
        this.attachFileInput.nativeElement.value = '';
      }
    }, 5000);
  }
  removeSelPreve(index: any) {
    this.prev_files.splice(index, 1);
    if (this.prev_files.length == 0) {
      this.isAttachedPrevActive = false;
    }
  }
  removeAll_prev_file() {
    this.isAttachedPrevActive = false;
    this.prev_files = [];
  }
  //====== attachment end=====

  // scroll to bottom for new chat start
  scrollToBottom2() {
    setTimeout(() => {
      this.chatMsgList_element.nativeElement.scrollTop = this.chatMsgList_element.nativeElement.scrollHeight;
      this.cdr.detectChanges();
    }, 0);
  }
  // End scroll to bottom for new chat

  // logout
  onLogout(unhadleError:number | undefined=undefined) {
    this.chatService
      .POST('/api/v1/logout', {})
      .subscribe({
        next: (res: any) => {
          // console.log('response', res);
          if(res.status==200){
            if(unhadleError){
              this.authService.logout('/api/v1/logout',1);
            }else{
              this.authService.logout('/api/v1/logout');
            }
          }
        },
        error: (error) => {}
      });
  }

  // profile image upload popup start

  // for contact dialog
  openUploadImgPopup() {
    const dialogRef = this.dialog.open(ImgUploadDialogComponent, {
      height: '600px',
      width: '900px',
      maxWidth: '100vw',
      maxHeight: '100vw',
      data: {
        // fetchConvList: this.fetchConvList.bind(this),
        prev_profile: this.prev_profile,
        intData: this.chat,
      },
    });
    dialogRef.componentInstance.updateProfilePic.subscribe((newData: any) => {
      this.chat.room.loggedUser.profile_pic = newData;
      this.cdr.detectChanges();
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
  }
  // profile image upload popup end

  // archive conversation start
  archive_conv(selected_conv: any) {
    this.archive_conv_parent.emit(selected_conv);//calling parent component function
  }
  // archive conversation end

  // delete conversation start
  confirmDelete() {
    this.dialog.open(DeleteConfirmDialogComponent, {
      width: '350px',
      data: {
        conv_id: this.chat.room.selectedRoomDetail.row,
        parentDeleteConv: this.del_conv.bind(this)
      }
    });
  }
  del_conv(selected_conv: any) {
    this.chatService
      .POST('/api/v1/delete_conversation', {
        conv_id: selected_conv._id,
        user_id: this.chat.room.loggedUser.id,
        is_delete: selected_conv.is_delete
      })
      .subscribe({
        next: (res: any) => {
          res = res.body;
          if (res) {
            this.chat.room.conv_list.forEach((cl: any, i: number) => {
              if (cl._id == selected_conv._id) {
                if (selected_conv.is_delete != "yes") {
                  cl.is_delete = "yes";
                  this.snackBar.open('Conversation Deleted..', 'close', {
                    duration: 3000
                  });
                } else {
                  cl.is_delete = '';
                  this.snackBar.open('Conversation remove from deleted..', 'close', {
                    duration: 3000
                  });
                }
                this.removeUserChat();
                this.chat.room.conv_list = this.chat.room.conv_list.filter((e: { _id: any; }) => e._id != selected_conv._id);
                this.cdr.detectChanges();
              }
            });
          }
        },
        error: (error) => {
          console.error('error: ', error);
          if (error.status == 403) {
            console.error(error);
            this.onLogout(1);
          }
          // Handle error, show error message, etc.
        }
      });
  }
  // Delete conversation end

  // onScrollUp
  loadMoreMsg() {
    if (!this.loadingMoreMsg) {
      this.loadingMoreMsg = true;
      this.cdr.detectChanges();
      // Your API call here
      this.getChatMsgByConv('more');
    }
  }
  // retrive more msg when scroll on top end

  // get messages by conversation start
  getChatMsgByConv(loadmore='') {
    let post_data={
      conv_id: this.chat.room.selectedRoomDetail.row._id,
      loadedMsg: this.loadedMessages,
      lastMsgDate:''
    }
    if(loadmore=='more'){
      if(this.chat.room.selectedRoomDetail.msgs.length>0){
        let col=this.chat.room.selectedRoomDetail.msgs[this.chat.room.selectedRoomDetail.msgs.length-1].collection;
        // console.log(col[col.length-1].full_send_datetime);
        post_data.lastMsgDate=col[col.length-1].full_send_datetime;
      }
    }
    this.chatService
      .getMsgByConversationById('/api/v1/get-msg-by-conv', post_data)
      .subscribe({
        next: (res: any) => {
          res = res.body;
          if (res) {
            if (res.data.length > 0) {
              // new aproach
              this.loadedMessages += res.data.length;
              // system log event like user add/remove from conversation
              if(res.event && res.event.length>0){
                // Combine the messages and system events arrays into one array
                let history = [...res.data, ...res.event];
                // Sort the combined array by 'send_datetime' (for messages) or 'timestamp' (for system events)
                // Sort history by date and time in descending order

                // Sorting function
                const sortedData = history.sort((a, b) => {
                  const dateA = new Date(a.send_datetime);
                  const dateB = new Date(b.send_datetime);
                  
                  // Sort in descending order
                  return dateB.getTime() - dateA.getTime();
                });
                
                // console.log('Sorted history:', sortedData);
                res.data=sortedData;
              }
              var groupedChat = this.processDateMsg(res.data); //convert standard format
              if (this.loadedMessages > 0) {
                this.getCurrentScrollPosition();
              }

              groupedChat.forEach((v, key) => {
                var fdateArray = this.chat.room.selectedRoomDetail.msgs.filter((d1: { date: any; }) => { return d1.date == v.date });
                if (fdateArray.length > 0) {
                  v.collection.forEach((e: any) => {
                    fdateArray[0].collection.unshift(e);
                  });
                } else {
                  this.chat.room.selectedRoomDetail.msgs.unshift(v);
                }
              });
              if (this.loadedMessages == 0) {
                this.scrollToBottom2();//scroll to bottom
                // this.checkIfScrollable();
              }else if (this.loadedMessages > 0) {
                this.resetToPrevScrollPosition();// reset to prev height
              }
            } else {
              // if (this.loadedMessages>0) {
              //   this.snackBar.open('you have reached..', 'close', {
              //     duration: 3000
              //   });
              // }
            }
          } else {
            console.log(res.message);
          }
          this.chat_conv_msg_list_loading = false;
          this.loadingMoreMsg = false;
          if(this.chat.room.selectedRoomDetail.msgs.length>0){
            this.currentActiveDate = this.chat.room.selectedRoomDetail.msgs[this.chat.room.selectedRoomDetail.msgs.length-1].date;
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.chat_conv_msg_list_loading = false;
          this.loadingMoreMsg = false;
          console.error('error: ', error);
          if (error.status == 403) {
            console.error(error);
            this.onLogout(1);
          }
          // Handle error, show error message, etc.
        }
      });
  }
  // get messages by conversation end


  // convert datatime
  timeDiff(time: any) {
    // console.log('timeDiff received time:', time); // DEBUG
    const now = new Date();
    // Parse time as today with format 'h:mm:ss a'
    const todayStr = format(now, 'yyyy-MM-dd');
    const formatString = 'yyyy-MM-dd h:mm:ss a';
    // console.log('timeDiff using format string:', formatString); // DEBUG
    try {
      const startTime = parse(todayStr + ' ' + time, formatString, new Date());
      const hours = differenceInHours(now, startTime);
      if (hours > 0) {
        return time;
      } else {
        return formatDistanceToNow(startTime, { addSuffix: true });
      }
    } catch (error) {
      console.error('Error parsing date in timeDiff:', error);
      console.error('time value was:', time);
      console.error('format string was:', formatString);
      throw error; // re-throw the error
    }
  }

  //change time to human format
  humanizeDate(created_at: any, currentTime: any = null) {
    if (created_at === 'just now') {
      return { timeline: 'Today', msgtime: 'just now' };
    }
    const now = currentTime ? new Date(currentTime) : new Date();
    const date = typeof created_at === 'string' ? parseISO(created_at) : new Date(created_at);
    if (isSameDay(date, now)) {
      return {
        timeline: 'Today',
        msgtime: this.timeDiff(format(date, 'h:mm:ss a'))
      };
    } else if (isSameDay(date, subDays(now, 1))) {
      return {
        timeline: 'Yesterday',
        msgtime: format(date, 'h:mm a')
      };
    } else if (isSameWeek(date, now)) {
        return {
        timeline: format(date, 'EEE, MMM d, yyyy'),
        msgtime: format(date, 'h:mm a')
      };
      } else {
        return {
        timeline: format(date, 'EEE, MMM d, yyyy'),
        msgtime: format(date, 'h:mm a')
      };
    }
  }

  // process message data start
  processDateMsg(list: any[]) {
    // this gives an object with dates as keys
    const groups = list.reduce((groups, game) => {
      const date = game.send_datetime ? game.send_datetime.split(' ')[0]:game.timestamp.split(' ')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(game);
      return groups;
    }, {});

    // Edit: to add it in the array format instead
    const groupArrays = Object.keys(groups).map((date) => {
      return {
        date,
        collection: groups[date]
      };
    });
    list = groupArrays;
    let currentTime: any = new Date();
    list.forEach((v, k) => {
      v.date = this.humanizeDate(v.date, currentTime).timeline;
      v.collection.forEach((v2: any, k2: any) => {
        v2.full_send_datetime = v2.send_datetime;
        v2.send_datetime = this.humanizeDate(v2.send_datetime, currentTime).msgtime;
      }),
      v.showUnreadDivider=false
    });
    return list;
  }
  // process message data end

  // fix scoll issue while scoll up for new message start
  getCurrentScrollPosition() {
    this.previousScrollHeightMinusTop = this.chatMsgList_element.nativeElement.scrollHeight - this.chatMsgList_element.nativeElement.scrollTop;
  }
  resetToPrevScrollPosition() {
    setTimeout(() => {
      var newHeigt = this.chatMsgList_element.nativeElement.scrollHeight - this.previousScrollHeightMinusTop;
      this.chatMsgList_element.nativeElement.scrollTop = newHeigt;
    }, 0);
  }
  // End fix scoll issue while scoll up for new message



  // chat reply message apply jump to the msg we repply start
  scrollToSection(sectionId: string) {
    // Assuming you have a reference ID (e.g., 'item3') passed dynamically
    const referenceId = sectionId; // Replace with your actual reference ID
    const targetItem = this.itemElements.find(item => item.nativeElement.id === referenceId);
    if (targetItem) {
      targetItem.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });

      this.chatMsgList_element.nativeElement.scrollTop = this.chatMsgList_element.nativeElement.scrollTop - 50;
      // Add the class 'highlight' to the native element
      targetItem.nativeElement.classList.add('highlight');
      setTimeout(() => {
        targetItem.nativeElement.classList.remove('highlight');
      }, 1000);
    }
  }
  // chat reply message apply jump to the msg we repply end

  // for sticker
  addSticker(stickerUrl: string) {
    this.sticker += `${stickerUrl}`;
    // send sticker
    this.sendMessage('', this.chat.room.loggedUser, []);
  }
  getInnerHtml(url: any) {
    return `<img src='${url}' width='200' alt='sticker'>`;
  }

  // close replay msg start
  removeRepply() {
    this.isReaplyActive = false;
    this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg = '';
    // this.msginputField.nativeElement.focus(); //focus on msg input
    this.child_EditorComponent.focusOnEditor();//focus on child msg input
    this.cdr.detectChanges();
  }
  // close replay msg end

  // reply message start
  replyMessage(message: any) {
    let newobj = {
      _id: message._id,
      from: message.from,
      message: message.message,
      full_send_datetime: message.full_send_datetime,
    }
    this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg = '';
    this.isReaplyActive = true;
    this.nsend_date = format(new Date(newobj.full_send_datetime), 'dd/MM/yyyy h:mm:ss a');
    this.chat.room.selectedRoomDetail.newMessage.collection.reply_msg = newobj;
    // this.msginputField.nativeElement.focus(); //focus on msg input
    this.child_EditorComponent.focusOnEditor();//focus on child msg input
    this.cdr.detectChanges();
  }
  // reply message end

  // bookmark messge start
  bookmark_msg(message: any) {
    this.bookmark_msg_parent.emit(message);
  }
  // bookmark messge end
  deleteMessage(selected_message: any, collection_date: any) {
    this.socketService.emit('delete_message', selected_message);
  }
  // on select emoji
  addEmoji(event: any) {
    this.child_EditorComponent.insertEmoji(event.emoji.native);
  }

  // toggle more option start
  toggleMore() {
    this.isMoreActive = !this.isMoreActive;
  }
  // toggle more option end


  // lazy-load child sticker component start 
  async loadStickerComponent() {
    if (this.stickerComponentRef) {
      console.log('Sticker component already created');
      return;
    }
    const { StickerPickerComponent } = await import('../sticker-picker/sticker-picker.component');

    if (!this.stickerPickerContainer) {
      console.error('stickerPickerContainer is undefined');
      return;
    }

    const childInjector = Injector.create({
      providers: [],
      parent: this.injector
    });

    this.stickerComponentRef = this.stickerPickerContainer.createComponent(StickerPickerComponent, {
      environmentInjector: this.environmentInjector,
      injector: childInjector
    });

    if (this.stickerComponentRef.instance) {
      this.stickerComponentRef.instance.stickerSelected.subscribe((event: any) => this.addSticker(event));
    } else {
      console.error('Component instance is undefined');
    }
  }
  // lazy-load child sticker component end 

  // message typeing indicator start
  typing: any;
  // typingMessage = '';
  private typingTimer: any;
  private typingDelay = 1000; // 1 second delay
  msgText=''; // for count no of text in quill editor

  onTyping(data: any) {
    const {event, msg,text,delta,justHtml}=data;
    
    // console.log('HTML Content:', justHtml);
    // Adjust the regex based on the pattern observed in the content
    let justHtml1 = justHtml.replace(`<select class="ql-ui" contenteditable="false"><option value="plain">Plain</option><option value="bash">Bash</option><option value="cpp">C++</option><option value="cs">C#</option><option value="css">CSS</option><option value="diff">Diff</option><option value="xml">HTML/XML</option><option value="java">Java</option><option value="javascript">JavaScript</option><option value="markdown">Markdown</option><option value="php">PHP</option><option value="python">Python</option><option value="ruby">Ruby</option><option value="sql">SQL</option></select>`, '');

    // Now justHtml is filtered and ready for storage
    // console.log('delta:', delta);
    // console.log('Filtered HTML Content:', justHtml1);
    if (event.key == 'Shift' || event.key == 'Enter' || event.key == 'Alt' || event.key == 'Tab' || event.key == 'CapsLock' || event.key == 'Control' || event.key == 'Meta'){
      if (event.key === 'Enter' && event.shiftKey) {
        // alert('Shift+Enter was pressed');
        // Your custom logic here
      }else if (event.key === 'Enter' && !this.isMobile) {
        // alert('Enter was pressed');
        this.sendMessage(this.message, this.chat.room.loggedUser, this.prev_files);
      }
      return;
    }
    this.message=justHtml1;
    this.msgText=text; // setting only text content
    this.cdr.detectChanges();
    if (!this.typing) {
      this.typing = true;
      this.cdr.detectChanges();
      const data = {
        loggedUser: this.chat.room.loggedUser,
        conv_participant: this.chat.room.selectedRoomDetail.row.participants,
        conv_id: this.chat.room.selectedRoomDetail.row._id,
        is_group: this.chat.room.selectedRoomDetail.row.is_group
      };
      this.socketService.emit('start_typing', data);
    }
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.doneTyping();
    }, this.typingDelay);
  }
  doneTyping() {
    this.typing = false;
    // this.typingMessage = '';
    this.cdr.detectChanges();
    const data = {
      loggedUser: this.chat.room.loggedUser,
      conv_participant: this.chat.room.selectedRoomDetail.row.participants,
      conv_id: this.chat.room.selectedRoomDetail.row._id,
      is_group: this.chat.room.selectedRoomDetail.row.is_group
    };
    this.socketService.emit('stop_typing', data);
  }
  // message typeing indicator end


  // get location
  latitude: number | undefined;
  longitude: number | undefined;
  shareLocation(): void {

    if (navigator.geolocation) {
      // navigator.geolocation.watchPosition((position)=>{
      // this.latitude = position.coords.latitude;
      // this.longitude = position.coords.longitude;
      const dialogRef = this.dialog.open(ShareLocationDialogComponent, {
        height: '500px',
        width: '600px',
        data: {
          // position: position,
          intData: this.chat,
          sendMessage: this.sendMessage.bind(this),
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        console.log(`Dialog result: ${result}`);
      });
      // },
      // (error)=>{
      //   console.log(error);
      // },{
      //   enableHighAccuracy:true,
      //   timeout:5000,
      //   maximumAge:0
      // });
    } else {
      console.log("No support for geolocation");
    }
  }


  // for contact dialog
  openContactPopup(message:any={}) {
    this.chat.room.selectedRoomDetail.newMessage.collection.forward_msg=null;
    this.cdr.detectChanges();
    if(message._id){
      let newobj = {
        _id: message._id,
        from: message.from,
        message: message.message,
        attachments: message.attachments,
        full_send_datetime: message.full_send_datetime,
      }
      this.chat.room.selectedRoomDetail.newMessage.collection.forward_msg = '';
      // this.isReaplyActive = true;
      this.nsend_date = format(new Date(newobj.full_send_datetime), 'dd/MM/yyyy h:mm:ss a');
      this.chat.room.selectedRoomDetail.newMessage.collection.forward_msg = newobj;
      // this.msginputField.nativeElement.focus(); //focus on msg input
      // this.child_EditorComponent.focusOnEditor();//focus on child msg input
      this.cdr.detectChanges();
    }
    this.openContactPopup_parent.emit(); //calling parent component method
  }

  // on keyup msg input
  msgInputKeyup(data: any) {
    const {event, msg,text,delta,justHtml}=data;
    this.message=justHtml;
    this.msgText=text;// setting only text content
    this.cdr.detectChanges();
    // alert(event.keyCode);
    // alert(event.key);
    // if (event.keyCode === 13) {
    //   // this.sendMessage(this.message, this.chat.room.loggedUser, this.prev_files);
    // }
  }

  // checking image exist
  checkImgExist(attachments:any){
    if(attachments.length>0){
      let isImgExist=attachments.filter((e: { mimetype: string; })=>{
        return ['video/mp4','image/jpeg','image/png'].includes(e.mimetype);
      })
      return isImgExist.length;
    }else{
      return 0;
    }
  }

  // voice message start
  showRecordArea=false;
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];
  recordedBlob:any='';
  private mediaStream!: MediaStream; // Store the media stream
  isRecording=false;
  isRecordingPause=false;
  audioUrl!: string;


  async startRecording() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.mediaStream);

    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
      this.audioUrl = URL.createObjectURL(audioBlob);
      this.recordedBlob=audioBlob;
      // this.sendAudioMessage(audioBlob); // Send the audio
      this.audioChunks = []; // Clear the chunks for the next recording
      this.cdr.detectChanges();
    };

    this.mediaRecorder.start();
    this.isRecording=true;
    this.isRecordingPause=false;
    this.cdr.detectChanges();
  }

  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isRecordingPause=true;
      this.cdr.detectChanges();
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaStream.getTracks().forEach(track => track.stop()); // Stop all tracks of the media stream
      this.isRecording=false;
      this.cdr.detectChanges();
    }
  }
  blobToFile(blob:Blob, fileName:string) {
    return new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now() // optional
    });
  }
  
  attachAudio(){
    const audioFile = this.blobToFile(this.recordedBlob, 'voice-message.wav');
    let josn= {
      name: audioFile.name,
      originalname:audioFile.name,
      lastModified: audioFile.lastModified,
      webkitRelativePath: audioFile.webkitRelativePath,
      size: audioFile.size,
      type: audioFile.type,
      mimetype: audioFile.type,
      url:this.audioUrl,
      original:audioFile
      // lastModifiedDate: audioFile?.lastModifiedDate,
    }
    this.isAttachedPrevActive = true;
    this.isMoreActive = false;
    this.showRecordArea=false;
    this.prev_files.push(josn);
    this.cdr.detectChanges();
    this.deleteRecording();
  }

  deleteRecording() {
    this.audioUrl = ''; // Clear the audio URL
    this.audioChunks = []; // Clear the audio chunks
    this.recordedBlob='';// clear audio blob
    this.cdr.detectChanges();
  }
  // getting user status class end

  // checking profile image privacy status for display image 
  checkPic_privacy(user: { profilePhotoVisibility: string; }){
    return this.chatService.checkPic_privacy(user,this.chat.room.loggedUser);
  }

  // sticke date on middle chat box start
  @ViewChild('scrollWrapper', { static: false }) scrollWrapper!: ElementRef;
  currentActiveDate!: any;
  ngAfterViewInit(): void {
     // Listen for the scroll event on the specific container
     this.scrollWrapper.nativeElement.addEventListener('scroll', this.onScroll.bind(this));
     this.isMobile=this.chatService.isMobile();
     this.applyHighlighting();
    //  console.log(this.chat.room.selectedRoomDetail.msgs);
  }
  applyHighlighting() {
    // Apply highlight.js to all code blocks within the component
    const codeBlocks = this.el.nativeElement.querySelectorAll('pre code');
    codeBlocks.forEach((block: HTMLElement) => {
       (window as any).hljs.highlightBlock(block);
    });
  }
  onScroll(event: any): void {
    const target = event.target;
    const atBottom = target.scrollHeight - target.scrollTop === target.clientHeight;

    if (atBottom) {
      this.isScrollable=false;
      this.cdr.detectChanges();
      // Add your code to handle reaching the bottom here.
    }else{
      if(!this.isScrollable){this.isScrollable=true;this.cdr.detectChanges();}
    }
  }

  isActive(date: Date): boolean {
    return date === this.currentActiveDate;
  }
  // sticke date on middle chat box end

  // msg with the approx same time should not again show time start
  shouldShowNewGroup(currentMsg: {
      eventType: any;
      from: any; full_send_datetime: string | number | Date; sender: any; 
  }, previousMsg: {
    eventType: any;
    from: any; full_send_datetime: string | number | Date; sender: any; 
  }) {
    const timeDifference = new Date(currentMsg.full_send_datetime).getTime() - new Date(previousMsg.full_send_datetime).getTime();
    // Check if the time difference is more than 5 minutes (300,000 milliseconds)
    if(!currentMsg.eventType && !previousMsg.eventType){
      return currentMsg.from._id !== previousMsg.from._id || timeDifference > 300000;
    }else{
      return true;
    }
  }
  
  formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // msg with the approx same time should not again show time end

  // get attached file icon
  getIconForFile(fileName: string): string {
    return this.chatService.getFileIcon(fileName);
  }
  // check allowed file type 
  checkAllowedExtension(attach:any){
    return this.chatService.AllowedExtension(attach.originalname);
    // attach.mimetype=="application/pdf" || attach.mimetype=="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
  
  // Method to open Google Maps with the specified latitude and longitude
  openInGoogleMaps(location:any): void {
    //location : [latitude, longitude] 
    console.log(location);
    if(location.length>0){
      const googleMapsUrl = `https://www.google.com/maps?q=${location[0]},${location[1]}`;
      window.open(googleMapsUrl, '_blank');
    }
  }

  getSanitizedMessage(htmlContent: string): SafeHtml {
    htmlContent = htmlContent.replace(/  /g, '&nbsp;&nbsp;');
    return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
  }

  // Method to get plain text from HTML content
  getPlainTextFromHtml(htmlContent: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  copyMessage(msg: string): void {
    const plainText = this.getPlainTextFromHtml(msg);
    // Use the native `navigator.clipboard.writeText` to copy plain text
    navigator.clipboard.writeText(plainText).then(() => {
      console.log('Copied to clipboard');
      
      this.snackBar.open('Copied to clipboard..', 'close', {
        duration: 3000
      });
    });
  }

  muteConversation(muted1:boolean){
    let muted=!muted1;
    this.chat.room.selectedRoomDetail.row.is_muted=muted;
    this.cdr.detectChanges();
    this.chatService.POST('/api/v1/conversation/mute', { conv_id: this.chat.room.selectedRoomId, user_id: this.chat.room.loggedUser.id, is_muted: muted })
    .subscribe({
      next: (res: any) => {
        res = res.body;
        if (res) {
          this.chat.room.conv_list.forEach((cl: any, i: number) => {
            if (cl._id == this.chat.room.selectedRoomId) {
              if (muted) {
                cl.is_muted = true;
                this.cdr.detectChanges();
                this.snackBar.open('Conversation is muted..', 'open', {
                  duration: 3000
                })
                  .onAction().subscribe(() => {
                    // this.get_archive_data();
                    // this.is_archive_open = true; //flag for archive
                  });
              } else {
                cl.is_muted = false;
                this.cdr.detectChanges();
                this.snackBar.open('Conversation is unmuted..', 'close', {
                  duration: 3000
                });
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('error: ', error);
        if (error.status == 403) {
          console.error(error);
          this.onLogout(1);
        }
        // Handle error, show error message, etc.
      }
    });
  }

  markAsUnRead(msg_id:string,date:string){
    this.chatService.PUT('/api/v1/conversation/markUnread', { conv_id: this.chat.room.selectedRoomId, user_id: this.chat.room.loggedUser.id,msg_id:msg_id })
    .subscribe({
      next: (res: any) => {
        // console.log(msg_id);
        // console.log(date);
        // res = res.body;
        if (res.status==200) {
          this.getUnreadMsgCount_parent.emit();
          this.chat.room.selectedRoomDetail.msgs.forEach((v: { date: string; collection: any[]; }) => {
            const fdateArray = this.chat.room.selectedRoomDetail.msgs.filter((d1: { date: any; }) => { return d1.date == v.date });
            if (v.date===date) {
              v.collection.forEach((e: any) => {
                if(e._id===msg_id){
                  // console.log(msg_id);
                  if(e.readBy.length>0){
                    e.readBy=e.readBy.filter((e: { _id: any; }) => {e._id!==this.chat.room.loggedUser.id});
                    this.cdr.detectChanges();
                  }
                }
              });
            }
          });
        }
        this.snackBar.open(res.body.message, 'close', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('error: ', error);
        if (error.status == 403) {
          console.error(error);
          this.onLogout(1);
        }
        // Handle error, show error message, etc.
      }
    });
  }
  
  // Method to find the first unread message index for each collection
  getFirstUnreadIndex(collection: any): number | null {
    // Convert JSON to array if necessary
    const collectionArray = Array.isArray(collection) ? collection : Object.values(collection);
    
    if (!Array.isArray(collectionArray)) {
      // console.error('Expected an array or JSON object, but received:', collection);
      return null;
    }
  
    // Find the first unread message
    return collectionArray.findIndex((msg) => {
      // Check if 'readBy' exists and is an array
      if (Array.isArray(msg.readBy)) {
        return !msg.readBy.some((reader: { _id: any }) => reader._id === this.chat.room.loggedUser.id);
      } else {
        // If 'readBy' is undefined or not an array, treat this message as unread
        return ''; // This considers the message as unread since there's no 'readBy' data
      }
    });
  }
  
  
  
  // Check if the content has enough height to be scrollable
  // checkIfScrollable() {
    // setTimeout(() => {
    //   const container = this.scrollWrapper.nativeElement;
    //   this.isScrollable = container.scrollHeight > container.clientHeight;
    //   this.cdr.detectChanges();
    // },0);
  // }

  // Scroll to the bottom of the container
  // scrollToBottom() {
  //   const container = this.scrollWrapper.nativeElement;
  //   container.scrollTop = container.scrollHeight;
  //   this.cdr.detectChanges();
  // }

  // private sendAudioMessage(audioBlob: Blob,message:any, loggedUser:any, tempObj:any) {
  //   console.log('sendAudioMessage calling');
  //   this.final_uploaded_file = [];
  //   const audioFile = this.blobToFile(audioBlob, 'voice-message.wav');
  //   console.log(audioFile);
  //   this.chatService.uploadFile(audioFile, '/api/v1/upload_chat_file')
  //     .subscribe((event) => {
  //       if (event.type === HttpEventType.UploadProgress) {
  //         let progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
  //         console.log(progress);
  //         // filteredAttachment[_index].progress = progress;
  //         // console.log(filteredAttachment[_index]);

  //       } else if (event instanceof HttpResponse) {
  //         console.log(event.body);
  //         this.final_uploaded_file.push(event.body.data);
  //         let destination = event.body.data.destination;
  //         let path = event.body.data.path;
  //         this.sendMsgFinal(message, loggedUser, tempObj, this.final_uploaded_file);
  //         // resolve(event);
  //       }
  //     }, error => {
  //       console.error('Error uploading file', error);
  //       // reject(error);
  //     });
  // }
  // voice message end

}
