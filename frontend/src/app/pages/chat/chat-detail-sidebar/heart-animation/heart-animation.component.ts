// import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../../services/chat.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-heart-animation',
  imports: [FormsModule,
  // NgFor,NgIf
  ],
  templateUrl: './heart-animation.component.html',
  styleUrl: './heart-animation.component.scss'
})
export class HeartAnimationComponent {
  @Input() selectedConv: any;
  @Input() chat:any;
  private _liked = false;
  private chatService = inject(ChatService);

  @Input()
  set liked(value: boolean) {
    this._liked = value;
  }

  get liked(): boolean {
    return this._liked;
  }
  constructor(private snackBar: MatSnackBar, private cdr: ChangeDetectorRef){}

  onHeartChange(event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (!this._liked && isChecked) {
      // Trigger the animation since it's transitioning from unliked to liked
      this.liked = true;
      this.selectedConv.is_liked=true;
      this.cdr.detectChanges();
      this.add_favourate(true);
    } else if (this._liked && !isChecked) {
      // Transition to unliked state
      this.liked = false;
      this.selectedConv.is_liked=false;
      this.cdr.detectChanges();
      this.add_favourate(false);
    }
  }

  // archive conversation start
  add_favourate(liked:boolean) {
    this.chatService.POST('/api/v1/favourite_conversation', { conv_id: this.selectedConv._id, user_id: this.chat.room.loggedUser.id, is_liked: liked })
      .subscribe({
        next: (res: any) => {
          res = res.body;
          if (res) {
            this.chat.room.conv_list.forEach((cl: any, i: number) => {
              if (cl._id == this.selectedConv._id) {
                if (liked) {
                  cl.is_liked = true;
                  this.snackBar.open('Conversation added to favourite..', 'open', {
                    duration: 3000
                  })
                    .onAction().subscribe(() => {
                      // this.get_archive_data();
                      // this.is_archive_open = true; //flag for archive
                    });
                } else {
                  cl.is_liked = false;
                  this.snackBar.open('Conversation remove from favourite..', 'close', {
                    duration: 3000
                  });
                }
                // this.removeUserChat();
                // this.chat.room.conv_list = this.chat.room.conv_list.filter((e: { _id: any; }) => e._id != this.selectedConv._id);
                this.cdr.detectChanges();
              }
            });
          }
        },
        error: (error) => {
          console.error('error: ', error);
          if (error.status == 403) {
            console.error(error);
            // this.onLogout(1);
          }
          // Handle error, show error message, etc.
        }
      });
  }
  // archive conversation end
}
