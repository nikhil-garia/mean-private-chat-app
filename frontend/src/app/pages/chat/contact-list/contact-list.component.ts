import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { SortByPipe } from "../../../pipes/sort/sort-by.pipe";
import { SearchContactPipe } from "../contact-dialog/pipe/search-contact.pipe";
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';

@Component({
  selector: 'app-contact-list',
  imports: [FormsModule, SortByPipe, SearchContactPipe, FirstCharsPipe,SafeImageUrlPipe],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss'
})
export class ContactListComponent {
  @Input() serverPath_parent: any;
  @Input() all_grp_contacts:any;
  @Input() chat: any;
  @Output() openContactPopup_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() contactSelect_parent: EventEmitter<any> = new EventEmitter<any>();
  private chatService = inject(ChatService);

  constructor(private cdr: ChangeDetectorRef) {
    // this.getAllContacts();
  }

  updateContact(contacts:any){
    this.all_grp_contacts=contacts;
    this.cdr.detectChanges();
  }
  contact_search2 = "";

  // for create contact popup
  openContactPopup() {
    this.openContactPopup_parent.emit(); //calling parent method
  }
  // checking profile image privacy status for display image 
  checkPic_privacy(user: { profilePhotoVisibility: string; }) {
    return this.chatService.checkPic_privacy(user, this.chat.room.loggedUser);
  }

  found_conv: any = '';
  onContactClick(contact: any) {
    console.log(contact);
    this.chat.room.conv_list.filter((c: any) => {
      if (!c.is_group) {
        c.participants.filter((c1: any) => {
          if (c1._id == contact._id) {
            this.found_conv = c;
            this.cdr.detectChanges();
            return c;
          }
        })
      }
    });
    if (this.found_conv._id) {
      console.log(this.found_conv);
      this.contactSelect_parent.emit({ found:true, found_conv: this.found_conv,contact:'' });
    } else {
      this.contactSelect_parent.emit({ found:false, found_conv: [], contact:contact});
    }
  }

}
