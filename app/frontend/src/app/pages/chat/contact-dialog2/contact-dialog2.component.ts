import { NgIf } from '@angular/common';

import { ChangeDetectorRef, Component, inject, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef,MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import {MatExpansionModule} from '@angular/material/expansion';
import { SearchContactPipe } from '../contact-dialog/pipe/search-contact.pipe';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { SortByPipe } from '../../../pipes/sort/sort-by.pipe';
import { ChatService } from '../../../services/chat.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { SocketService } from '../../../services/socket.service';

@Component({
  selector: 'app-contact-dialog2',
  imports: [
    MatTabsModule,
    MatDialogModule,
    MatListModule,
    MatIcon,
    SortByPipe,
    NgIf,
    MatExpansionModule,
    SearchContactPipe,
    FormsModule,
  ],
  templateUrl: './contact-dialog2.component.html',
  styleUrl: './contact-dialog2.component.scss'
})
export class ContactDialog2Component {
  panelOpenState = false;
  selectedContact:any=''; //create conv selected contat list 
  contact_search='';
  groupedContacts: any;
  isGroup: boolean = true;
  all_contacts: any;
  private chatService = inject(ChatService);
  private socketService = inject(SocketService);
  // allUser_list: any;

    
  constructor(public dialogRef: MatDialogRef<ContactDialog2Component>,@Inject(MAT_DIALOG_DATA) public data: any,private cdr: ChangeDetectorRef,private snackBar: MatSnackBar,
  private authService: AuthService,){
    this.getAllContactDetail()
    .then((res: any) => {
      // console.log('ready to get data');
      // console.log(this.data.intData.room.selectedRoomDetail.row.participants);
      // Filter out objects from array1 that exist in array2 based on the `id` property
      res.data.all_contacts = res.data.all_contacts.filter((item1: { _id: any; }) => !this.data.intData.room.selectedRoomDetail.row.participants.some((item2: { _id: any; }) => item1._id === item2._id));

      // console.log(res.data.all_contacts);
      this.all_contacts = res.data.all_contacts;
      // this.allUser_list = res.data.all_user.map((data: {is_contact: boolean; _id: any; })=>{
      //   if(res.data.all_contacts.filter((e: { _id: any; })=>{return e._id==data._id}).length>0){
      //     data.is_contact=true;return data;
      //     }else{
      //     data.is_contact=false;return data;
      //   }
      // });
      this.groupedContacts = this.groupContactsByFirstChar(res.data.all_contacts);
      // console.log('==========test1');
      // console.log(this.allUser_list);
      // console.log(this.groupedContacts);
      // this.contact_req = res.data.contact_req;        
      this.cdr.detectChanges();
    })
    .catch((err) => {
      // console.log('error found');
      // console.log(err);
    });
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

  get filteredItems() {
    if (!this.contact_search) {
      return this.groupedContacts;
    }

    return this.groupedContacts.filter((group: { collection: { fullName: string | string[]; }[]; }) => 
      group.collection.some((item: { fullName: string | string[]; }) => item.fullName.includes(this.contact_search))
    );
  }

  get totalItems() {
    return this.filteredItems.reduce((count: any, current: { collection: string | any[]; }) => count + current.collection.length, 0);
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
  submitCreForm(){
    this.groupParticipant=this.selectedContact;
    // console.log(this.selectedContact);
    // console.log(this.selectedContact);
    // for craete single conversation 
    if (this.groupParticipant.length>0 && localStorage.getItem('user_id')!='') {
      let participants_arr=this.groupParticipant;
      // participants_arr.push(localStorage.getItem('user_id'));
      let particip=[...new Set(participants_arr)];
      let data={
        participants:particip,
        created_by:localStorage.getItem('user_id'),
      }
      // console.log(this.data.intData.room.selectedRoomDetail.row);
      let url='/api/v1/conversation/'+this.data.intData.room.selectedRoomDetail.row._id+'/add';
      this.chatService
        .POST(url, data)
        .subscribe({
          next: (res: any) => {
            console.log(res);
            if (res) {
              // Filter out objects from array1 that exist in array2 based on the `id` property
              // res.body.data.participants = res.body.data.participants.filter((item1: { _id: any; }) => !this.data.intData.room.selectedRoomDetail.row.participants.some((item2: { _id: any; }) => item1._id === item2._id));
              // this.data.intData.room.selectedRoomDetail.row.participants.push(res.body.data.participants);
              // this.cdr.detectChanges();
              this.snackBar.open('user added to conversation..', 'close', {
                duration: 3000
              });
              this.dialogRef.close();
      
              // inform other user after add/remove from conversation start
              let md = {
                participants: particip,
                conv_id: this.data.intData.room.selectedRoomDetail.row._id,
                sender:localStorage.getItem('user_id')
              };
              this.socketService.emit('notify_conv_user_add_remove', md); // update msg delivered status to the sender
              // inform other user after add/remove from conversation end

              this.data.addUserTOConv.emit(res.body.data.participants);
              this.data.addUserTOConv2(res.body.data.participants);
            } else {
              this.snackBar.open('user not added to conversation..', 'close', {
                duration: 3000
              });
            }
          },
          error: (error) => {
            console.log(error);
            if (error.status==403) {
              console.error(error); 
              this.authService.logout('/api/v1/logout',1);//logout
            }
          },
        });
    }else{
      // alert('please select contact and enter group name to create group');
      this.snackBar.open('Please select contact to add user to conversation', 'close', {duration: 3000});
    }
  }
}
