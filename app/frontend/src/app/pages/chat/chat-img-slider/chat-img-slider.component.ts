import { Component, Input, OnInit, input } from '@angular/core';
import { BeforeSlideDetail } from 'lightgallery/lg-events';
import { environment } from '../../../../environments/environment';
import { CommonModule, JsonPipe, NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
// lightgallery
import { LightgalleryModule } from 'lightgallery/angular';
import lgThumbnail from 'lightgallery/plugins/thumbnail';
import lgZoom from 'lightgallery/plugins/zoom';
import lgRotate from 'lightgallery/plugins/rotate';
import lgVideo from 'lightgallery/plugins/video';
import { FileSizePipe } from '../../../pipes/file-size.pipe';
// material 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VideoUtilsService } from './video-utils.service';

@Component({
  selector: 'app-chat-img-slider',
  imports: [LightgalleryModule, NgClass, MatTooltipModule, MatProgressSpinnerModule, JsonPipe, CommonModule, FileSizePipe],
  templateUrl: './chat-img-slider.component.html',
  styleUrl: './chat-img-slider.component.scss'
})
export class ChatImgSliderComponent implements OnInit {
  @Input() attachment: any;
  serverPath: string;
  settings = {
    counter: false,
    plugins: [lgZoom,lgThumbnail,lgRotate,lgVideo], // You can add other plugins as needed
    speed: 500,
  };
  constructor(private videoUtils: VideoUtilsService) {
    this.serverPath=environment.apiUrl;
  }
  async ngOnInit(): Promise<void> {
    if (this.attachment && this.attachment.length>0) {
      for (let i = 0; i < this.attachment.length; i++) {
        const el = this.attachment[i];
        if(el && el!=null){
          if(el.mimetype=="video/mp4"){
            el.path2=(el.destination && el.destination!='') ? this.serverPath+'/'+el.path:el.url;
            el.poster=await this.generatePoster(el.path2);
            el.video={ 'source': [{ 'src': el.path2, 'type': 'video/mp4' }], 'attributes': { 'preload': false, 'playsinline': true, 'controls': true } };
            // console.log(el.poster);
          }
        }
      }
    }
  }

  onBeforeSlide = (detail: BeforeSlideDetail): void => {
    const { index, prevIndex } = detail;
  };

  async generatePoster(videoUrl:string) {
    try {
      return await this.videoUtils.capturePoster(videoUrl);
    } catch (error) {
      console.error('Failed to capture poster:', error);
      return '';
    }
  }
}
