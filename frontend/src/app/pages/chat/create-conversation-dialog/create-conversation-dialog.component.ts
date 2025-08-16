import { Component, ElementRef, Inject, ViewChild, inject } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  MatAutocompleteSelectedEvent,
  MatAutocompleteModule,
} from '@angular/material/autocomplete';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatDialogModule,MatDialogRef,MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-create-conversation-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatChipsModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    AsyncPipe
  ],
  templateUrl: './create-conversation-dialog.component.html',
  styleUrl: './create-conversation-dialog.component.scss',
})
export class CreateConversationDialogComponent {
  groupName = '';
  value = '';
  isGroup: boolean = false;
  singleConvSelUser:string ='';
  selfUserData:any=[];

  // for chipts start here
  separatorKeysCodes: number[] = [ENTER, COMMA];
  fruitCtrl = new FormControl('');
  filteredFruits: Observable<any[]> | undefined;
  fruits: any[] = [];
  allFruits: any[] = ['Apple', 'Lemon', 'Lime', 'Orange', 'Strawberry'];
  @ViewChild('fruitInput') fruitInput: ElementRef<HTMLInputElement> = null!;

  announcer = inject(LiveAnnouncer);
  allUser_list: any;
  groupParticipant: any[]=[];
  socketService: any;
  // chatService2: any;

  constructor(
    public dialogRef: MatDialogRef<CreateConversationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data:any,
    private chatService: ChatService,private authService: AuthService,private snackBar: MatSnackBar) {
    this.selfUserData={userid:localStorage.getItem('user_id')};
    this.getAllUserList()
      .then((res: any) => {
        // console.log('ready to get data');
        // console.log(res);
        this.allFruits=res.data;
        this.allUser_list = res.data;
        // console.log('this.allFruits');
        // console.log(this.allFruits.slice());
        // console.log(this.fruitCtrl.valueChanges.pipe());
        
        this.filteredFruits = this.fruitCtrl.valueChanges.pipe(
          startWith(null),
          map((fruit: any | null) =>
            fruit ? this._filter(fruit) : this.allFruits.slice()
          )
        );
        // this.filteredFruits=this.allFruits;
        // console.log('this.filteredFruits =2');        
        // console.log(this.filteredFruits);
      })
      .catch((err) => {
        console.log('error found');
        console.log(err);
      });
  }
  submitCreForm(){
    if (this.isGroup==false) {
      // for craete single conversation 
      if (this.singleConvSelUser!='' && localStorage.getItem('user_id')!='') {
        let data={
          // conv_name:'',
          participants:[this.singleConvSelUser,localStorage.getItem('user_id')],
          created_by:localStorage.getItem('user_id'),
          is_group:this.isGroup
        }
        // console.log(data);
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

  getAllUserList() {
    return new Promise((resolve, reject) => {
      this.chatService.getAllUser('/api/v1/users').subscribe((res: any) => {
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

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.fruits.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();

    this.fruitCtrl.setValue(null);
  }

  remove(fruit: any): void {
    const index = this.fruits.indexOf(fruit);

    if (index >= 0) {
      this.fruits.splice(index, 1);
      this.groupParticipant.splice(index,1);

      this.announcer.announce(`Removed ${fruit}`);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    // console.log(event);
    this.fruits.push(event.option.viewValue);
    this.groupParticipant.push(event.option.value);
    this.fruitInput.nativeElement.value = '';
    this.fruitCtrl.setValue(null);
  }

  private _filter(value: any): any[] {
    // console.log('value===1');
    // console.log(value);
    
    const filterValue = value.toLowerCase();

    return this.allFruits.filter((fruit) =>
      fruit.fullName.toLowerCase().includes(filterValue)
    );
  }
  // create group conv chips end


}
