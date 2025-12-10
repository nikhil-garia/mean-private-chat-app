import { Component, AfterViewInit, ElementRef, ViewChild, Input, ChangeDetectorRef } from '@angular/core';
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.js';
import { environment } from '../../../../environments/environment';
@Component({
  selector: 'app-waveform',
  imports: [],
  templateUrl: './waveform.component.html',
  styleUrl: './waveform.component.scss'
})
export class WaveformComponent implements AfterViewInit {
  @ViewChild('waveform', { static: true }) waveformRef!: ElementRef;
  @Input() messageid: any | undefined;
  @Input() attachment: any | undefined;
  wave: any;
  c_seek_time=0;
  serverPath: string;
  is_play=false;
  constructor(private changeDetectorRef: ChangeDetectorRef) {
    this.serverPath=environment.apiUrl;
  }

  ngAfterViewInit() {
    const options={
      container: document.getElementById(this.messageid+'_audio') as HTMLElement,
      /** The height of the waveform in pixels */
      height: 68,
      /** The width of the waveform in pixels or any CSS value; defaults to 100% */
      width: 300,
      waveColor: 'rgba(78,172,109, 1)',
      progressColor: 'darkgreen',
      plugins: [
        Hover.create({
          lineColor: '#ff0000',
          lineWidth: 2,
          labelBackground: '#555',
          labelColor: '#fff',
          labelSize: '11px',
        }),
      ],
    };
    this.wave = WaveSurfer.create(options);
    const el = this.attachment;
    // console.log(el);
    if(el && el!=null){
      if(el.mimetype=="audio/mpeg" || el.mimetype=="audio/wav"){
        el.path2=(el.destination && el.destination!='') ? this.serverPath+'/'+el.path:el.url;
      }
    }
    this.wave.load(el.path2);

    this.wave.on('finish', () => {
      console.log('Finish');
      this.is_play=false;
    })

    /** When the audio pauses */
    this.wave.on('pause', () => {
      console.log('Pause');
      this.is_play=false;
      this.changeDetectorRef.detectChanges();
    })

    /** On audio position change, fires continuously during playback */
    this.wave.on('timeupdate', (currentTime:any) => {
      console.log('Time', currentTime + 's')
      this.c_seek_time=currentTime.toFixed(0);
      this.changeDetectorRef.detectChanges();
    })

    /** When the user seeks to a new position */
    this.wave.on('seeking', (currentTime:any) => {
      console.log('Seeking', currentTime + 's')
    })

    /** When the user interacts with the waveform (i.g. clicks or drags on it) */
    this.wave.on('interaction', (newTime:any) => {
      console.log('Interaction', newTime + 's')
    })
  }

  play() {
    this.wave.play();
  }

  pause() {
    this.wave.pause();
  }
}
