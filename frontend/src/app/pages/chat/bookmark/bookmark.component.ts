import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { FirstCharsPipe } from '../../../pipes/first-chars.pipe';
// import { FileSizePipe } from "../../../pipes/file-size.pipe";
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimeAgoConvPipe } from "../pipe/time-ago-conv.pipe";
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomSlice } from "../../../custom.slice.pipe";
@Component({
  selector: 'app-bookmark',
  imports: [CommonModule, FirstCharsPipe, MatTooltipModule, TimeAgoConvPipe, CustomSlice],
  templateUrl: './bookmark.component.html',
  styleUrl: './bookmark.component.scss'
})
export class BookmarkComponent {
  @Input() chat : any; //getting chat var from parent component
  @Output() bookMarkparentFun:EventEmitter<number>= new EventEmitter<number>();
  private chatService = inject(ChatService);
  public bookmark_data=[];
  serverPath: string;
  constructor(private snackBar: MatSnackBar,private changeDetectorRef: ChangeDetectorRef){
    this.bookmark_data=[];
    this.getBookmark();
    this.serverPath=this.chatService.serverPath;
    // console.log(this.chat);
    
  }
  getBookmark(){
    this.chatService
      .getAllBookmark('/api/v1/bookmark')
      .subscribe({
        next: (res: any) => {
          // console.log(res);
          if (res.body.data.length>0) {
            // console.log(res.body.data);
            // let jsonString="'"+res.body.data+"'";
            // console.log('jsonString');
            // const cleanedJsonString = jsonString.replace(/"([^"]+)":/g, '$1:');
            // const jsonObject = JSON.parse(cleanedJsonString);
            this.bookmark_data=res.body.data;
            this.changeDetectorRef.detectChanges();
            // console.log(this.bookmark_data);
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
  
  getUserStatusClass2(is_online:any,status:any) {
    this.bookMarkparentFun.emit(0);
  }
  delBookmark(message_id:string, user_id:string){
    this.chatService
      .deleteBookmark('/api/v1/bookmark/'+message_id+'/'+user_id)
      .subscribe({
        next: (res: any) => {
          // console.log(res);
          if (res.status==200) {
            if(res.body.data.deletedCount){
              // console.log(res.body.data.deletedCount);
              this.bookmark_data=this.bookmark_data.filter((e)=>{return e['message_id']!=message_id});
              this.snackBar.open('Bookmark Deleted..', 'close', {
                duration: 3000
              });
            }
            // console.log(this.bookmark_data);
          }
        },
        error: (error) => {
          console.log(error);
        },
      });
  }
}
