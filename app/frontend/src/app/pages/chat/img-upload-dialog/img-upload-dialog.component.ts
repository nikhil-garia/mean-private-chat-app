import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, OnInit, Output, ViewChild } from '@angular/core';
// import { NgIf } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
// import { FileSizePipe } from '../../../pipes/file-size.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage, ImageTransform, Dimensions } from 'ngx-image-cropper';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-img-upload-dialog',
  templateUrl: './img-upload-dialog.component.html',
  styleUrl: './img-upload-dialog.component.scss',
  imports: [MatDialogModule, MatIcon, MatTooltipModule,ImageCropperComponent,FormsModule],
})
export class ImgUploadDialogComponent implements OnInit {
  @Output() updateProfilePic = new EventEmitter<any>();
  constructor(
    public dialogRef: MatDialogRef<ImgUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private readonly  _sanitizer: DomSanitizer,
    private chatService: ChatService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) 
  // private socketService: SocketService,
  // private snackBar: MatSnackBar,
  // private authService: AuthService
  {}

  ngOnInit() {
    // let convList1 = this.data.intData;
    console.log(this.data.prev_profile);
  }

  // image cropper start 
  @ViewChild('myInput') myInputVariable!: ElementRef;

  // imageChangedEvent: any = '';
  imageChangedEvent: Event | null = this.data.prev_profile[0].event;
  // croppedImage: any = '';
  croppedImage: SafeUrl  = '';
  uploadImage: any = '';
  canvasRotation = 0;
  rotation = 0;
  scale = 1;
  showCropper = false;
  containWithinAspectRatio = false;
  transform: ImageTransform = {};

  fileChangeEvent(event: Event): void {
    this.imageChangedEvent = event;
  }
  imageCropped(event: ImageCroppedEvent): void {
    // Access the cropped image data
    // console.log('Cropped image event:', event);
    // console.log('Cropped image blob:', event.blob);
    // console.log('Cropped image base64:', event.base64);
    this.uploadImage=event.blob;
    this.croppedImage = this._sanitizer.bypassSecurityTrustUrl(event.objectUrl!);
    // You can upload this base64 data to your server
  }
  imageLoaded() {
    this.showCropper = true;
  }
  cropperReady(sourceImageDimensions: Dimensions) {
    // cropper ready
    console.log('Cropper ready', sourceImageDimensions);
  }
  loadImageFailed() {
    // show message
    console.log('Load failed');
  }

  clear() {
    this.croppedImage = '';
    this.imageChangedEvent = null;
    this.myInputVariable.nativeElement.value = '';
  }

  rotateLeft() {
    this.canvasRotation--;
    this.flipAfterRotate();
  }

  rotateRight() {
    this.canvasRotation++;
    this.flipAfterRotate();
  }

  private flipAfterRotate() {
    const flippedH = this.transform.flipH;
    const flippedV = this.transform.flipV;
    this.transform = {
      ...this.transform,
      flipH: flippedV,
      flipV: flippedH,
    };
  }

  flipHorizontal() {
    this.transform = {
      ...this.transform,
      flipH: !this.transform.flipH,
    };
  }

  flipVertical() {
    this.transform = {
      ...this.transform,
      flipV: !this.transform.flipV,
    };
  }

  resetImage() {
    this.scale = 1;
    this.rotation = 0;
    this.canvasRotation = 0;
    this.transform = {};
  }

  zoomOut() {
    this.scale -= 0.1;
    this.transform = {
      ...this.transform,
      scale: this.scale,
    };
  }

  zoomIn() {
    this.scale += 0.1;
    this.transform = {
      ...this.transform,
      scale: this.scale,
    };
  }

  toggleContainWithinAspectRatio() {
    this.containWithinAspectRatio = !this.containWithinAspectRatio;
  }

  updateRotation() {
    this.transform = {
      ...this.transform,
      rotate: this.rotation,
    };
  }
  // image cropper end

  // upload profile image submit 
  final_profile_uploaded_file='';
  profile_progres=0;
  UploadProfilePic() {
    // console.log(this.uploadImage);
    
    this.chatService.uploadFile(this.uploadImage,'/api/v1/upload_profile_img')
      .subscribe((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          let progress = event.total ? Math.round(100 * event.loaded / event.total):0;
          // console.log(progress);
          this.profile_progres=progress;
          // console.log(filteredAttachment[_index]);
          
        } else if (event instanceof HttpResponse) {
          // console.log(event.body);
          this.final_profile_uploaded_file=event.body.data;
          this.data.intData.room.loggedUser.profile_pic=event.body.data.filename;
          this.cdr.detectChanges();
          this.updateProfilePic.emit(event.body.data.filename);
          this.snackBar.open(event.body.message, 'close', {
            duration: 3000
          });
          this.dialogRef.close();
          // filteredAttachment[_index].destination=event.body.data.destination;
          // filteredAttachment[_index].path=event.body.data.path;
        }
      },error=> {
        this.snackBar.open('Error uploading file..', 'close', {
          duration: 3000
        });
        console.error('Error uploading file', error);
      }
    )
  }
}
