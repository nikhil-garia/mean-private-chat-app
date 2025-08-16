import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ChatService } from '../../../services/chat.service';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { NgClass, NgOptimizedImage } from '@angular/common';
// component
import { ImgUploadDialogComponent } from '../img-upload-dialog/img-upload-dialog.component';
// material
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';

@Component({
  selector: 'app-setting-tab',
  imports: [FirstCharsPipe, NgClass, NgOptimizedImage,FormsModule,MatTooltipModule,SafeImageUrlPipe],
  templateUrl: './setting-tab.component.html',
  styleUrl: './setting-tab.component.scss'
})
export class SettingTabComponent implements AfterViewInit {
  @Input() chat: any;//getting chat var from parent component
  @Input() localZone: any;
  @Input() currentTHemColor: any;
  @Input() currentTheme_image: any;
  @Input() prev_profile:any;

  @Output() changeOnlineStatus_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() changeThemeColor_parent = new EventEmitter<{ color: any, onload: boolean }>();
  @Output() changeThemImage_parent: EventEmitter<any> = new EventEmitter<any>();
  @Output() set_profile_pic_parent: EventEmitter<any> = new EventEmitter<any>();
  
  @ViewChild('attachedprofileInput') attachProfileInput!: ElementRef;

  private chatService = inject(ChatService);
  serverPath: string | undefined;
  editableStatus=false;
  editableName=false;
  constructor(private cdr: ChangeDetectorRef,private snackBar: MatSnackBar,public dialog: MatDialog,) {
    this.serverPath = this.chatService.serverPath;
  }

  //====== attachment start=====
  // prev_files: any = [];
  // prev_profile: any = [];
  previewFile(event: any, source: any = 'null') {
    // console.log(this.prev_profile);
    // this.prev_files=[];
    let files: any = event.target.files;
    // console.log(files);
    if (source == 'profile') {
      this.prev_profile = [];
    } else {
      // this.isAttachedPrevActive = true;
      // this.isMoreActive = false;
    }
    // allowed file types
    var allowedTypes = /image.*|application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|video.*|audio.*/;
    var maxSize = 2 * 1024 * 1024; // 2MB


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
          this.snackBar.open('File is not an image, PDF, DOC, video or audio.', 'close', {
            duration: 5000
          });
          return;
        } else if (file.size > maxSize) {
          this.snackBar.open('File is too large. Maximum file size is 2MB.', 'close', {
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
            // this.prev_files.push(data);
            // this.cdr.detectChanges();
          }
        }
        reader.readAsDataURL(file);
      }
    }
    setTimeout(() => {
      // console.log(this.prev_files);

      if (source == 'profile') {
        this.attachProfileInput.nativeElement.value = '';
      } else {
        // this.attachFileInput.nativeElement.value = '';
      }
    }, 5000);
  }
  //====== attachment end=====

  
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
      // this.chat.room.loggedUser.profile_pic = newData;// not working
      this.set_profile_pic_parent.emit(newData); // called parent chat component method to set profile pic
      this.cdr.detectChanges();
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
  }
  // profile image upload popup end

  changeOnlineStatus(opt: any) {
    this.changeOnlineStatus_parent.emit(opt);
  }
  changeThemeColor(color: any, onload = false) {
    this.changeThemeColor_parent.emit({ color, onload });
  }
  changeThemImage(id: number) {
    this.changeThemImage_parent.emit(id);
  }

  selectedVisibility: string='everyone';
  statusMsg:string='';
  ngAfterViewInit(): void {
    if(this.chat.room.loggedUser.profilePhotoVisibility && this.chat.room.loggedUser.profilePhotoVisibility!=''){
      setTimeout(() => {
        this.selectedVisibility = this.chat.room.loggedUser.profilePhotoVisibility;
        this.cdr.detectChanges();
      }, 2000);
    }
    if(this.chat.room){
      setTimeout(() => {
        this.statusMsg= this.chat.room.loggedUser.statusMsg;
        // alert(this.statusMsg);
        this.cdr.detectChanges();
      }, 2000);
    }
  }
  updateVisibility() {
    this.chatService.POST('/api/v1/updatePhotoVisibility',{visibility:this.selectedVisibility})
    .subscribe({
      next: (res: any) => {
        this.snackBar.open('Visibility updated successfully..', 'close', {duration: 5000});
      },
      error: (error) => {
        console.log(error);
      },
    });
  }
  updateStatus(statusMsg:any){
    if(statusMsg!=''){
      this.chatService.POST('/api/v1/updatePersonalInfo',{statusMsg:statusMsg})
      .subscribe({
        next: (res: any) => {
          this.editableStatus=false;
          this.chat.room.loggedUser.statusMsg=statusMsg;
          this.cdr.detectChanges();
          this.snackBar.open('Status updated successfully..', 'close', {duration: 3000});
        },
        error: (error) => {
          console.log(error);
        },
      });
    }else{
      this.snackBar.open('Plase enter status..', 'close', {duration: 3000});
    }
  }
  updateName(name:any){
    if(name!=''){
      this.chatService.POST('/api/v1/updatePersonalInfo',{fullName:name})
      .subscribe({
        next: (res: any) => {
          this.editableName=false;
          this.chat.room.loggedUser.name=name;
          this.cdr.detectChanges();
          this.snackBar.open('Name updated successfully..', 'close', {duration: 3000});
        },
        error: (error) => {
          console.log(error);
        },
      });
    }else{
      this.snackBar.open('Plase enter name..', 'close', {duration: 3000});
    }
  }
}
