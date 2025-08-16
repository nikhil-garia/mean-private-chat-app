import { ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { CallService } from '../../../services/call.service';
// import { TimeAgoPipe } from "../../../pipes/timeago/time-ago.pipe";
import { intervalToDuration } from 'date-fns';
import { AsyncPipe, NgClass, NgOptimizedImage } from '@angular/common';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { ChatService } from '../../../services/chat.service';
import { TimeAgoConvPipe } from "../pipe/time-ago-conv.pipe";
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-call-list',
  imports: [NgClass, FirstCharsPipe, TimeAgoConvPipe,MatTooltipModule,NgOptimizedImage],
  templateUrl: './call-list.component.html',
  styleUrl: './call-list.component.scss'
})
export class CallListComponent {
  @Input() chat : any; //getting chat var from parent component
  private callService = inject(CallService);
  private chatService=inject(ChatService);
  call_list=[];
  serverPath: string;
  constructor(private changeDetectorRef: ChangeDetectorRef){
    this.serverPath=this.callService.serverPath;
    this.getCall_list();
  }

  getCall_list() {
    this.callService.getCall_list('/api/v1/get-call-list/')
    .subscribe({
      next: (res: any) => {
        // console.log(res);
        if(res.status==200){
          if (res.body.data.length>0) {
            this.call_list= res.body.data;
            this.changeDetectorRef.detectChanges();
            // console.log(this.call_list);
          }
        }
      },
      error: (error) => {
        console.log(error);
      },
    });
    // return response.data?response.data.token:'';
  }
  // get duration
  getDuration(start:any, end:any){
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = intervalToDuration({ start: startDate, end: endDate });
    const hours = String(duration.hours ?? 0).padStart(2, '0');
    const minutes = String(duration.minutes ?? 0).padStart(2, '0');
    const seconds = String(duration.seconds ?? 0).padStart(2, '0');
    return `${hours}:${minutes}:${seconds} `;
  }

  // checking profile image privacy status for display image 
  checkPic_privacy(user: { profilePhotoVisibility: string; }){
    return this.chatService.checkPic_privacy(user,this.chat.room.loggedUser);
  }

}
