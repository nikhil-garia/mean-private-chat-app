import { ChangeDetectorRef, Component, ElementRef, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CallService } from '../../../services/call.service';
import { SocketService } from '../../../services/socket.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatSliderModule} from '@angular/material/slider';
import { Plog } from '@gpeel/plog';
import { ChatService } from '../../../services/chat.service';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { NgIf, NgFor, NgClass } from '@angular/common';
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';
import * as mediasoupClient from 'mediasoup-client';
import { MediasoupService } from '../../../services/mediasoup.service';
import { Howl } from 'howler';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-video-call-dialog2',
  imports: [
    MatDialogModule,
    MatIconModule, MatSliderModule,
    FirstCharsPipe, NgIf, NgFor
],
  templateUrl: './video-call-dialog2.component.html',
  styleUrl: './video-call-dialog2.component.scss'
})

export class VideoCallDialog2Component implements OnInit {
  // new vars
  @ViewChild('localVideoSingle') localVideoSingle!: ElementRef;
  @ViewChild('localVideoGroup') localVideoGroup!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;

  localStream!: any;
  pc!: RTCPeerConnection;
  call_id=this.data.videoCall_detail?.call_id; // its call id with proper var name
  userID = this.data.videoCall_detail?.userID;
  userName = this.data.videoCall_detail?.userName;
  streamID= this.data.videoCall_detail?.streamID;
  conversation_id = this.data.videoCall_detail?.conversation_id
  is_group = this.data.videoCall_detail?.is_group
  conv_participant = this.data.videoCall_detail?.conv_participant;
  is_user_busy_msg=this.data.videoCall_detail?.is_user_busy_msg;
  is_user_busy=this.data.videoCall_detail?.is_user_busy;
  // webrtcstaus: any;
  private callService = inject(CallService);
  private chatService= inject(ChatService);
  private mediasoupService = inject(MediasoupService);
  showAudio:boolean=false;

  // localStream: any; // Assume you have the local stream
  remoteStream: any; // Assume you have the remote stream
  incoming=this.data.incoming ? true:false;

  // dialog status
  open_audio_dialog=false;
  open_audio_notification_dialog=false;
  timer: any;
  serverPath: any;
  sound: any;
  isMute=false; //for mute/unmute self audio
  isMuteVid=false; //for mute/unmute self video
  callAccepted=false; //flag for call accept

  // Group call support
  joinedParticipants: any[] = [];
  public isInitiator = false;
  join_call = !!this.data.videoCall_detail?.join_call;

  // Mediasoup state for group calls
  device: mediasoupClient.types.Device | undefined;
  sendTransport: mediasoupClient.types.Transport | undefined;
  recvTransport: mediasoupClient.types.Transport | undefined;
  producers: any[] = [];
  consumers: any[] = [];

  // Track mute status for each participant
  public participantMuteStatus: { [userId: string]: boolean } = {};
  public participantVideoMuteStatus: { [userId: string]: boolean } = {};

