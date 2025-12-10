import { AfterViewInit, ChangeDetectorRef, Component, ComponentRef, ElementRef, EnvironmentInjector, Injector, OnInit, QueryList, Renderer2, ViewChild, ViewChildren, ViewContainerRef, inject, signal,NgZone } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
// import { CustomSlice } from '../../custom.slice.pipe';
import { AsyncPipe, NgClass, NgFor, NgIf, NgOptimizedImage } from '@angular/common';
// for material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIcon } from "@angular/material/icon";
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
// services
import { ColorSchemeService } from '../../services/color-scheme.service';
import { SocketService } from '../../services/socket.service';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { AvatarColorService } from '../../services/avatar-color.service';
// pipes
import { FirstCharsPipe } from '../../pipes/first-chars.pipe';
import { SafeImageUrlPipe } from '../../pipes/safe-image-url.pipe';

import { FormsModule } from '@angular/forms';
import { format, parse, parseISO, isSameDay, isSameWeek, isSameMonth, isSameYear, subDays, differenceInHours, differenceInSeconds, formatDistanceToNow } from 'date-fns';
// child component
import { UnreadNotificationComponent } from './unread-notification/unread-notification.component';
import { ConversationListComponent } from "./conversation-list/conversation-list.component";
// for sound
import { Howl } from 'howler';
import { CallService } from '../../services/call.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
  imports: [MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule, RouterModule, NgClass, NgFor, NgIf, MatDialogModule, FormsModule, FirstCharsPipe, MatProgressSpinnerModule, MatSidenavModule, UnreadNotificationComponent, MatListModule, NgOptimizedImage, ConversationListComponent,SafeImageUrlPipe],
  host: { '[style.--bs-primary-rgb]': `scssVar_bs_primary_rgb()` },
})

export class ChatComponent implements OnInit, AfterViewInit {
  @ViewChild('chatMsgList_element') chatMsgList_element!: ElementRef;
  @ViewChildren('item') itemElements!: QueryList<ElementRef>;
  @ViewChild(UnreadNotificationComponent) unreadChildComp!: UnreadNotificationComponent;
  // for load child sticker compoment
  @ViewChild('user_chat') userChatElement!: ElementRef;

  @ViewChild('settingTabContainer', { read: ViewContainerRef }) setting_container!: ViewContainerRef;  // lazy loading setting tab
  @ViewChild('profileTabContainer', { read: ViewContainerRef }) profile_container!: ViewContainerRef;  // lazy loading profile tab
  @ViewChild('callListTabContainer', { read: ViewContainerRef }) call_list_container!: ViewContainerRef;  // lazy loading call list tab
  @ViewChild('bookmarkListTabContainer', { read: ViewContainerRef }) bookmark_list_container!: ViewContainerRef;  // lazy loading bookmark list tab
  @ViewChild('contactsListTabContainer', { read: ViewContainerRef }) contacts_container!: ViewContainerRef; // lazy loading contact list tab
  private contactContainerRef!: ComponentRef<any>; //for lazy load chat content
  // for lazy load chat conent
  @ViewChild('chatContentContainer', { read: ViewContainerRef }) chatContent_container!: ViewContainerRef;
  private chatContentRef!: ComponentRef<any>; //for lazy load chat content
  @ViewChild('chatDetailsidebarContainer', { read: ViewContainerRef }) chat_detail_sidebar_container!: ViewContainerRef;
  private chatSidebarDetailRef!: ComponentRef<any>; //for lazy load chat content
  isParentLoaded = false;
  search: string;
  public is_archive_open = false;
  chat_conv_list_loading: boolean | undefined;
  chat_conv_msg_list_loading: boolean | undefined;
  private darkThemeIcon: string = 'nightlight_round';
  private lightThemeIcon: string = 'wb_sunny';
  public currentTHem: any;
  public currentTHemColor: any;
  public currentTheme_image: any;
  public lightDarkToggleIcon: any;
  public lightDarkToggleLabel: any;
  public chat: any = {};
  public ActiveTab: string = 'pills-chat'; // def active tab
  public all_conn=[];
  serverPath: string;
  onlineUser: any;
  opened: boolean | undefined;//for sidenav
  @ViewChild('drawer') drawer!: MatSidenav;
  
