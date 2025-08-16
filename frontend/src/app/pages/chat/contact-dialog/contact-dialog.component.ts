import { ChangeDetectorRef, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { ChatService } from '../../../services/chat.service';
import { SocketService } from '../../../services/socket.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatListModule} from '@angular/material/list';
import { NgIf } from '@angular/common';
import { SortByPipe } from '../../../pipes/sort/sort-by.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SearchContactPipe } from "./pipe/search-contact.pipe";
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {MatExpansionModule} from '@angular/material/expansion';
import { AuthService } from '../../../services/auth.service';
import { SafeHtml } from '@angular/platform-browser';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-contact-dialog',
    templateUrl: './contact-dialog.component.html',
    styleUrl: './contact-dialog.component.scss',
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIcon,
        MatTooltipModule,
        MatTabsModule,
        MatListModule,
        NgIf,
        SortByPipe,
        FormsModule,
        SearchContactPipe,
        MatSlideToggleModule,
        MatExpansionModule,
        ReactiveFormsModule,
        MatProgressSpinnerModule,
    ]
})
export class ContactDialogComponent implements OnInit {
  panelOpenState = false;
  all_contacts: any;
  contact_req: any;
  groupedContacts: any;
  contact_search='';
  isGroup: boolean = false;
  selectedContact:any=''; //create conv selected contat list 
  showCrateConvBtn: boolean=false;
  isForward=false;
  allUser_list: any = [];
  user_searchControl = new FormControl('');
  filteredUserList:any = [];
  // for infinite scroll on all user list
  isLoadingMore = false; // For infinite scroll
  allLoaded = false; // For infinite scroll
  skip = 0;
  limit = 20;
  constructor(
    public dialogRef: MatDialogRef<ContactDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private chatService: ChatService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
      this.getAllCOnt();
  }

   getAllCOnt(){
      this.getAllContactDetail()
        .then((res: any) => {
          // console.log('ready to get data');
          // console.log(res);
          this.all_contacts = res.data.all_contacts;
          // this.allUser_list = res.data.all_user.map((data: {is_contact: boolean; _id: any; })=>{
          //   if(res.data.all_contacts.filter((e: { _id: any; })=>{return e._id==data._id}).length>0){
          //     data.is_contact=true;return data;
          //     }else{
          //     data.is_contact=false;return data;
          //   }
          // });
          this.contact_req = res.data.contact_req;
          // console.log(this.contact_req);
          this.groupedContacts = this.groupContactsByFirstChar(res.data.all_contacts);
          // console.log('==========test1');
          // console.log(this.allUser_list);
          // console.log(this.groupedContacts);     
          this.cdr.detectChanges();
        })
        .catch((err) => {
          // console.log('error found');
          // console.log(err);
        });  
    }

  searchTerm: string = '';
  ngOnInit() {
    let convList1 = this.data.intData;
    // Setup search functionality: call API only when user stops typing (debounced)
    this.user_searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(query => {
        this.skip = 0;
        this.allLoaded = false;
        this.allUser_list = [];
        if (query && query.trim().length > 0) {
          this.isLoadingMore = true;
          this.cdr.detectChanges();
          return this.chatService.getFilteredUsers(`/api/v1/get-filtered-user`, encodeURIComponent(query), this.skip, this.limit);
        } else {
          return [];
        }
      })
    ).subscribe({
      next:(res: any) => {
      this.isLoadingMore = false;
      this.cdr.detectChanges();
      if (res && res.data) {
        let audta = res.data;
        // Handle both possible response structures
        let all_user = audta.all_user || audta;
        this.skip += all_user.length;
        if (Array.isArray(all_user)) {
          this.allUser_list = all_user.map((data: {is_contact: boolean; _id: any; }) => {
            if(this.all_contacts.filter((e: { _id: any; }) => e._id == data._id).length > 0) {
              data.is_contact = true;
              return data;
            } else {
              data.is_contact = false;
              return data;
            }
          });
        } else {
          this.allUser_list = [];
        }
        this.cdr.detectChanges();
      }
      },
      error: (err) => {
        this.isLoadingMore = false;
        this.cdr.detectChanges();
        // handle error if needed
      }
    });