  // WebRTC configuration
  servers: any = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ]
  };
  turn: any;

  constructor(public dialogRef: MatDialogRef<VideoCallDialog2Component>,@Inject(MAT_DIALOG_DATA) public data: any,private socketService: SocketService,private snackBar: MatSnackBar,private cdr: ChangeDetectorRef) {
    this.serverPath=this.callService.serverPath;
    this.sound = new Howl({src: ['assets/media/skype_ringtone.mp3'],loop: true,html5: true});
    
    // Get TURN credentials
    this.chatService.GET('/api/v1/turn-credentials').subscribe((turnData: any) => {
      turnData=turnData.body;
      if (turnData && turnData.urls && Array.isArray(turnData.urls) && turnData.urls.length > 0) {
        this.turn = turnData;
        this.servers = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: this.turn.urls[0],  // Convert array to string,
              username: this.turn.username,
              credential: this.turn.credential
            }
          ]
        };
      } else {
        console.error('TURN credentials are invalid or missing:', turnData);
      }
    });
  }
  
  async ngOnInit(): Promise<void> {
    Plog.debug('video component initialized..');
    console.log('[Video Call] Component initialized with data:', this.data);
    
    // Always reset state on open
    this.open_audio_dialog = false;
    this.open_audio_notification_dialog = false;
    this.is_user_busy = this.data.videoCall_detail?.is_user_busy;
    
    console.log('[Video Call] Call details:', {
      call_id: this.call_id,
      is_group: this.is_group,
      incoming: this.incoming,
      callAccepted: this.callAccepted
    });
    
    this.initSocketListeners();
    this.listVideoDevices();
    
    // Set isInitiator if current user is the call initiator
    this.isInitiator = (this.data.videoCall_detail?.from?._id === this.userID);
    this.cdr.detectChanges();
    
    if(!this.incoming) {
      if (this.is_group) {
        // Add self to joinedParticipants
        const self = this.data.intData.room.loggedUser;
        this.joinedParticipants = [{
          _id: self.id,
          fullName: self.name,
          profile_pic: self.profile_pic || ''
        }];
        this.cdr.detectChanges();
        this.socketService.emit('user_joined_call', {
          call_id: this.call_id,
          user: {
            _id: self.id,
            fullName: self.name,
            profile_pic: self.profile_pic || '',
          },
          groupName: this.data.videoCall_detail.groupName || this.data.intData.room.selectedRoomDetail.row.conv_name || ''
        });
        if (this.join_call) {
          await this.joinOngoingGroupCall();
        } else {
          await this.startGroupCall();
        }
      } else {
        this.startVideoCall(); //only for single chat
      }
    }else{
      this.open_audio_notification_dialog=true;
      // Only start timeout for incoming calls that are not joining an ongoing call
      if (!this.join_call) {
        this.sound.play(); //play sound only for new incoming calls
      }
    }
    this.cdr.detectChanges();
  }

  getCallStatusLabel(): string {
    // For single call
    if (!this.is_group) {
      if (this.incoming) {
        // Callee's view
        return `Incoming video call from ${this.data.videoCall_detail.from?.fullName || 'Unknown'}`;
      } else {
        // Caller's view
        return `Calling ${this.data.videoCall_detail.from.fullName || 'Unknown'}`;
      }
    } else {
      // For group call, you can customize as needed
      if(this.join_call){
        return this.data.videoCall_detail.groupName;
      }else if (this.incoming) {
        return `Incoming group(${this.data.videoCall_detail.groupName}) video call from ${this.data.videoCall_detail.from?.fullName || 'Unknown'}`;
      } else {
        return `Calling group ${this.data.videoCall_detail.groupName}`;
      }
    }
  }

  // Helper method to get the correct local video element
  private getLocalVideoElement(): ElementRef {
    return this.is_group ? this.localVideoGroup : this.localVideoSingle;
  }

  async startVideoCall() {
    let streamID=''; // for to user id
    if (!this.incoming) {
      if (this.data.intData.room.selectedRoomDetail.row.chat_type == false) {
        let touserid = this.data.intData.room.selectedRoomDetail.row.participants.filter(
          (participant: any) => {
            return participant.isme == 'no';
          }
        );
        streamID = touserid[0]._id;
      } else {
        streamID = '';

      }
    }else{
      streamID=this.streamID;
    }
    
    try {
      console.log('[Video Call] Starting getUserMedia...');
      const stream = await this.getSafeAVStream(true);
      console.log('[Video Call] getUserMedia successful:', stream);
      
      this.localStream = stream;
      const localVideoElement = this.getLocalVideoElement();
      
      if (localVideoElement && localVideoElement.nativeElement) {
        localVideoElement.nativeElement.srcObject = stream;
        localVideoElement.nativeElement.volume = 0;
        localVideoElement.nativeElement.muted = true;
        console.log('[Video Call] Local video srcObject set successfully');
      } else {
        console.error('[Video Call] Local video element not found');
        throw new Error('Local video element not found');
      }
      if(!this.incoming && !this.is_user_busy){
        // Notify User B of the call via Socket.io
        this.socketService.emit("start_video_call", {
          to: this.streamID,
          from: this.userID,
          call_id:this.call_id,
          conversation_id:this.conversation_id,
          is_group:this.is_group,
        });
        Plog.debug('Notify User B of the call via Socket.io');
        this.snackBar.open(`start_video_call emit {from: ${ this.userID} }, {to: ${this.streamID} } `, 'close', {
          duration: 10000
        });
      }

      this.pc = new RTCPeerConnection(this.servers);

      // Add local stream tracks to the peer connection
      this.localStream.getTracks().forEach((track:any) => {
        this.pc.addTrack(track, this.localStream);
      });

      // countrinue if to user if not busy
      if(!this.is_user_busy){
        this.pc.ontrack = (event) => {
          console.log('[Video Call] ontrack event received:', event);
          console.log('[Video Call] Remote streams:', event.streams);
          
          if (event.streams && event.streams.length > 0) {
            const [remoteStream] = event.streams;
            this.remoteStream = event.streams;
            
            if (this.remoteVideo && this.remoteVideo.nativeElement) {
              this.remoteVideo.nativeElement.srcObject = remoteStream;
              console.log('[Video Call] Remote video srcObject set successfully');
            } else {
              console.error('[Video Call] Remote video element not found');
            }
          } else {
            console.warn('[Video Call] No remote streams in ontrack event');
          }
        };
  
        this.pc.onicecandidate = (event) => {
          if (event.candidate) {
            this.socketService.sendSignal({ room: this.call_id, candidate: event.candidate });
          }
        };
  
        this.socketService.onSignal(async (data) => {
          console.log('on signal');
          console.log(data);
          if (data.sdp) {
            await this.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
  
            if (data.sdp.type === 'offer') {
              const answer = await this.pc.createAnswer();
              await this.pc.setLocalDescription(answer);
              this.socketService.sendSignal({ room: this.call_id, sdp: answer });
            }
          } else if (data.candidate) {
            await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        });
  
        this.socketService.joinRoom(this.call_id);
  
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.socketService.sendSignal({ room: this.call_id, sdp: offer });
      }
    } catch (error) {
      console.error('[Video Call] Error in startVideoCall:', error);
      this.snackBar.open('Failed to start video call: ' + (error as Error).message, 'close', {
        duration: 10000
      });
    }
  }

  // Refactored Mediasoup setup for both start and join
  async setupMediasoupGroupCall() {
    const roomId = this.call_id;
    const userId = this.userID;
    
    try {
      // 1. Get router RTP capabilities via HTTP API
      const rtpCapabilitiesResponse: any = await firstValueFrom(this.mediasoupService.getRouterRtpCapabilities(roomId));
      const { rtpCapabilities } = rtpCapabilitiesResponse;
      console.log('[Mediasoup] Router RTP capabilities:', rtpCapabilities);
      
      // 2. Load device
      this.device = new mediasoupClient.Device();
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log('[Mediasoup] Device loaded successfully');
      
      // 3. Create send transport via HTTP API
      const sendTransportData: any = await firstValueFrom(this.mediasoupService.createTransport(roomId, 'send'));
      this.sendTransport = this.device.createSendTransport(sendTransportData);
      console.log('[Mediasoup] Send transport created:', this.sendTransport.id);
      
      // 4. Handle transport connection via socket
      this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log('[Mediasoup] Connecting send transport:', this.sendTransport!.id, 'userId:', this.currentUserId);
          this.socketService.emit('mediasoup:connect-transport', {
            roomId,
            transportId: this.sendTransport!.id,
            dtlsParameters,
            userId: this.currentUserId
          });
          const transportConnectedHandler = (data: any) => {
            if (data.transportId === this.sendTransport!.id) {
              this.socketService.off('mediasoup:transport-connected', transportConnectedHandler);
              callback();
            }
          };
          this.socketService.on('mediasoup:transport-connected', transportConnectedHandler);
          setTimeout(() => {
            this.socketService.off('mediasoup:transport-connected', transportConnectedHandler);
            errback(new Error('Transport connection timeout'));
          }, 10000);
        } catch (err) {
          if (err instanceof Error) {
            errback(err as Error);
          } else {
            errback(new Error(String(err)));
          }
        }
      });
      
      // 5. Handle transport produce event
      this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          console.log('[Mediasoup] Creating producer for kind:', kind, 'userId:', this.currentUserId);
          this.socketService.emit('mediasoup:create-producer', {
            roomId,
            transportId: this.sendTransport!.id,
            kind,
            rtpParameters,
            userId: this.currentUserId
          });
          const producerCreatedHandler = (data: any) => {
            this.socketService.off('mediasoup:producer-created', producerCreatedHandler);
            callback({ id: data.id });
          };
          this.socketService.on('mediasoup:producer-created', producerCreatedHandler);
          setTimeout(() => {
            this.socketService.off('mediasoup:producer-created', producerCreatedHandler);
            errback(new Error('Producer creation timeout'));
          }, 10000);
        } catch (err) {
          errback(err as Error);
        }
      });
      
      // 6. Get user media and produce audio/video
      const stream = await this.getSafeAVStream(true);
      this.localStream = stream;
      const localVideoElement = this.getLocalVideoElement();
      localVideoElement.nativeElement.srcObject = stream;
      localVideoElement.nativeElement.muted = true;
      
      // Produce audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await this.sendTransport.produce({ track: audioTrack });
        this.producers.push(audioProducer);
        console.log('[Mediasoup] Audio producer created:', audioProducer.id);
      }
      
      // Produce video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await this.sendTransport.produce({ track: videoTrack });
        this.producers.push(videoProducer);
        console.log('[Mediasoup] Video producer created:', videoProducer.id);
      }
      
      // 7. Listen for new producers from other participants
      this.listenForNewProducers();
      
      // 8. Consume existing producers in the room
      await this.consumeExistingProducers();
      
      console.log('[Mediasoup] Group video call started/joined successfully');
    } catch (error) {
      console.error('[Mediasoup] Error setting up group call:', error);
      throw error;
    }
  }

  async startGroupCall() {
    console.log('startGroupCall calling');
    if (!this.is_group) return; // Only for group calls

    try {
      // Emit start_video_call to backend if this user is the initiator
      if (!this.incoming && !this.is_user_busy) {
        this.socketService.emit("start_video_call", {
          to: this.streamID,
          from: this.userID,
          call_id: this.call_id,
          conversation_id: this.conversation_id,
          is_group: this.is_group,
          conv_participant: this.conv_participant
        });
        this.snackBar.open(`start_video_call emit {from: ${this.userID} }, {to: ${this.streamID} } `, 'close', {
          duration: 5000
        });
      }

      // Use shared setup method
      await this.setupMediasoupGroupCall();
    } catch (error) {
      console.error('[Mediasoup] Error starting group call:', error);
      this.snackBar.open('Failed to start group call: ' + (error as Error).message, 'close', {
        duration: 10000
      });
      
      // Cleanup on error
      this.cleanupMediasoupResources();
      this.handleDisconnect();
    }
  }

  async joinOngoingGroupCall() {
    console.log('joinOngoingGroupCall calling');
    if (!this.is_group) return; // Only for group calls

    try {
      // Emit user_joined_call to notify others
      this.socketService.emit("user_joined_call", {
        call_id: this.call_id,
        user_id: this.userID,
        conversation_id: this.conversation_id
      });

      // Use shared setup method (no start_video_call emit)
      await this.setupMediasoupGroupCall();
    } catch (error) {
      console.error('[Mediasoup] Error joining group call:', error);
      this.snackBar.open('Failed to join group call: ' + (error as Error).message, 'close', {
        duration: 10000
      });
      
      // Cleanup on error
      this.cleanupMediasoupResources();
      this.handleDisconnect();
    }
  }

  listenForNewProducers() {
    if (!this.is_group) return;
    this.socketService.off('mediasoup:new-producer');
    this.socketService.on('mediasoup:new-producer', async (data: any) => {
      // Avoid consuming our own producer (audio or video)
      if (data && (data.userId === this.currentUserId || data.userId === this.userID)) {
        return;
      }
      try {
        console.log('[Mediasoup] New producer detected:', data);
        if (!this.recvTransport) {
          const recvTransportData: any = await firstValueFrom(this.mediasoupService.createTransport(this.call_id, 'recv'));
          this.recvTransport = this.device!.createRecvTransport(recvTransportData);
          console.log('[Mediasoup] RecvTransport created:', this.recvTransport.id);
          this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              console.log('[Mediasoup] Connecting recv transport:', this.recvTransport!.id, 'userId:', this.currentUserId);
              this.socketService.emit('mediasoup:connect-transport', {
                roomId: this.call_id,
                transportId: this.recvTransport!.id,
                dtlsParameters,
                userId: this.currentUserId
              });
              const transportConnectedHandler = (response: any) => {
                if (response.transportId === this.recvTransport!.id) {
                  this.socketService.off('mediasoup:transport-connected', transportConnectedHandler);
                  callback();
                }
              };
              this.socketService.on('mediasoup:transport-connected', transportConnectedHandler);
            } catch (err) {
              errback(err as Error);
            }
          });
        }
        this.consumeProducer(data.producerId, data.userId);
      } catch (error) {
        console.error('[Mediasoup] Error consuming new producer:', error);
      }
    });
  }

  async consumeProducer(producerId: string, remoteUserId: string) {
    if (!this.recvTransport) return;
    try {
      console.log('[Mediasoup] Creating consumer for producer:', producerId, 'userId:', this.currentUserId);
      this.socketService.emit('mediasoup:create-consumer', {
        roomId: this.call_id,
        transportId: this.recvTransport.id,
        producerId,
        rtpCapabilities: this.device!.rtpCapabilities,
        userId: this.currentUserId
      });
      const consumerCreatedHandler = async (consumerData: any) => {
        this.socketService.off('mediasoup:consumer-created', consumerCreatedHandler);
        try {
          const consumer = await this.recvTransport!.consume({
            id: consumerData.id,
            producerId: consumerData.producerId,
            kind: consumerData.kind,
            rtpParameters: consumerData.rtpParameters,
          });
          this.consumers.push(consumer);
          console.log('[Mediasoup] Consumer created for producer:', producerId);
          
          // Create video element for remote stream
          if (consumer.kind === 'video') {
            const video = document.createElement('video');
            video.srcObject = new MediaStream([consumer.track]);
            video.autoplay = true;
            video.id = `video-${remoteUserId || producerId}`;
            video.className = 'remote-video-stream';
            document.getElementById('remote-videos')?.appendChild(video);
            console.log('[Mediasoup] Remote video element created for user:', remoteUserId);
          } else if (consumer.kind === 'audio') {
            const audio = document.createElement('audio');
            audio.srcObject = new MediaStream([consumer.track]);
            audio.autoplay = true;
            audio.id = `audio-${remoteUserId || producerId}`;
            document.getElementById('remote-audios')?.appendChild(audio);
            this.routeAudioElementToPreferredOutput(audio);
            console.log('[Mediasoup] Remote audio element created for user:', remoteUserId);
          }
        } catch (error) {
          console.error('[Mediasoup] Error consuming producer:', error);
        }
      };
      this.socketService.on('mediasoup:consumer-created', consumerCreatedHandler);
    } catch (error) {
      console.error('[Mediasoup] Error in consumeProducer:', error);
    }
  }

  async consumeExistingProducers() {
    if (!this.is_group || !this.device) {
      console.log('[Mediasoup] Cannot consume existing producers: not a group call or missing device');
      return;
    }
    try {
      if (!this.recvTransport) {
        const recvTransportData: any = await firstValueFrom(this.mediasoupService.createTransport(this.call_id, 'recv'));
        this.recvTransport = this.device!.createRecvTransport(recvTransportData);
        console.log('[Mediasoup] RecvTransport created for existing producers:', this.recvTransport.id);
        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            console.log('[Mediasoup] Connecting recv transport:', this.recvTransport!.id, 'userId:', this.currentUserId);
            this.socketService.emit('mediasoup:connect-transport', {
              roomId: this.call_id,
              transportId: this.recvTransport!.id,
              dtlsParameters,
              userId: this.currentUserId
            });
            const transportConnectedHandler = (response: any) => {
              if (response.transportId === this.recvTransport!.id) {
                this.socketService.off('mediasoup:transport-connected', transportConnectedHandler);
                callback();
              }
            };
            this.socketService.on('mediasoup:transport-connected', transportConnectedHandler);
          } catch (err) {
            errback(err as Error);
          }
        });
      }
      const existingProducersResponse: any = await firstValueFrom(this.mediasoupService.getRoomProducers(this.call_id));
      const existingProducers = existingProducersResponse.producers || [];
      console.log('[Mediasoup] Existing producers found:', existingProducers.length);
      for (const producerInfo of existingProducers) {
        if (producerInfo.userId === this.userID) {
          console.log('[Mediasoup] Skipping own producer:', producerInfo.id);
          continue;
        }
        this.consumeProducer(producerInfo.id, producerInfo.userId);
      }
      console.log('[Mediasoup] Finished consuming existing producers');
    } catch (error) {
      console.error('[Mediasoup] Error in consumeExistingProducers:', error);
      this.snackBar.open('Failed to consume existing producers: ' + (error as Error).message, 'close', {
        duration: 5000
      });
    }
  }

  // for slider
  formatLabel(value: number): string {
    if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    }

    return `${value}`;
  }

  handleDisconnect(reason: any = null) {
    this.sound.stop();
    window.clearTimeout(this.timer);
    this.open_audio_dialog = false;
    this.open_audio_notification_dialog = false;
    
    // Only emit end_audio_call for single (1:1) calls, not group calls
    if (!this.is_group && reason && reason === "end_call" && !this.is_user_busy) {
      this.socketService.emit_callback("end_audio_call",{ ...this.data.videoCall_detail },() => {
        this.snackBar.open(`emiting end_audio_call from: ${this.call_id}`, 'close', {duration: 10000});
      });
    }
    
    // Emit user-left for group calls
    if (this.is_group && this.call_id && this.currentUserId && reason === "end_call") {
      console.log('[Handle Disconnect] Emitting user-left-group-call for user:', this.currentUserId);
      this.socketService.emit('user-left-group-call', { 
        call_id: this.call_id, 
        user_id: this.currentUserId 
      });
    }
    
    this.is_user_busy = false;
    
    if (reason && reason === "backdropClick") {
      return;
    } else {
      this.incoming=false;
      this.disconnectStreams();
      this.handleClose();
      this.cdr.detectChanges();
    }
  }
  
  disconnectStreams() {
    // Disconnect local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track:any) => track.stop());
      this.localStream = null;
      this.cdr.detectChanges();
    }
  
    // Disconnect remote stream
    if (this.remoteStream) {
      // this.remoteStream.getTracks().forEach((track:any) => track.stop());
      this.remoteStream = null;
      this.cdr.detectChanges();
    }
    
    // Close any existing peer connection
    if (this.pc) {
      this.pc.close();
      // this.pc = undefined;
    }

    // Mediasoup cleanup for group calls
    if (this.is_group) {
      if (this.sendTransport) this.sendTransport.close();
      if (this.recvTransport) this.recvTransport.close();
      this.producers.forEach(p => p.close());
      this.consumers.forEach(c => c.close());
      this.sendTransport = undefined;
      this.recvTransport = undefined;
      this.producers = [];
      this.consumers = [];
      if (this.mediasoupService && this.call_id && this.currentUserId) {
        this.mediasoupService.leaveRoom(this.call_id, this.currentUserId).toPromise();
      }
    }
    
    // Clear all participant data
    this.participantMuteStatus = {};
    this.participantVideoMuteStatus = {};
    this.joinedParticipants = [];
    
    this.cdr.detectChanges();
  }
  
  handleClose() {
    this.dialogRef.close();
  }

  // initialize all the socket related thing
  initSocketListeners(){
    if (!this.join_call) {
      this.timer = window.setTimeout(() => {
        this.snackBar.open('timer call after 60 seconds', 'close', {duration: 10000});
        this.handleDisconnect();
        this.socketService.emit_callback(
          "audio_call_not_picked",
          { to: this.streamID, from: this.userID,call_id:this.call_id },
          () => {
            this.snackBar.open(`after 60 second timeout emiting audio_call_not_picked from: ${this.userID}`, 'close', {
              duration: 10000
            });
          }
        );
      }, 60 * 1000);
    }

    this.socketService.on("audio_call_missed", (data: any) => {
      if (data && data.call_id && data.call_id !== this.call_id) return;
      console.debug('[VIDEO_CALL] audio_call_missed event received');
      this.handleDisconnect();
      this.snackBar.open(`audio_call_missed socketService.on`, 'close', {
        duration: 10000
      });
    });

    // Handle call accepted by user B
    this.socketService.on("audio_call_accepted", async(data:any) => {
      if (data && data.call_id && data.call_id !== this.call_id) return;
      console.debug('[VIDEO_CALL] audio_call_accepted event received', data);
      window.clearTimeout(this.timer);
      this.snackBar.open(`audio call accepted by ${data}`, 'close', {
        duration: 10000
      });
      this.sound.stop(); //stop sound
      this.callAccepted=true;
      this.cdr.detectChanges();
    });

    this.socketService.on("audio_call_denied", (data:any) => {
      console.debug('[VIDEO_CALL] audio_call_denied event received', data);
      if (!data || data.call_id !== this.call_id) return;
      // If this user is the one who denied, close their dialog
      if (data.from._id === this.userID) {
        this.snackBar.open(`You have left the call.`, 'close', { duration: 10000 });
        window.clearTimeout(this.timer);
        this.sound.stop();
        this.open_audio_dialog = false;
        this.open_audio_notification_dialog = false;
        this.is_user_busy = false;
        this.handleDisconnect();
        this.cdr.detectChanges();
        return;
      }
      // For group: remove the denying user from the participant list and show notification
      if (this.is_group && this.conv_participant) {
        this.conv_participant = this.conv_participant.filter((p: any) => p._id !== data.from._id);
        this.snackBar.open(`${data.from.fullName || 'A user'} declined the call.`, 'close', { duration: 10000 });
        this.cdr.detectChanges();
      }
    });

    // res from other user that they end the call (for single chat only)
    this.socketService.on("end_audio_call_res", (data:any) => {
      if (!data || data.call_id !== this.call_id || (data.from._id !== this.userID && data.to_user_id !== this.userID)) return;
      console.debug('[VIDEO_CALL] end_audio_call_res event received', data);
      window.clearTimeout(this.timer);
      this.snackBar.open(`end_audio_call_res socket.on ${data}`, 'close', {duration: 10000});
      this.sound.stop(); //stop sound
      this.incoming=false;
      this.open_audio_dialog = false;
      this.open_audio_notification_dialog = false;
      this.is_user_busy = false;
      this.handleClose();// at the end call handleClose Dialog
      this.disconnectStreams();
      this.cdr.detectChanges();
    });

    this.socketService.onUserAvailable().subscribe((data) => {
      console.debug('[VIDEO_CALL] user_available event received', data);
      this.snackBar.open(data.message, 'Close', {
        duration: 0,
        panelClass: ['custom-snackbar']
      });
    });

    // ===================== added for group call start====================

    // Listen for user_joined_call event
    this.socketService.on('user_joined_call', (data: any) => {
      console.log('[user_joined_call]',data);
      if (data && data.call_id === this.call_id && data.users) {
        // Replace the entire list with the full list from the server
        this.joinedParticipants = data.users.map((user: any) => ({
          _id: user._id,
          fullName: user.fullName || '',
          profile_pic: user.profile_pic || '',
        }));
        this.cdr.detectChanges();
      }
    });

    // Listen for end_group_call event
    this.socketService.on('end_group_call', (data: any) => {
      if (data && data.call_id === this.call_id) {
        this.handleDisconnect('end_call');
      }
    });

    // Client-side: Listening for when a user leaves the room
    this.socketService.on('user-left', ({ userId }: any) => {
      console.log(`[User Left] User ${userId} left the room`);
      
      // Remove the participant from the joined participants list
      if (this.is_group && this.joinedParticipants) {
        const leavingUser = this.joinedParticipants.find(p => p._id === userId);
        this.joinedParticipants = this.joinedParticipants.filter((p: any) => p._id !== userId);
        
        // If the current user left, close the dialog
        if (userId === this.currentUserId) {
          this.snackBar.open('You have left the call.', 'close', { duration: 10000 });
          this.handleDisconnect();
        } else if (leavingUser) {
          this.snackBar.open(`${leavingUser.fullName || 'A participant'} has left the call.`, 'close', { duration: 10000 });
        }
        this.cdr.detectChanges();
      }
      
      // Remove the participant's video/audio elements from the UI
      const videoElement = document.getElementById(`video-${userId}`);
      if (videoElement) {
        videoElement.remove();
      }
      const audioElement = document.getElementById(`audio-${userId}`);
      if (audioElement) {
        audioElement.remove();
      }
    });

    // Listen for mute status changes from all participants (including self)
    this.socketService.on('user_mute_status_changed', (data: any) => {
      if (data && data.call_id === this.call_id) {
        console.log(`[Mute Status] Received: User ${data.user_id} ${data.is_muted ? 'muted' : 'unmuted'}`);
        this.participantMuteStatus[data.user_id] = data.is_muted;
        
        // If it's the current user, also update the local isMute state
        if (data.user_id === this.currentUserId) {
          this.isMute = data.is_muted;
          console.log(`[Mute Status] Updated local isMute to: ${this.isMute}`);
        }
        
        this.cdr.detectChanges();
      }
    });

    // Listen for video mute status changes
    this.socketService.on('user_video_mute_status_changed', (data: any) => {
      if (data && data.call_id === this.call_id) {
        console.log(`[Video Mute Status] Received: User ${data.user_id} ${data.is_muted ? 'video muted' : 'video unmuted'}`);
        this.participantVideoMuteStatus[data.user_id] = data.is_muted;
        
        // If it's the current user, also update the local isMuteVid state
        if (data.user_id === this.currentUserId) {
          this.isMuteVid = data.is_muted;
          console.log(`[Video Mute Status] Updated local isMuteVid to: ${this.isMuteVid}`);
        }
        
        this.cdr.detectChanges();
      }
    });

    // Listen for initial mute status when joining a call
    this.socketService.on('call_mute_status', (data: any) => {
      if (data && data.call_id === this.call_id && data.mute_status) {
        console.log(`[Initial Mute Status] Received for call ${this.call_id}:`, data.mute_status);
        data.mute_status.forEach((status: any) => {
          this.participantMuteStatus[status.user_id] = status.is_muted;
          this.participantVideoMuteStatus[status.user_id] = status.is_video_muted || false;
          console.log(`[Initial Mute Status] User ${status.user_id}: audio=${status.is_muted ? 'muted' : 'unmuted'}, video=${status.is_video_muted ? 'muted' : 'unmuted'}`);
        });
        this.cdr.detectChanges();
      }
    });

    // ===================== added for group call end====================
  }

  handleAccept() {
    console.log('[Video Call] Call accepted, starting video call setup...');
    this.socketService.emit("audio_call_accepted", { ...this.data.videoCall_detail });
    window.clearTimeout(this.timer);
    this.open_audio_dialog=true;
    this.open_audio_notification_dialog=false;
    this.sound.stop();
    this.callAccepted=true;
    console.log('[Video Call] callAccepted set to true');
    this.cdr.detectChanges();
    
    // Remove calling label
    if (this.is_group) {
      // Add self to joinedParticipants if not present
      const self = this.data.intData.room.loggedUser;
      if (!this.joinedParticipants.find(p => p._id === self.id)) {
        this.joinedParticipants.push({
          _id: self.id,
          fullName: self.name,
          profile_pic: self.profile_pic || '',
        });
      }
      // Emit user_joined_call event with groupName
      this.socketService.emit('user_joined_call', {
        call_id: this.call_id,
        user: {
          _id: self.id,
          fullName: self.name,
          profile_pic: self.profile_pic || '',
        },
        groupName: this.data.videoCall_detail.groupName || this.data.intData.room.selectedRoomDetail.row.conv_name || ''
      });
      this.startGroupCall();
    } else {
      this.startVideoCall();
    }
  };

  handleDeny() {
    this.sound.stop(); //stop sound
    // Notify User A that the call has been denied
    this.socketService.emit("audio_call_denied", { ...this.data.videoCall_detail });
    // dispatch(ResetAudioCallQueue());
    this.handleDisconnect();
  };
  
  // checking profile image privacy status for display image 
  checkPic_privacy(user: { profilePhotoVisibility: string; }){
    return this.chatService.checkPic_privacy(user,this.data.intData.room.loggedUser);
  }

  // Toggle mute start
  toggleMute(type:string) {
    if (this.localStream) {
      if(type=="audio"){
        const audioTracks = this.localStream.getAudioTracks();
        audioTracks[0].enabled = !audioTracks[0].enabled;
        this.isMute=!this.isMute;
        
        console.log(`[Toggle Audio Mute] User ${this.currentUserId} ${this.isMute ? 'muted' : 'unmuted'}`);
        
        // For group calls, emit mute status change to all participants (including self)
        if (this.is_group) {
          this.socketService.emit("user_mute_status_changed", {
            call_id: this.call_id,
            user_id: this.currentUserId,
            is_muted: this.isMute,
            is_group: true
          });
        }
        
        this.cdr.detectChanges();
      }else{
        const videoTracks = this.localStream.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks[0].enabled = !videoTracks[0].enabled;
          this.isMuteVid=!this.isMuteVid;
          
          console.log(`[Toggle Video Mute] User ${this.currentUserId} ${this.isMuteVid ? 'video muted' : 'video unmuted'}`);
          
          // For group calls, emit video mute status change to all participants (including self)
          if (this.is_group) {
            this.socketService.emit("user_video_mute_status_changed", {
              call_id: this.call_id,
              user_id: this.currentUserId,
              is_muted: this.isMuteVid,
              is_group: true
            });
          }
          
          this.cdr.detectChanges();
        }
      }
    }
  }
  // Toggle mute end

  // for switch camera start
  videoDevices: MediaDeviceInfo[] = [];
  currentDeviceId!: string;

  async listVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.videoDevices = devices.filter(device => device.kind === 'videoinput');
    if (this.videoDevices.length > 0) {
      this.currentDeviceId = this.videoDevices[0].deviceId; // Set initial device
    }
  }

  async switchCamera() {
    if(this.currentDeviceId){
      // Get the index of the current device
      const currentIndex = this.videoDevices.findIndex(device => device.deviceId === this.currentDeviceId);
      // Calculate the next device index
      const nextIndex = (currentIndex + 1) % this.videoDevices.length;
    
      // Update the current device ID to the next one
      this.currentDeviceId = this.videoDevices[nextIndex].deviceId;
    
      // Stop the current video track
      this.localStream.getVideoTracks().forEach((track: { stop: () => any; }) => track.stop());
    
      // Reinitialize the media stream with the new device
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: this.currentDeviceId } },
          audio: true // keep audio settings unchanged
        });
        const localVideoElement = this.getLocalVideoElement().nativeElement;
        localVideoElement.srcObject = this.localStream;
    
        // Re-add the new video track to the RTCPeerConnection
        this.pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.kind === 'video') {
            sender.replaceTrack(this.localStream.getVideoTracks()[0]);
          }
        });
      } catch (error) {
        console.error('Error switching camera.', error);
      }
    }
  }
  // for switch camera end

  public endCallForAll() {
    this.socketService.emit('force_end_group_call', {
      call_id: this.call_id,
      user_id: this.userID
    });
    this.handleDisconnect('end_call');
  }

  trackById(index: number, item: any) { return item._id; }

  cleanupMediasoupResources() {
    // Cleanup Mediasoup resources
    if (this.is_group) {
      if (this.sendTransport) this.sendTransport.close();
      if (this.recvTransport) this.recvTransport.close();
      this.producers.forEach(p => p.close());
      this.consumers.forEach(c => c.close());
      this.sendTransport = undefined;
      this.recvTransport = undefined;
      this.producers = [];
      this.consumers = [];
      if (this.mediasoupService && this.call_id && this.currentUserId) {
        this.mediasoupService.leaveRoom(this.call_id, this.currentUserId).toPromise();
      }
    }
    this.cdr.detectChanges();
  }

  // Getter to properly handle userID for both incoming and outgoing calls
  get currentUserId(): string {
    if (this.incoming) {
      return this.data.intData?.room?.loggedUser?.id || this.data.videoCall_detail?.userID;
    }
    return this.data.videoCall_detail?.userID;
  }

  // Debug method to log current state
  debugCurrentState(): void {
    console.log('[Debug State] Current User ID:', this.currentUserId);
    console.log('[Debug State] userID:', this.userID);
    console.log('[Debug State] isMute:', this.isMute);
    console.log('[Debug State] isMuteVid:', this.isMuteVid);
    console.log('[Debug State] participantMuteStatus:', this.participantMuteStatus);
    console.log('[Debug State] participantVideoMuteStatus:', this.participantVideoMuteStatus);
    console.log('[Debug State] joinedParticipants:', this.joinedParticipants);
    
    // Check video elements
    console.log('[Debug State] Video elements:');
    console.log('- localVideoSingle:', this.localVideoSingle?.nativeElement);
    console.log('- localVideoGroup:', this.localVideoGroup?.nativeElement);
    console.log('- remoteVideo:', this.remoteVideo?.nativeElement);
    console.log('- callAccepted:', this.callAccepted);
    console.log('- is_group:', this.is_group);
  }

  private async routeAudioElementToPreferredOutput(audioEl: HTMLAudioElement) {
    try {
      if (!('setSinkId' in HTMLMediaElement.prototype)) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      if (speakers.length === 0) return;
      const headset = speakers.find(d => /jabra|headset|earphone|headphone/i.test(d.label));
      const target = headset || speakers[0];
      // @ts-ignore
      await (audioEl as any).setSinkId(target.deviceId);
    } catch {}
  }

  // Try to avoid loopback devices and enforce strong echo reduction
  private async getSafeAVStream(includeVideo: boolean): Promise<MediaStream> {
    const baseAudio: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    };
    const constraints: MediaStreamConstraints = {
      video: includeVideo,
      audio: baseAudio
    };
    const loopbackPattern = /(stereo mix|what u hear|loopback|mix|wave out|rec playback)/i;
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    try {
      const atrack = stream.getAudioTracks()[0];
      if (atrack) {
        await atrack.applyConstraints(baseAudio);
      }
    } catch {}

    const currentLabel = stream.getAudioTracks()[0]?.label || '';
    if (loopbackPattern.test(currentLabel)) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const candidate = devices.find(d => d.kind === 'audioinput' && !loopbackPattern.test(d.label));
        if (candidate && candidate.deviceId) {
          stream.getTracks().forEach(t => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            video: includeVideo,
            audio: {
              deviceId: { exact: candidate.deviceId },
              ...baseAudio
            }
          });
        }
      } catch {
        // ignore
      }
    }
    return stream;
  }
}