  conversationsCache = new Map<string, any>(); // Cache for conversations
  sound: any;skeleton=[1,2,3,4];
  private chatService = inject(ChatService);
  private socketService = inject(SocketService);
  private colorSvc = inject(AvatarColorService);
  prev_profile: any = []; //for profile attach
  constructor(private authService: AuthService,private router: Router,public dialog: MatDialog,private colorSchemeService: ColorSchemeService,private snackBar: MatSnackBar,private injector: Injector,private environmentInjector: EnvironmentInjector,private renderer: Renderer2,private cdr: ChangeDetectorRef,private ngZone: NgZone,private callService: CallService) {
    // Load Color Scheme
    this.colorSchemeService.load().subscribe(() => {
      this.currentTHem = this.colorSchemeService.currentActive();
      this.currentTHemColor = this.colorSchemeService.currentTheme_color(); //get current theme color
      this.changeThemeColor(this.currentTHemColor, true); // manually set scss variable value
      this.updateThemeIcon(); // update color schema icon light/dark
      this.currentTheme_image = this.colorSchemeService.currentThemeImage(); //get current theme color
      if (this.currentTheme_image != '') {
        this.preloadPatternImage(this.currentTheme_image);
        this.renderer.setStyle(this.userChatElement.nativeElement, 'background-image', 'url("/assets/media/' + this.currentTheme_image + '")');
      }
    })
    this.search = '';
    this.serverPath = this.chatService.serverPath;
    this.sound = new Howl({src: ['assets/media/message-notification-190034.mp3'],html5: true});
    this.initializeNetworkListeners(); //for user internet online/offline track
    window.addEventListener('resize', this.checkLayout.bind(this));
  }
  preloadPatternImage(filename: string) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = `/assets/media/${filename}`;
    link.setAttribute('fetchpriority', 'high');
    document.head.appendChild(link);
  }
  private checkLayout() {
    this.chat.isMobile = window.innerWidth < 768; // Adjust the breakpoint as needed
    this.cdr.detectChanges();
  }
  private initializeNetworkListeners() {
    // Check initial online status when service initializes
    // this.updateStatus(navigator.onLine);

    // Listen to online and offline events
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));
  }

  private updateStatus(isOnline: boolean) {
    this.ngZone.run(() => {
      if (isOnline) {
        this.socketService.onConnection();// Reconnect if online
        this.chat.room.loggedUser.is_online = true;
        this.cdr.detectChanges();
        this.snackBar.open('Your are online..', 'close', {duration: 0});
        this.fetchConvList();
      } else {
        this.socketService.disconnect(); //disconnect socket
        this.chat.room.loggedUser.is_online = false;
        this.cdr.detectChanges();
        this.snackBar.open('Your are offline..', 'close', {duration: 0});
      }
    });
  }
  // init chat var
  init() {
    this.chat = {
      room: {
        conv_list: [],
        loggedUser: {
          id: null,
          name: null,
          email: null,
          profile_pic: null,
          status: '',
          statusMsg: null,
          is_online: false,
          bgcolor: '',
        },
        selectedRoomId: null,
        selectedRoomDetail: {
          msgs: [],
          newMessage: {
            date: 'Today',
            collection: {
              message_id: null,
              from_id: null,
              to_id: null,
              message_text: '',
              attachments: '',
              send_datetime: '',
              conversation_id: null,
              chat_type: null,
              is_edit: 0,
              is_delete: 0,
              deleted_by: null,
              user_name: '',
              last_name: '',
              profile_pic: '',
              full_send_datetime: '',
            },
          },
          row: {},
        },
      },
      my_socket: {},
      unread: {
        total_unread_count: 0,
      },
      conv_typing_data: [],
      conv_typingUsers: [],
      isMobile : window.innerWidth < 768 // Adjust the breakpoint as needed
    };
  }
  localZone: any;
  // faker: any;
  async ngOnInit(): Promise<void> {
    this.init();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.localZone = timeZone; // e.g., "Asia/Calcutta"
    if (!this.socketService.getSocketId()) {
      this.socketService.onConnection(); //create a connection to socket
    }
    // await import('@faker-js/faker').then((module)=>{
      // this.faker = module.faker;
      this.fetchConvList();
      this.loadChatContentComponent();// for lazy load chat content
      this.isParentLoaded = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.loadSettingComponent(); //for lazy load setting tab
      }, 1000);
    // });
    this.initSocketListner(); // initialize all socket listnes
    // watch if any localstorage value is updated start
    window.addEventListener('storage', (event) => {
      if (event.key === 'user_id' || event.key === 'auth_token') {
        // console.log('localStorage key updated:', event.newValue);
        this.chatService.GET('/api/v1/get_theme/')
        .subscribe({
          next: (res: any) => {
            // console.log(res);
          },
          error: (error) => {
            // console.log(error);
            if (error.status == 403) {
              // console.error(error);
              this.onLogout(1);
            }
          },
        });
      }
    });
    // watch if any localstorage value is updated end

    // await this.loadCalllistComponent(); //for lazy load calllist tab
    // await this.loadBookmarklistComponent(); //for lazy load calllist tab
  }
  // lazy loading chat content start
  async loadChatContentComponent() {
    import('./chat-content/chat-content.component').then(({ ChatContentComponent }) => {
      this.chatContent_container.clear();
      this.chatContentRef = this.chatContent_container.createComponent(ChatContentComponent, { injector: this.injector });
      this.chatContentRef.instance.chat = this.chat;
      this.chatContentRef.instance.opened = this.opened;
      this.chatContentRef.instance.drawer = this.drawer;
      this.chatContentRef.instance.userChatElement = this.userChatElement;
      this.chatContentRef.instance.ActiveTab = this.ActiveTab;
      this.chatContentRef.instance.archive_conv_parent.subscribe((data: any) => this.archive_conv(data));
      this.chatContentRef.instance.removeUserChat_parent.subscribe(() => this.removeUserChat());
      this.chatContentRef.instance.bookmark_msg_parent.subscribe((data: any) => this.bookmark_msg(data));
      this.chatContentRef.instance.openContactPopup_parent.subscribe(() => this.openContactPopup());
      this.chatContentRef.instance.child_get_sidebardAttachment.subscribe(() => this.get_sidebardAttachment());
      this.chatContentRef.instance.markConvAsRead_parent.subscribe((data: any) => this.markConvAsRead_child(data));
      this.chatContentRef.instance.getUnreadMsgCount_parent.subscribe((data: any) => this.getUnreadMsgCount());
    });
  }
  // lazy loading chat content end

  // lazy loading chat sidebar start
  async loadChatDetailSidebarComponent() {
    import('./chat-detail-sidebar/chat-detail-sidebar.component').then(({ ChatDetailSidebarComponent }) => {
      this.chat_detail_sidebar_container.clear();
      this.chatSidebarDetailRef = this.chat_detail_sidebar_container.createComponent(ChatDetailSidebarComponent, { injector: this.injector });
      this.chatSidebarDetailRef.instance.drawer = this.drawer;
      this.chatSidebarDetailRef.instance.chat = this.chat;
      this.chatSidebarDetailRef.instance.selectedConv = this.chat.room.selectedRoomDetail.row;
      this.chatSidebarDetailRef.instance.parentArchiveConv.subscribe((data: any) => this.archive_conv(data));
      this.chatSidebarDetailRef.instance.parentConfirmDelete.subscribe(() => this.childConfirmDelete());
      this.chatSidebarDetailRef.instance.parent_addUserTOConv.subscribe((data: any) => this.addUserTOConv(data));
      this.chatSidebarDetailRef.instance.parent_openCall_dialog.subscribe((data: any) => this.child_openCall_dialog(data));
      this.chatSidebarDetailRef.instance.muteConversationParent.subscribe((data: any) => this.chatContentRef.instance.muteConversation(data));
      this.cdr.detectChanges();
    });
  }
  // lazy loading chat sidebar end

  // open audio call dialog from chat component
  child_openCall_dialog(data:any){
    this.chatContentRef.instance.openCall_dialog(data); //call child component (chat content) method   
  }

  addUserTOConv(data: any){
    // console.log('addUserTOConv');
    // console.log(data);
    this.chat.room.selectedRoomDetail.row.participants=data;
    this.cdr.detectChanges();
  }

  ngAfterViewInit() {
    // this.initSocketListner(); // initialize all socket listnes
    
    // fetch all contact for contact list    
    this.getAllContacts();
  }

  initSocketListner(){
    this.socketService.on('addSocket_res', (data: any) => {
      this.chat.room.loggedUser.status = data.status;
      this.chat.room.loggedUser.is_online = data.is_online;
      this.cdr.detectChanges();
    })

    this.socketService.on('msg_send_res_self', (data: any) => {
      // checking if its temporary Conversation start
      console.log('msg_send_res_self calling');
      if(data.is_conv_temp){
        console.log(data);
        console.log(this.chat.room.conv_list);
        // updating the temporary conversation id
        this.chat.room.conv_list.forEach((cl: any, i: number) => {
          if (cl._id == data.temp_conversation_id) {
            cl._id = data.conversation_id;
            cl.is_conv_temp=false;
            this.cdr.detectChanges();
            console.log('updated conversation');
            console.log(cl);
          }
        });
        if (this.chat.room.selectedRoomId === data.temp_conversation_id) {
          this.chat.room.selectedRoomId=data.conversation_id;
          this.cdr.detectChanges();
        }
      }

      let currentTime: any = new Date();
      const collection_date = this.humanizeDate(
        data.full_send_datetime,
        currentTime
      ).timeline;
      if (this.chat.room.selectedRoomId === data.conversation_id) {
        this.chat.room.selectedRoomDetail.msgs.forEach((v: { collection(collection: any): unknown; date: any }) => {
            if (v.date == collection_date) {
              let filterData: any = v.collection;
              filterData.forEach((v1: {attachments: any;is_send: number;message_id: any;_id: any;temp_id: any;conversation_id: any;}) => {
                  if (v1.temp_id == data.temp_id) {
                    v1._id = data._id;
                    v1.message_id = data._id;
                    v1.conversation_id = data.conversation_id;
                    v1.attachments = data.attachments;
                    v1.is_send = 1;
                    this.cdr.detectChanges();
                  }
                }
              );
            }
          }
        );
      }
      // updating last msg datetime(utc) to the conversation
      this.chat.room.conv_list.forEach((cl: any, i: number) => {
        if (cl._id == data.conversation_id) {
          cl.last_msg_date = data.full_send_datetime;
        }
      });

      // If a message was forwarded, update the conversation list preview
      if (data.forwarded) {
        this.setLastMsgConv(data.forward_snapshot.text, {
          conversation_id: data.conversation_id,
          full_send_datetime: data.full_send_datetime,
          attachments: data.attachments,
          sent_by_u: true,
          fromUser: data.fromUser2,
          from: data.from2,
          forwarded: data.forwarded,
          forward_snapshot: data.forward_snapshot
        });
      }
    });
    // get msg delivered notification from reciever side
    this.socketService.on('message-delivered', (data: any) => {
      let currentTime: any = new Date();
      const timeline = this.humanizeDate(
        data.full_send_datetime,
        currentTime
      ).timeline;
      this.chat.room.selectedRoomDetail.msgs.forEach((value: { date: any; collection: { _id: any }[] }, key: string | number) => {
        if (value.date == timeline) {
          value.collection.forEach(
            (value2: { _id: any }, key2: any) => {
              if (value2._id == data._id) {
                this.chat.room.selectedRoomDetail.msgs[key].collection[key2].deliveredTo = data.deliveredTo;
                this.cdr.detectChanges();
              }
            }
          );
        }
      }
      );
    });
    // rec message from other side
    this.socketService.on('rec_msg', (data: any) => {
      if (this.chat.room.selectedRoomId === data.conversation_id) {
        let currentTime = new Date();
        if (this.chat.room.loggedUser.id == data.sendFrom.id) {
        } else {
          data.from = data.sendFrom;
          if (data.from.id != this.chat.room.loggedUser.id) {
            data.from.isme = 'no';
          }
          var data2 = {
            message_id: data.msg_id,
            _id: data._id,
            conversation_id: data.conversation_id,
            from: data.from,
            profile_pic: data.profile_pic,
            to_id: data.to,
            message: data.message,
            sticker: '',
            attachments: data.attachments,
            location: data.location ? data.location : '',
            // "send_datetime": humanizeDate(data.date ? data.date:data.send_datetime, currentTime).msgtime,
            send_datetime: 'just now',
            user_name: data.user_name,
            last_name: data.last_name,
            full_send_datetime: data.date ? data.date : data.full_send_datetime,
            is_edit: 0,
            is_delete: 0,
            deleted_by: '',
            reply_to: null,
            deliveredTo: data.deliveredTo,
            readBy: data.readBy,
            forwarded: data.forwarded,
            forward_snapshot: data.forward_snapshot,
          };
          if (data.reply_to) {
            data2.reply_to = data.reply_to;
          }
          if (data.sticker) {
            data2.sticker = data.sticker;
          }

          // set in today group data
          var fToday = this.chat.room.selectedRoomDetail.msgs.filter(
            (e: { date: any }) => {
              return e.date == 'Today';
            }
          );
          if (fToday.length == 0) {
            this.chat.room.selectedRoomDetail.msgs.push({
              date: 'Today',
              collection: [data2],
            });
          } else {
            fToday[fToday.length - 1].collection.push(data2);
          }
          // End set in today group data
          this.chatContentRef.instance.scrollToBottom2(); //scroll to bottom
          // if(this.chatContentComponentRef){this.chatContentComponentRef.instance.scrollToBottom2(); //scroll to bottom}
          this.markConvAsRead(this.chat.room.selectedRoomDetail.row, 'on_rec_msg', data);
          // adding to recent chat
        }
      } else {
        this.unreadChildComp.getUnreadMessageCount(); // call fetch unread message count from child component
      }
      // checking conv is muted or not
      const recConv=this.chat.room.conv_list.filter((e: any) => { return e._id == data.conversation_id });
      if(!recConv[0].is_muted){
        this.sound.play(); //play sound
      }
      // set last message and date in conv list
      this.setLastMsgConv(data.message, { conversation_id: data.conversation_id, full_send_datetime: data.full_send_datetime, attachments: data.attachments,fromUser:data.fromUser2, from:data.from2,forwarded: data.forwarded,forward_snapshot: data.forward_snapshot,  });
      let md = {
        _id: data._id,
        from: data.sendFrom,
        to: data.to,
        chat_type: data.chat_type,
        full_send_datetime: data.full_send_datetime,
      };
      this.socketService.emit('message-delivered', md); // update msg delivered status to the sender
      this.cdr.detectChanges();
      // check if conversation not exist
      if (this.chat.room.selectedRoomId !== data.conversation_id) {
        if (this.chat.room.conv_list.filter((e: any) => { return e._id == data.conversation_id }).length == 0) {
          this.get_conv_list_by_id(data.conversation_id);
          this.cdr.detectChanges();
        }
      }
    });
    // delete res from server
    this.socketService.on('rec_del_msg', (data: any) => {
      let currentTime: any = new Date();
      const collection_date = this.humanizeDate(data.full_send_datetime,currentTime).timeline;
      if (this.chat.room.selectedRoomId === data.conversation_id._id || this.chat.room.selectedRoomId === data.conversation_id) {
        this.chat.room.selectedRoomDetail.msgs.forEach((v: { collection(collection: any): unknown; date: any }) => {
            if (v.date == collection_date) {
              let filterData: any = v.collection;
              v.collection = filterData.filter((msg: { _id: any }) => {
                return msg._id != data._id;
              });
            }
          }
        );
      }
      this.cdr.detectChanges();
    });
    // rec del message

    // update online user start
    this.socketService.on('onlineUsers', (data: any) => {
      const {users,frm_user_id}=data;
      this.onlineUser = users;
      this.cdr.detectChanges();
      if (this.chat.room.conv_list.length > 0) {
        setTimeout(() => {
          this.updateOnlineOfflnie(frm_user_id);
        }, 0);
      }
    });
    // update online user end

    // when read all the unred msgs from conv list by recipinent, then get the notification from there Start
    this.socketService.on('markConvAsRead_res', (conv_item: any, recipient_user: any) => {
      if (recipient_user.name) { recipient_user.fullName = recipient_user.name }

      if (conv_item._id == this.chat.room.selectedRoomId) {
        // if(conv_item.is_group){
        this.chat.room.selectedRoomDetail.msgs.forEach((v1: any, k1: any) => {
          v1.collection.forEach((v2: any, k2: any) => {
            if (this.chat.room.loggedUser.id == (v2.from.id || v2.from._id)) {
              let isInArray = v2.readBy.some((item: { _id: any; }) => item._id === recipient_user._id);
              if (!isInArray) {
                this.chat.room.selectedRoomDetail.msgs[k1].collection[k2].readBy.push(recipient_user);
                this.cdr.detectChanges();
              }
            }
          })
        });
        // }
      } else {
        // update readby by in if user(recipent) read msg for single chat conv 
        this.chat.room.conv_list.forEach((cl: any, i: number) => {
          if (cl._id == conv_item._id) {
            if (cl.is_group == false) {
              cl.last_msg_row.readBy.push(recipient_user);
              this.cdr.detectChanges();
            }
          }
        });
      }
    });
    // when read all the unred msgs from conv list by recipinent, then get the notification from there End

    // user status update res from other user start
    this.socketService.on('user_status_change_res', (data: any) => {
      this.chat.room.conv_list.forEach((value: { participants: any; is_online: string; is_group: number; sender_user_id: any; chatUserdetail: any; }) => {
        // for single user
        if (!value.is_group && this.onlineUser) {
          value.participants.forEach((v: { status: string; _id: null | undefined; isme: string; }) => {
            if (v._id != null && v._id != undefined && v.isme == 'no' && this.onlineUser.indexOf(v._id) != -1 && v._id == data._id) {
              v.status = data.status;
            }
          });
        }
      });
      this.cdr.detectChanges();
    })
    // user status update res from other user end

    // audio call service notification
    this.socketService.on("call_notification", (data: any) => {
      // TODO => dispatch an action to add this in call_queue
      if (data.call_type == "audio") {
        let dialogRef;
        // Add groupName for group calls
        let groupName = '';
        if (data.is_group) {
          // Try to get group name from conversation list
          const conv = this.chat.room.conv_list.find((c: any) => c._id === data.conversation_id);
          groupName = data.groupName || conv?.groupName || conv?.fullName || '';
        }
        import('./audio-call-dialog2/audio-call-dialog2.component').then(({ AudioCallDialog2Component }) => {
          dialogRef = this.dialog.open(AudioCallDialog2Component, {
            height: '500px',
            width: '600px',
            data: {
              intData: this.chat,
              audioCall_detail: { ...data, groupName },
              incoming: true
            },
            disableClose: true
          });
          dialogRef.afterClosed().subscribe((result) => {});
        });
      } else {
        let dialogRef;
        import('./video-call-dialog2/video-call-dialog2.component').then(({ VideoCallDialog2Component }) => {
          dialogRef = this.dialog.open(VideoCallDialog2Component, {
            height: '500px',
            width: '500px',
            data: {
              intData: this.chat,
              videoCall_detail: data,
              incoming: true
            },
            disableClose: true
          });
          dialogRef.afterClosed().subscribe((result) => {});
        });
      }
    });

    this.socketService.on("start_typing_rec", (data: any) => {
      const { from, to, conv_id, is_group } = data;
      this.chat.conv_typing_data[conv_id] = data;

      if (this.chat.conv_typingUsers[conv_id] === undefined) {
        this.chat.conv_typingUsers[conv_id] = [];
      }
      if (!this.chat.conv_typingUsers[conv_id].includes(from.name)) {
        this.chat.conv_typingUsers[conv_id].push(from.name);
      }
      this.cdr.detectChanges();
    });
    this.socketService.on("stop_typing_rec", (data: any) => {
      const { from, to, conv_id, is_group } = data;
      setTimeout(() => {
        this.chat.conv_typing_data = this.chat.conv_typing_data.filter((e: any) => e != conv_id)
        this.chat.conv_typingUsers[conv_id] = this.chat.conv_typingUsers[conv_id].filter((u: any) => u !== from.name);
        this.cdr.detectChanges();
      }, 20);
    });
    
    this.socketService.on("notify_conv_user_add_remove_rec", (data: any) => {
      const { participants, conv_id,sender } = data;
      // console.log(data);
      if(sender!=this.chat.room.loggedUser.id){
        // alert('recieve notfication of user added to conversation');
        this.get_conv_list_by_id(conv_id);
      }
    });
    this.socketService.on('new_friend_request',(res: any)=>{
      // console.log('new_friend_request response from server side');
      // console.log(res.data);
      // this.contact_req.push(res.data);
      this.chat.unread.total_unread_count+=1;
      this.cdr.detectChanges();
      this.snackBar.open(res.message, 'close', {
        duration: 5000
      });
    });
    this.socketService.on('request_accepted',(res: {
      data: never; message: string;})=>{
      // console.log(res);
      this.snackBar.open(res.message, 'close', {
        duration: 5000
      });
      if(res.data){
        this.all_conn.push(res.data);
        this.all_grp_contacts = this.groupContactsByFirstChar(this.all_conn);
        this.contactContainerRef.instance.updateContact(this.all_grp_contacts); //calling child content method
        this.chat.unread.total_unread_count+=1;
        this.cdr.detectChanges();
      }
    })
    
    // profile image visibilty update when your contact user update their privacy then get this call start
    this.socketService.onProfilePhotoUpdate().subscribe((data: any) => {
      // for chat tab
      if(this.ActiveTab=="pills-chat"){
        const { user_id, visibility } = data;
        if (this.chat.room.conv_list.length > 0) {
          this.chat.room.conv_list.forEach((value: { participants: any; profilePhotoVisibility: string; is_group: number; }) => {
            // for single user
            if (!value.is_group) {
              value.participants.forEach((v: { profilePhotoVisibility: string; _id: null | undefined; isme: string; }) => {
                if (v._id == user_id && v.isme == 'no') {
                  v.profilePhotoVisibility = visibility;
                  this.cdr.detectChanges();
                }
              });
            }
          });
        }
        if (this.chat.room.selectedRoomDetail.row && this.chat.room.selectedRoomDetail.row.participants != undefined) {
          this.chat.room.selectedRoomDetail.row.participants.forEach((v: { profilePhotoVisibility: string; _id: null | undefined; isme: string; }) => {
            if (v._id == user_id && v.isme == 'no') {
              v.profilePhotoVisibility = visibility;
              this.cdr.detectChanges();
              // if user id exist in selecte room participant start
              if(this.chat.room.selectedRoomDetail.msgs && this.chat.room.selectedRoomDetail.msgs.length>0){
                this.chat.room.selectedRoomDetail.msgs.forEach((e: { collection: { from: { profilePhotoVisibility: any; }; }[]; }) => {
                  e.collection.forEach((v1: { from: { profilePhotoVisibility: any; }; }) => {
                    if(v1.from){
                      v1.from.profilePhotoVisibility=visibility;
                      this.cdr.detectChanges();
                    }
                  });
                });
              }
              // if user id exist in selecte room participant end
            }
          });
        }
      }
    });
    // profile image visibilty update when your contact user update their privacy then get this call end
  }
  // get archived conversation record start
  get_archive_data() {
    this.fetchConvList(true);
  }
  // get archived conversation record end

  // 🔥 Async refresh
  refreshConversationList(is_archive: any = false) {
    // console.log('refreshConversationList calling');
    this.chatService.getConversation('/api/v1/get-conv', { is_archive }).subscribe(
      (res: any) => {
        if (res) {
          res.body.data.conversation.forEach((e: { bgcolor: string,_id:any; }) => {
            e.bgcolor = this.colorSvc.getColorForUser(e._id);
          });

          const u1 = res.body.data.user[0];
          this.chat.room.conv_list = res.body.data.conversation;
          this.chat.room.loggedUser = {
            id: u1._id,
            name: u1.fullName,
            email: u1.email,
            profile_pic: u1.profile_pic ? u1.profile_pic : '',
            statusMsg: u1.statusMsg ? u1.statusMsg : '',
            status: u1.status,
            is_online: u1.is_online,
            profilePhotoVisibility: u1.profilePhotoVisibility,
            contacts: u1.contacts,
            bgcolor: this.colorSvc.getColorForUser(u1._id),
          };

          // Update cache
          this.createSocket_for_group_user(this.chat.room.conv_list);
          // need to check as now using tabs this child component inside chat tabs
          // this.unreadChildComp.getUnreadMessageCount(); // call fetch unread message count from child component
          this.getUnreadMsgCount();
          this.conversationsCache.set(u1._id, this.chat.room.conv_list);
          this.cdr.detectChanges();
        }
      },
      (error) => {
        console.error('Refresh error:', error);
      }
    );
  }
  // get conversation list start
  initConvLIst=false;
  fetchConvList(is_archive: any = false) {
    // this.chat.room.conv_list = [];
    if(this.chat.room.conv_list.length==0){
      this.chat_conv_list_loading = true;

    }
    this.cdr.detectChanges();
    const loggedUserId = this.chat.room.loggedUser?.id; // Check if already logged-in
    if (loggedUserId && this.conversationsCache.has(loggedUserId)) {
      // ✅ Load immediately from cache
      this.chat.room.conv_list = this.conversationsCache.get(loggedUserId);
      this.chat_conv_list_loading = false;
      this.cdr.detectChanges();
  
      // ⚡ Async background refresh
      this.refreshConversationList(is_archive);
      return;
    }
     // First time load or no cache
    this.chatService.getConversation('/api/v1/get-conv', { is_archive: is_archive }).subscribe(
      (res: any) => {
        this.chat_conv_list_loading = false;
        if (res) {
          res.body.data.conversation.forEach((e: { bgcolor: string,_id:any },) => {
            e.bgcolor = this.colorSvc.getColorForUser(e._id);
          });
          this.chat.room.conv_list = res.body.data.conversation;
          let u1 = res.body.data.user[0];
          this.chat.room.loggedUser = {
            id: u1._id,
            name: u1.fullName,
            email: u1.email,
            profile_pic: u1.profile_pic ? u1.profile_pic : '',
            statusMsg: u1.statusMsg ? u1.statusMsg : '',
            status: u1.status,
            is_online: u1.is_online,
            profilePhotoVisibility:u1.profilePhotoVisibility,
            contacts:u1.contacts,
            bgcolor: this.colorSvc.getColorForUser(u1._id),
          };
          
          // ✅ Cache it
          this.createSocket_for_group_user(this.chat.room.conv_list);
          // need to check as now using tabs this child component inside chat tabs
          // this.unreadChildComp.getUnreadMessageCount(); // call fetch unread message count from child component
          this.initConvLIst=true;
          // this.getUnreadMsgCount();
          this.conversationsCache.set(u1._id, this.chat.room.conv_list);
          this.cdr.detectChanges();
        } else {
        }
      },
      (error) => {
        this.chat_conv_list_loading = false;
        console.error('error: ', error);
        if (error.status == 403) {
          console.error(error);
          this.onLogout(1);
        }
        this.cdr.detectChanges();
        // Handle login error, show error message, etc.
      }
    );
  }
  // get conversation list end

  getUnreadMsgCount(){
    this.unreadChildComp.getUnreadMessageCount(); // call fetch unread message count from child component
  }

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

  updateOnlineOfflnie(frm_user_id='',frm = '') {
    // update logged user online status
    if (this.chat.room.loggedUser.id && this.chat.room.loggedUser.id==frm_user_id) {
      this.chat.room.loggedUser.is_online = false;
      if (this.onlineUser.indexOf(this.chat.room.loggedUser.id) != -1) {
        this.chat.room.loggedUser.is_online = true;
      }
      this.cdr.detectChanges();
    }
    if (this.chat.room.conv_list.length > 0 && this.onlineUser.length > 0) {
      this.chat.room.conv_list.forEach((value: { participants: any; is_online: boolean; is_group: number; sender_user_id: any; chatUserdetail: any; }) => {
        // angular.forEach(this.chat.room.conv_list, function (value, key) {
        value.is_online = false;
        // for single user
        if (!value.is_group) {

          value.is_online = false;
          value.participants.forEach((v: { is_online: boolean; _id: null | undefined; isme: string; }) => {
            v.is_online = false;
            if (v._id != null && v._id != undefined && v.isme == 'no' && this.onlineUser.indexOf(v._id) != -1) {
              v.is_online = true;
            }
          });
        } else {
          value.participants.forEach((v: { is_online: boolean; _id: null | undefined; }) => {
            v.is_online = false;
            if (v._id != null && v._id != undefined && this.onlineUser.indexOf(v._id) != -1) {
              v.is_online = true;
            }
          });
        }
      });
      // for single user
      if (this.chat.room.selectedRoomDetail.row && this.chat.room.selectedRoomDetail.participants != undefined) {
        this.chat.room.selectedRoomDetail.row.participants.forEach((v: { is_online: boolean; _id: null | undefined; isme: string; }) => {
          v.is_online = false;
          if (v._id != null && v._id != undefined && this.onlineUser.indexOf(v._id) != -1) {
            v.is_online = true;
          }
        });
      }
      this.cdr.detectChanges();
    }
  }

  updateThemeIcon() {
    this.lightDarkToggleIcon =
    this.currentTHem == 'dark' ? this.lightThemeIcon : this.darkThemeIcon;
    this.lightDarkToggleLabel =
    this.currentTHem == 'dark' ? 'Light Mode' : 'Dark Mode';
    this.cdr.detectChanges();
  }
  hidden = false;
  isChatroomLoading = false;
  toggleBadgeVisibility() {
    this.hidden = !this.hidden;
  }

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
  changeTheme() {
    this.currentTHem = this.colorSchemeService.currentActive();
    this.currentTHem = this.currentTHem == 'dark' ? 'light' : 'dark';
    this.colorSchemeService.update(this.currentTHem).subscribe();
    this.updateThemeIcon();
  }

  // bookmark messge start
  bookmark_msg(message: any) {
    let newobj = {
      _id: message._id,
      user_id: this.chat.room.loggedUser.id,
    }
    this.socketService.emit_callback('bookmark_message', newobj, (res: any) => {
      if (res) {
        this.snackBar.open(res.message, 'View', {
          duration: 3000
        })
          .onAction().subscribe(() => {
            this.ActiveTab = 'pills-bookmark';
            this.cdr.detectChanges();
          });
      }
    });
  }
  // bookmark messge end

  deleteMessage(selected_message: any, collection_date: any) {
    this.socketService.emit('delete_message', selected_message);
  }

  setLastMsgConv(message: any, tempObj: any) {
    this.chat.room.conv_list.forEach((cl: any, i: number) => {
      if (cl._id == tempObj.conversation_id) {
        cl.last_message = message;
        cl.last_msg_date = tempObj.full_send_datetime;
        cl.last_msg_row.sent_by_u = tempObj.sent_by_u;
        cl.last_msg_row._id = tempObj.conversation_id;
        cl.last_msg_row.send_datetime = tempObj.full_send_datetime;
        cl.last_msg_row.message = message;
        cl.last_msg_row.readBy = [];
        cl.last_msg_row.deliveredTo = [];
        if (tempObj.attachments && tempObj.attachments.length > 0) {
          cl.last_msg_row.attachments = tempObj.attachments
        }
        // Add forwarded data to last_msg_row
        if (tempObj.forwarded) {
          cl.last_msg_row.forwarded = tempObj.forwarded;
          cl.last_msg_row.forward_snapshot = tempObj.forward_snapshot;
          cl.last_message = tempObj.forward_snapshot.text || 'Forwarded message';
        } else {
          cl.last_msg_row.forwarded = false;
        }
        cl.last_msg_row.fromUser = tempObj.fromUser;
        cl.last_msg_row.from = tempObj.from;
        this.cdr.detectChanges();
      }
    });
  }
  // send message end

  // create dynamic socket group start
  createSocket_for_group_user(convList: any[]) {
    this.socketService.emit(
      'join-chat-room',
      convList.filter((e) => {
        return e.is_group === true;
      })
    );
  }
  // create dynamic socket group end

  // show conversation message start
  showConvMsg(conv: any) {
    this.chat.room.selectedRoomId = conv._id;
    this.chat.room.selectedRoomDetail.row = conv;
    this.chatContentRef.instance.showConvMsg(conv);
    this.loadChatDetailSidebarComponent();// for lazy load chat content
    this.cdr.detectChanges();
  }
  // show conversation message end

  // get sidebar attachment file start
  get_sidebardAttachment() {
    // get attachment files
    if (this.opened) {
      this.chatSidebarDetailRef.instance.getAttachementByConv(this.chat.room.selectedRoomDetail.row);
    }
  }
  // get sidebar attachment file end

  // scroll to bottom for new chat start
  scrollToBottom2() {
    setTimeout(() => {
      this.chatMsgList_element.nativeElement.scrollTop = this.chatMsgList_element.nativeElement.scrollHeight;
      this.cdr.detectChanges();
    }, 0);
  }
  // End scroll to bottom for new chat

  // convert datatime
  timeDiff(time: any) {
    const now = new Date();
    // Parse time as today with format 'h:mm:ss a'
    const todayStr = format(now, 'yyyy-MM-dd');
    const startTime = parse(todayStr + ' ' + time, 'yyyy-MM-dd h:mm:ss a', new Date());
    const hours = differenceInHours(now, startTime);
    if (hours > 0) {
      return time;
    } else {
      return formatDistanceToNow(startTime, { addSuffix: true });
    }
  }
  //change time to human format
  humanizeDate(created_at: any, currentTime: any = null) {
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

  // for contact dialog
  openContactPopup() {
    import('./contact-dialog/contact-dialog.component').then(({ ContactDialogComponent }) => {
      const dialogRef = this.dialog.open(ContactDialogComponent, {
        height: '600px',
        width: '600px',
        data: {
          fetchConvList: this.fetchConvList.bind(this),
          intData: this.chat,
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        console.log(`Dialog result: ${result}`);
        if(this.chat.room.selectedRoomDetail.newMessage.collection.forward_msg){
          this.chat.room.selectedRoomDetail.newMessage.collection.forward_msg="";
          this.cdr.detectChanges();
        }
      });
    });
  }

  // for open chat box + calling from unread notification child component start
  openInChatBox(conv_id: any) {
    var fdat = this.chat.room.conv_list.filter((e: any) => { return e._id == conv_id });
    this.chat.room.selectedRoomId = conv_id;
    this.showConvMsg(fdat[0]);
  }
  // for open chat box + calling from unread notification child component end

  // for update unread count in conv list start
  chatBadgeTotalUnread=0;
  updateConvUnread(unreadCountData: any) {
    if (unreadCountData && unreadCountData.length > 0) {
      if (this.chat.room.conv_list.length == 0) {
        return;
      }
      this.chatBadgeTotalUnread=unreadCountData.length;
      this.chat.room.conv_list.forEach((cl: any, i: number) => {
        let dexit = unreadCountData.filter((e: { _id: any; }) => { return e._id == cl._id });
        if (dexit.length > 0) {
          cl.unread_cov_count = dexit[0].ucount;
        } else {
          cl.unread_cov_count = 0;
        }
      });
      this.cdr.detectChanges();
    }
  }
  // for update unread count in conv list end

  // calling from chat-content child component start
  markConvAsRead_child(data:any){
    const {select_item,source,on_rec_msg_data}=data;
    this.markConvAsRead(select_item,source,on_rec_msg_data);
  }
  // calling from chat-content child component end

  // update after message is read start
  // Note this method calling from 2 place (1. when select conv list and 2.)
  markConvAsRead(select_item: any, source: string, on_rec_msg_data: any) {
    this.socketService.emit_callback('markConvAsRead', select_item, (res: any) => {
      var gtotal = 0;
      if (res.status == 200 && source != 'on_rec_msg') {
        var unread_count = res.data;
        this.chat.unread.total_unread_count = 0;//reset total unread
        if (unread_count.length == 0) {
          this.chat.room.conv_list.forEach((cl: any, i: number) => {
            cl.unread_cov_count = 0;
          });
        } else {
          unread_count.forEach((e: { ucount: number; }) => {
            this.chat.unread.total_unread_count += e.ucount;
          });
          this.chat.room.conv_list.forEach((cl: any, i: number) => {
            let dexit = unread_count.filter((e: { _id: any; }) => { return e._id == cl._id });
            if (dexit.length > 0) {
              cl.unread_cov_count = dexit[0].ucount;
            } else {
              cl.unread_cov_count = 0;
            }
          });
        }
        this.cdr.detectChanges();
      }
    });
  }
  // update after message is read end

  // change online status start
  changeOnlineStatus(opt: any) {
    this.chat.room.loggedUser.status = opt;
    this.socketService.emit('user_status_change', this.chat.room.loggedUser); // update msg delivered status to the sender
  }
  // change online status end

  // profile image upload popup start
  // for mobile view : showing conversation msg when click on conversation
  removeUserChat() {
    this.chat.room.selectedRoomId = null;
    this.renderer.removeClass(this.userChatElement.nativeElement, 'user-chat-show');
    if (this.opened) {
      this.drawer.toggle();
    }
    this.cdr.detectChanges();
  }

  // archive conversation start
  archive_conv(selected_conv: any) {
    this.chatService.archive_conv('/api/v1/archive_conversation', {conv_id: selected_conv._id,user_id: this.chat.room.loggedUser.id,is_archive: selected_conv.is_archive})
      .subscribe({
        next: (res: any) => {
          res = res.body;
          if (res) {
            this.chat.room.conv_list.forEach((cl: any, i: number) => {
              if (cl._id == selected_conv._id) {
                if (selected_conv.is_archive != "yes") {
                  cl.is_archive = "yes";
                  this.snackBar.open('Conversation archived..', 'open', {
                    duration: 3000
                  })
                    .onAction().subscribe(() => {
                      this.get_archive_data();
                      this.is_archive_open = true; //flag for archive
                    });
                } else {
                  cl.is_archive = '';
                  this.snackBar.open('Conversation remove from archived..', 'close', {
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
  // archive conversation end

  // get conversation data by conv_id start
  get_conv_list_by_id(id: string) {
    this.chatService.POST('/api/v1/get-conv', { conv_id: id }).subscribe(
      (res: any) => {
        if (res) {
          var conv_row;
          if (res.body.data.conversation.length > 0) {
            conv_row = res.body.data.conversation[0];
            conv_row.bgcolor = this.colorSvc.getColorForUser(conv_row._id);
            this.chat.room.conv_list.push(conv_row);
            this.createSocket_for_group_user(res.body.data.conversation);
            this.unreadChildComp.getUnreadMessageCount(); // call fetch unread message count from child 
            this.cdr.detectChanges();
          }
        }
      },
      (error) => {
        this.chat_conv_list_loading = false;
        console.error('error: ', error);
        if (error.status == 403) {
          console.error(error);
          this.onLogout(1);
        }
        // Handle login error, show error message, etc.
      }
    );
  }
  // get conversation data by conv_id end

  
  // lazy loading setting tab start
  async loadSettingComponent() {
    if (this.isParentLoaded) {
      import('./setting-tab/setting-tab.component').then(({ SettingTabComponent }) => {
        this.setting_container.clear();
        const componentRef = this.setting_container.createComponent(SettingTabComponent);
        componentRef.instance.chat = this.chat;
        componentRef.instance.localZone = this.localZone;
        componentRef.instance.currentTHemColor = this.currentTHemColor;
        componentRef.instance.currentTheme_image = this.currentTheme_image;
        componentRef.instance.prev_profile = this.prev_profile;
        componentRef.instance.changeOnlineStatus_parent.subscribe((data: any) => this.changeOnlineStatus(data));
        componentRef.instance.changeThemeColor_parent.subscribe(({color,onload}) => this.changeThemeColor(color,onload));
        componentRef.instance.changeThemImage_parent.subscribe((data: any) => this.changeThemImage(data));
        componentRef.instance.set_profile_pic_parent.subscribe((data: any) => this.set_profile_pic(data));
      });
    }
  }
  // lazy loading setting tab end

  // lazy loading profile tab start
  async loadProfileComponent() {
    if (this.isParentLoaded) {
      import('./profile-tab/profile-tab.component').then(({ ProfileTabComponent }) => {
        this.profile_container.clear();
        const componentRef = this.profile_container.createComponent(ProfileTabComponent);
        componentRef.instance.chat = this.chat;
        componentRef.instance.ActiveTab = this.ActiveTab;
        componentRef.instance.serverPath = this.serverPath;
        componentRef.instance.localZone = this.localZone;
        componentRef.instance.getUserStatusClass_parent.subscribe((data: any) => this.getUserStatusClass(data.is_online,data.status));
        componentRef.instance.setTab_parent.subscribe((data: any) => this.setTab(data));
      });
    }
  }
  // lazy loading profile tab end
  setTab(value:string){
    // console.log(value);
    this.ActiveTab=value;
    this.cdr.detectChanges();
  }
  openContactTab_parent(notification_id:any){
    this.ActiveTab="pills-contacts";
    this.loadContactListComponent();
    this.chat.unread.total_unread_count-=1;
    this.socketService.emit('notification-seen', notification_id); // update msg delivered status to the sender
    this.cdr.detectChanges();
  }
  // lazy loading call list start
  async loadCalllistComponent() {
    if (this.isParentLoaded) {
      import('./call-list/call-list.component').then(({ CallListComponent }) => {
        this.call_list_container.clear();
        const componentRef = this.call_list_container.createComponent(CallListComponent);
        componentRef.instance.chat = this.chat;
      });
    }
  }
  // lazy loading call list end
  bookmarkComponentRef!: ComponentRef<any>;
  async loadBookmarklistComponent(){
    if (this.isParentLoaded) {
      import('./bookmark/bookmark.component').then(({ BookmarkComponent }) => {
        // Clear the container in case of multiple loads
        this.bookmark_list_container.clear();
        this.bookmarkComponentRef = this.bookmark_list_container.createComponent(BookmarkComponent);
        this.bookmarkComponentRef.instance.chat = this.chat;
        this.bookmarkComponentRef.instance.bookMarkparentFun.subscribe(() => this.getUserStatusClass('',''));
      });
    }
  }

  // get all contacts start
  all_grp_contacts: any = [];
  getAllContacts() {
    // this.all_grp_contacts = [];
    this.chatService
      .getAllContacts('/api/v1/get-all-contacts')
      .subscribe({
        next: (res: any) => {
          if (res) {
            // setTimeout(() => {
              this.all_conn=res.body.data;
              this.all_grp_contacts = this.groupContactsByFirstChar(res.body.data);
              this.cdr.detectChanges();
            // }, 5000);
            // this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
  groupContactsByFirstChar(contacts: any) {
    const groups = contacts.reduce((groups: { [x: string]: any[]; }, game: { fullName: string; }) => {
      const first = game.fullName.charAt(0).toUpperCase();
      if (!groups[first]) {
        groups[first] = [];
      }
      groups[first].push(game);
      return groups;
    }, {});

    // Edit: to add it in the array format instead
    const groupArrays = Object.keys(groups).map((first) => {
      return {
        first,
        collection: groups[first]
      };
    });
    return groupArrays
  }
  // get all contacts end
  // lazy loading contact list tab start
  async loadContactListComponent() {
    if (this.isParentLoaded) {
      import('./contact-list/contact-list.component').then(({ ContactListComponent }) => {
        // Clear the container in case of multiple loads
        this.contacts_container.clear();
        this.contactContainerRef = this.contacts_container.createComponent(ContactListComponent);
        this.contactContainerRef.instance.chat = this.chat;
        this.contactContainerRef.instance.all_grp_contacts = this.all_grp_contacts;
        this.contactContainerRef.instance.serverPath_parent = this.serverPath;
        this.contactContainerRef.instance.openContactPopup_parent.subscribe(() => this.openContactPopup());
        this.contactContainerRef.instance.contactSelect_parent.subscribe((data: any) => this.contactSelect_parent(data));
      });
    }
  }
  // lazy loading contact list tab end
  contactSelect_parent(data:any){
    this.ActiveTab='pills-chat';
    this.chat.room.conv_list=this.chat.room.conv_list.filter((e:any)=>{return !e.is_conv_temp});
    const {found_conv,found,contact}=data;
    if (found) {
      this.showConvMsg(found_conv);
    } else {
      const temp_room_id=format(new Date(), "yyyy-MM-dd HH:mm:ss");
      this.chat.room.selectedRoomId=temp_room_id;

      this.chat.room.selectedRoomDetail.msgs=[];
      this.chat.room.selectedRoomDetail.row={
        "_id": temp_room_id,
        "participants": [
            {
                "_id": this.chat.room.loggedUser.id,
                "name": this.chat.room.loggedUser.name,
                "email": this.chat.room.loggedUser.email,
                "profile_pic": this.chat.room.loggedUser.profile_pic,
                "fullName": this.chat.room.loggedUser.name,
                "status": this.chat.room.loggedUser.status,
                "statusMsg": this.chat.room.loggedUser.statusMsg,
                "is_online": this.chat.room.loggedUser.is_online,
                "lastSeen": "2025-04-24T15:56:01.397Z",
                "profilePhotoVisibility": "contacts",
                "isme": "yes"
            },
            {
                "_id": contact._id,
                "name": contact.fullName,
                "email": contact.email,
                "fullName": contact.fullName,
                "status": contact.status,
                "is_online": contact.is_online,
                "lastSeen": contact.lastSeen,
                "profile_pic":contact.profile_pic,
                "profilePhotoVisibility": contact.profilePhotoVisibility,
                "isme": "no"
            }
        ],
        "created_by": {
            "_id": this.chat.room.loggedUser.id,
            "profile_pic": this.chat.room.loggedUser.profile_pic
        },
        "is_liked": false,
        "is_group": false,
        "created_at":  format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        "updated_date": format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        "bgcolor": "#90840c",
        "is_conv_temp":true
      }
      // creating temp conv object and push as temp
      this.chat.room.conv_list.push(this.chat.room.selectedRoomDetail.row);
      this.cdr.detectChanges();
      console.log(this.chat.room.selectedRoomDetail.row);
      console.log(this.chat.room.conv_list);
    }
  }

  // change theme
  scssVar_bs_primary_rgb = signal('78,172,109');
  changeThemeColor(color: any, onload = false) {
    if (color == "pink") {
      this.scssVar_bs_primary_rgb.set('232, 62, 140');
    } else if (color == "voilet") {
      this.scssVar_bs_primary_rgb.set('97, 83, 204');
    } else if (color == "blue") {
      this.scssVar_bs_primary_rgb.set('80, 165, 241');
    } else if (color == "red") {
      this.scssVar_bs_primary_rgb.set('239, 71, 111');
    } else if (color == "gray") {
      this.scssVar_bs_primary_rgb.set('121, 124, 140');
    } else if (color == "green") {
      this.scssVar_bs_primary_rgb.set('78,172,109');
    }
    // call this when user change color theme
    if (!onload) {
      this.colorSchemeService.update_theme_color(color).subscribe();
      this.currentTHemColor = color;
    }
  }
  changeThemImage(id: number) {
    this.colorSchemeService.update_theme_image('pattern-0' + id + '.png').subscribe({
      next: (res: any) => {
        // alert('res'+res);
      },
      error: (error) => {
        // alert(error);
      }
    });
    this.renderer.setStyle(this.userChatElement.nativeElement, 'background-image', 'url("/assets/media/pattern-0' + id + '.png")');
    this.currentTheme_image = 'pattern-0' + id + '.png';
  }

  // delete conversation start
  childConfirmDelete(){
    this.chatContentRef.instance.confirmDelete(); //calling child content method
  }
  // delete conversation end

  // calling from child setting tab component to set value of user profile pic after update 
  set_profile_pic(val:any){
    this.chat.room.loggedUser.profile_pic = val;
    this.cdr.detectChanges();
  }
  trackByItemId(index: number, item: any): number {
    return item.id; // Use the unique id as the identifier
  }
  // The trackBy function uses the index as the identifier
  trackByIndex(index: number, item: number): number {
    return index;
  }
  // for count like/not liked conversaton
  getFilterConv(isliked:boolean){
    if(isliked){
      return this.chat.room.conv_list.filter((con: { is_liked: boolean; })=>con.is_liked).length;
    }else{
      return this.chat.room.conv_list.filter((con: { is_liked: boolean; })=>!con.is_liked).length;
    }
  }
  onJoinCall(conv: any) {
    // console.log('onJoinCall calling');
    // console.log(conv.ongoing_call);
    
    // First fetch the call details to get the initiator information
    this.callService.getCallDetails(conv.ongoing_call).subscribe({
      next: (callDetails: any) => {
        import('./audio-call-dialog2/audio-call-dialog2.component').then(({ AudioCallDialog2Component }) => {
          this.dialog.open(AudioCallDialog2Component, {
            data: {
              intData: this.chat,
              audioCall_detail: {
                call_id: conv.ongoing_call,
                conversation_id: conv._id,
                is_group: conv.is_group,
                conv_participant: conv.participants,
                join_call: true,
                incoming: false,
                from: {
                  _id: callDetails.started_by || callDetails.created_by,
                  fullName: callDetails.initiator_name || callDetails.started_by_name,
                  profile_pic: callDetails.initiator_pic || callDetails.started_by_pic,
                  isme: callDetails.started_by === this.chat.room.loggedUser.id ? 'yes' : 'no'
                },
                userID: this.chat.room.loggedUser.id,
                userName: this.chat.room.loggedUser.name,
                streamID: conv._id
              }
            },
            disableClose: true
          });
        });
      },
      error: (error) => {
        console.error('Error fetching call details:', error);
        // Fallback to current user if call details can't be fetched
        import('./audio-call-dialog2/audio-call-dialog2.component').then(({ AudioCallDialog2Component }) => {
          this.dialog.open(AudioCallDialog2Component, {
            data: {
              intData: this.chat,
              audioCall_detail: {
                call_id: conv.ongoing_call,
                conversation_id: conv._id,
                is_group: conv.is_group,
                conv_participant: conv.participants,
                join_call: true,
                incoming: false,
                from: {
                  _id: this.chat.room.loggedUser.id,
                  fullName: this.chat.room.loggedUser.name,
                  profile_pic: this.chat.room.loggedUser.profile_pic,
                  isme: 'yes'
                },
                userID: this.chat.room.loggedUser.id,
                userName: this.chat.room.loggedUser.name,
                streamID: conv._id
              }
            },
            disableClose: true
          });
        });
      }
    });
  }
}