    this.socketService.on('request_sent',(res: any)=>{
      // console.log('request_sent response from server side');
      // console.log(res.data);
      this.snackBar.open(res.message, 'close', {
        duration: 5000
      });
    })
    
    this.socketService.on('new_friend_request',(res: any)=>{
      // console.log('new_friend_request response from server side');
      // console.log(res.data);
      this.contact_req.push(res.data);
      this.snackBar.open(res.message, 'close', {
        duration: 5000
      });
    })
    this.socketService.on('request_accepted_self',(res:any)=>{
      // remove from request list
      this.contact_req=this.contact_req.filter((e:any)=>{return e._id!=res.connection_id});
      // adding to all contact list and grouping in first char
      this.pushToAllContactList(res.data);

      this.cdr.detectChanges();
      this.snackBar.open(res.message, 'close', {
        duration: 5000
      });
    })
    if(this.data.intData.room.selectedRoomDetail.newMessage.collection.forward_msg){
      this.isForward=true;
      // console.log(this.data.intData.room.selectedRoomDetail.newMessage.collection.forward_msg);
    }
  }
  pushToAllContactList(data:any){
    this.all_contacts.push(data);
    this.allUser_list = this.allUser_list.map((data: {is_contact: boolean; _id: any; })=>{
      if(this.all_contacts.filter((e: { _id: any; })=>{return e._id==data._id}).length>0){
        data.is_contact=true;return data;
        }else{
        data.is_contact=false;return data;
      }
    });
    this.groupedContacts = this.groupContactsByFirstChar(this.all_contacts);
  }
  groupContactsByFirstChar(contacts: any) {
    const groups = contacts.reduce((groups: { [x: string]: any[]; }, game: { fullName: string; }) => {
      // console.log(game.fullName.split(' ')[0]);
      const first = game.fullName.charAt(0).toUpperCase();
      // const first = game.fullName.split(' ')[0];
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
    // console.log('groupArrays');
    // console.log(groupArrays);
    return groupArrays
  }
  
  getAllContactDetail() {
    return new Promise((resolve, reject) => {
      this.chatService.getContactDetail('/api/v1/get-all-contact-detail').subscribe((res: any) => {
        if (res) {
          resolve(res);
          // this.allUser_list = res.data;
          // console.log(this.allFruits);
        } else {
          reject(res);
        }
      });
    });
  }
  addContact(_id:string){
    this.socketService.emit('friend_request',{from:this.data.intData.room.loggedUser.id,to:_id});
  }
  acceptReq(contact_req_id:any){
    this.socketService.emit('accept_request',{request_id:contact_req_id,from:this.data.intData.room.loggedUser.id});
  }

  get filteredItems() {
    if (!this.contact_search) {
      return this.groupedContacts;
    }

    return this.groupedContacts.filter((group: { collection: { fullName: string | string[]; }[]; }) => 
      group.collection.some((item: { fullName: string | string[]; }) => item.fullName.includes(this.contact_search))
    );
  }

  get totalItems() {
    if (!Array.isArray(this.filteredItems)) {
      return 0;
    }
    return this.filteredItems.reduce((count: any, current: { collection: string | any[]; }) => {
      if (current && Array.isArray(current.collection)) {
        return count + current.collection.length;
      }
      return count;
    }, 0);
  }

  // track tab change
  tabChanged=(tabchangeEvent:MatTabChangeEvent):void=>{
    // console.log('tabchangeEvent=>',tabchangeEvent);
    // console.log('index=>',tabchangeEvent.index);
    if (tabchangeEvent.index==1) {
      this.showCrateConvBtn=true;
      this.selectedContact='';//reset select contact
    }else{
      this.showCrateConvBtn=false;
    }
  }
  // on contact list selection
  onSelection(event: any, list: { selectedOptions: { selected: any; }; },type: string){
    if(type=='single'){
      // console.log(list.selectedOptions.selected[0].value);
      // console.log(list.selectedOptions.selected[0].value._id);
      this.selectedContact=list.selectedOptions.selected[0].value._id;
    }else{
      // console.log(list.selectedOptions.selected);
      let res=list.selectedOptions.selected.map((e: { value: any; })=>{
        return e.value._id;
      })
      // console.log(res);
      this.selectedContact=res;
    }
  }

  groupParticipant: any[]=[];
  singleConvSelUser:string ='';
  groupName = '';
  submitCreForm(){
    if (this.isGroup==false) {
      this.singleConvSelUser=this.selectedContact;
      // for craete single conversation 
      if (this.singleConvSelUser!='' && localStorage.getItem('user_id')!='') {
        let data={
          // conv_name:'',
          participants:[this.singleConvSelUser,localStorage.getItem('user_id')],
          created_by:localStorage.getItem('user_id'),
          is_group:this.isGroup
        }
        // console.log(data);return;
        let convList1=this.data.intData.room.conv_list;
        // console.log(convList1);
        
        let singleConv=convList1.filter((conv: { is_group: any; }) => !conv.is_group) // filter out group conversations
        // console.log(singleConv);
        let conversationWithSpecificParticipants = singleConv.find((conversation: { participants: any[]; }) => {
          // assuming each participant object has an 'id' property
          let participantIds = conversation.participants.map(participant => participant._id);
          return participantIds.includes(this.singleConvSelUser) && participantIds.includes(localStorage.getItem('user_id'));
        });
        // console.log('conversationWithSpecificParticipants');
        // console.log(conversationWithSpecificParticipants);
        if (conversationWithSpecificParticipants) {
          this.snackBar.open('Conversation already exist', 'close', {
            duration: 3000
          });
        } else {
          // console.log(data);
          
          // return;
          this.chatService.createConversation('/api/v1/createConv',data).subscribe((res: any) => {
            if (res) {
              // console.log(res);
              // console.log(res.status);
              // console.log(res.message);
              if (res.status==204) {
                this.snackBar.open('conversation already exist', 'close', {
                  duration: 5000
                });
              }else if(res.status==500){
                this.snackBar.open('Error', 'close', {
                  duration: 5000
                });
              }else{
                this.snackBar.open(res.message, 'close', {
                  duration: 3000
                });
                this.dialogRef.close();
                this.data.fetchConvList();
              }
            } else {
            }
          });
        }
      }else{
        this.snackBar.open('Please select contact to start conversation', 'close', {
          duration: 3000
        });
      }
    }else if (this.isGroup==true) {
      this.groupParticipant=this.selectedContact;
      // for craete single conversation 
      if (this.groupName!='' && this.groupParticipant.length>1 && localStorage.getItem('user_id')!='') {
        let participants_arr=this.groupParticipant;
        participants_arr.push(localStorage.getItem('user_id'));
        let particip=[...new Set(participants_arr)];
        let data={
          conv_name:this.groupName,
          participants:particip,
          created_by:localStorage.getItem('user_id'),
          is_group:this.isGroup
        }
        // console.log(data);
        
        this.chatService.createConversation('/api/v1/createConv',data).subscribe((res: any) => {
          if (res) {
            // console.log(res);
            this.snackBar.open('Conversation created successfully', 'close', {
              duration: 3000
            });
            this.dialogRef.close();
            this.data.fetchConvList();//calling parent function
          } else {
          }
        }, error => {
          console.error('error: ', error);
          if (error.status==403) {
            console.error(error); 
            this.authService.logout('/api/v1/logout',1);//logout
          }
          // Handle login error, show error message, etc.
        });
      }else{
        // alert('please select contact and enter group name to create group');
        this.snackBar.open('Please select contact and enter group name to create group', 'close', {duration: 3000});
      }
    }
  }
  
  getSanitizedMessage(htmlContent: string): SafeHtml {
    return this.chatService.getSanitizedMessage(htmlContent);
  }

  async forwardMsg() {
    if (!this.selectedContact || this.selectedContact.length === 0) {
      this.snackBar.open('Select at least one contact', 'close', { duration: 2000 });
      return;
    }
    const forwardMsg = this.data.intData.room.selectedRoomDetail.newMessage.collection.forward_msg;
    const senderId = localStorage.getItem('user_id');
    const senderName = this.data.intData.room.loggedUser.fullName || this.data.intData.room.loggedUser.name;
    const convList = this.data.intData.room.conv_list;
    const recipients = Array.isArray(this.selectedContact) ? this.selectedContact : [this.selectedContact];
    for (const recipientId of recipients) {
      // 1. Find or create conversation
      let conversation = convList.find((conv:any) =>
        !conv.is_group &&
        conv.participants.some((p: any) => p._id === recipientId) &&
        conv.participants.some((p: any) => p._id === senderId)
      );
      let conversationId = conversation ? conversation._id : null;
      if (!conversationId) {
        // Create conversation first
        const data = {
          participants: [recipientId, senderId],
          created_by: senderId,
          is_group: false
        };
        try {
          const res: any = await this.chatService.createConversation('/api/v1/createConv', data).toPromise();
          if (res && res.data && res.data._id) {
            conversationId = res.data._id;
          } else {
            this.snackBar.open('Failed to create conversation', 'close', { duration: 2000 });
            continue;
          }
        } catch (err) {
          this.snackBar.open('Error creating conversation', 'close', { duration: 2000 });
          continue;
        }
      }
      // 2. Build message object
      const messageData = {
        conversation_id: conversationId,
        sendFrom: { id: senderId },
        to: recipientId,
        chat_type: 0, // single chat
        forward_msg_id: forwardMsg._id,
        forward_snapshot: {
          text: forwardMsg.message,
          attachments: forwardMsg.attachments,
          sender: {
            _id: forwardMsg.from._id,
            name: forwardMsg.from.name || forwardMsg.from.fullName
          }
        },
        created_by: senderId,
        forwarded: true
      };
      // 3. Emit via socket
      this.socketService.emit('send_msg', messageData);
      // Update the last message in the conversation list
      let convToUpdate = convList.find((conv: any) => conv._id === conversationId);
      if (convToUpdate) {
        convToUpdate.last_message = forwardMsg.message;
        convToUpdate.last_msg_row = {
          ...convToUpdate.last_msg_row,
          forwarded: true,
          forward_snapshot: {
            text: forwardMsg.message,
            attachments: forwardMsg.attachments,
            sender: {
              _id: forwardMsg.from._id,
              name: forwardMsg.from.name || forwardMsg.from.fullName
            }
          },
          forward_msg_id: forwardMsg._id,
          chat_type: 0,
          from: senderId,
          fromUser: { _id: senderId, name: senderName },
          send_datetime: new Date().toISOString(),
          attachments: forwardMsg.attachments || [],
          message: forwardMsg.message,
        };
        convToUpdate.last_msg_date = new Date().toISOString();
      }
    }
    this.snackBar.open('Message forwarded!', 'close', { duration: 2000 });
    this.dialogRef.close();
  }

  onUserListScroll(event: any) {
    const element = event.target;
    // console.log(`(element.scrollHeight - element.scrollTop)=`+(element.scrollHeight - element.scrollTop)+`===(clientHeight)=`+element.clientHeight)
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      this.loadMoreUsers();
    }
  }

  loadMoreUsers() {
    if (this.isLoadingMore || this.allLoaded) return;
    this.isLoadingMore = true;
    this.cdr.detectChanges();
    const query = this.user_searchControl.value;
    if (query && query.trim().length > 0) {
      this.chatService.getFilteredUsers(`/api/v1/get-filtered-user`, encodeURIComponent(query), this.skip, this.limit)
        .subscribe({
          next: (res: any) => {
            if (res && res.data) {
              let audta = res.data;
              let all_user = audta.all_user || audta;
              if (Array.isArray(all_user) && all_user.length > 0) {
                this.skip += all_user.length;
                // Append new users, avoid duplicates
                this.allUser_list = [
                  ...this.allUser_list,
                  ...all_user
                    .filter((newUser: any) => !this.allUser_list.some((u: any) => u._id === newUser._id))
                    .map((data: {is_contact: boolean; _id: any; }) => {
                      if(this.all_contacts.filter((e: { _id: any; }) => e._id == data._id).length > 0) {
                        data.is_contact = true;
                      } else {
                        data.is_contact = false;
                      }
                      return data;
                    })
                ];
                this.cdr.detectChanges();
              } else {
                this.allLoaded = true;
                this.cdr.detectChanges();
              }
            }
            this.isLoadingMore = false;
            this.cdr.detectChanges();
          }, 
          error: (error) => {
            this.isLoadingMore = false;
            this.cdr.detectChanges();
          }
        });
    } else {
      this.isLoadingMore = false;
      this.cdr.detectChanges();
    }
    this.cdr.detectChanges();
  }
}
