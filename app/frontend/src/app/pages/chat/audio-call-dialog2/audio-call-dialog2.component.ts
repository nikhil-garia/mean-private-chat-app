import { ChangeDetectorRef, Component, ElementRef, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CallService } from '../../../services/call.service';
import { firstValueFrom } from 'rxjs';
import { SocketService } from '../../../services/socket.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { Plog } from '@gpeel/plog';
import { FirstCharsPipe } from "../../../pipes/first-chars.pipe";
import { ChatService } from '../../../services/chat.service';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { SafeImageUrlPipe } from '../../../pipes/safe-image-url.pipe';
import * as mediasoupClient from 'mediasoup-client';
import { MediasoupService } from '../../../services/mediasoup.service';
import { Howl } from 'howler';

@Component({
  selector: 'app-audio-call-dialog2',
  imports: [
    MatDialogModule,
    MatIconModule, MatSliderModule,
    FirstCharsPipe, NgIf, NgFor,SafeImageUrlPipe
  ],
  templateUrl: './audio-call-dialog2.component.html',
  styleUrl: './audio-call-dialog2.component.scss'
})
export class AudioCallDialog2Component implements OnInit {
  // new vars
  @ViewChild('localVideo') localVideo!: ElementRef;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef;

  pc!: RTCPeerConnection;
  private peerConnections: { [userId: string]: RTCPeerConnection } = {}; // for group 
  call_id = this.data.audioCall_detail?.call_id; // its call id with proper var name
  userID = this.data.audioCall_detail?.userID;
  userName = this.data.audioCall_detail?.userName;
  streamID = this.data.audioCall_detail?.streamID;
  conversation_id = this.data.audioCall_detail?.conversation_id;
  is_group = this.data.audioCall_detail?.is_group;
  conv_participant = this.data.audioCall_detail?.conv_participant;
  private callService = inject(CallService);
  private chatService = inject(ChatService);

  localStream!: any; // Assume you have the local stream
  remoteStream: any; // Assume you have the remote stream
  incoming = this.data.incoming ? true : false;

  // Track mute status for each participant
  public participantMuteStatus: { [userId: string]: boolean } = {};
  
  // Track speaking status and audio levels
  public participantSpeakingStatus: { [userId: string]: boolean } = {};
  public participantAudioLevels: { [userId: string]: number } = {};
  public allAudioMuted = false;
  public masterVolume = 50;

  // Audio analysis contexts for cleanup
  private audioContexts: { [userId: string]: AudioContext } = {};
  private audioAnalyzers: { [userId: string]: AnalyserNode } = {};
  private audioSources: { [userId: string]: MediaStreamAudioSourceNode } = {};
  private animationFrames: { [userId: string]: number } = {};

  // Device selection state
  availableAudioInputs: MediaDeviceInfo[] = [];
  availableAudioOutputs: MediaDeviceInfo[] = [];
  currentInputDeviceId: string | null = null;
  outputMode: 'headset' | 'speaker' = 'headset';
  currentInputLabel: string = '';
  currentOutputLabel: string = '';
  isHeadsetMic: boolean = false;

  // dialog status
  open_audio_dialog = false;
  open_audio_notification_dialog = false;
  timer: any;
  serverPath: any;
  sound: any;
  showAudio = true;
  is_user_busy_msg = this.data.audioCall_detail?.is_user_busy_msg;
  is_user_busy = this.data.audioCall_detail?.is_user_busy;
  turn:any;
  servers:any = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // { urls: 'turn:YOUR_PUBLIC_IP:3478', username: 'user', credential: 'password' }
    ]
  };
  joinedParticipants: any[] = [];

  public isInitiator = false;

  // Mediasoup state for group calls
  device: mediasoupClient.types.Device | undefined;
  sendTransport: mediasoupClient.types.Transport | undefined;
  recvTransport: mediasoupClient.types.Transport | undefined;
  producers: any[] = [];
  consumers: any[] = [];

  private mediasoupService = inject(MediasoupService);

  join_call = !!this.data.audioCall_detail?.join_call;

  constructor(public dialogRef: MatDialogRef<AudioCallDialog2Component>, @Inject(MAT_DIALOG_DATA) public data: any, private socketService: SocketService, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef) {
    this.serverPath = this.callService.serverPath;
    this.sound = new Howl({ src: ['assets/media/skype_ringtone.mp3'], loop: true, html5: true });
    // console.log(this.conv_participant);
    this.chatService.GET('/api/v1/turn-credentials').subscribe((turnData: any) => {
      const body = turnData?.body ?? turnData;
      if (body && body.urls) {
        const urls = Array.isArray(body.urls) ? body.urls : [body.urls];
        this.turn = body;
        this.servers = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // { urls: 'turn:YOUR_PUBLIC_IP:3478', username: 'user', credential: 'password' }
            {
              urls: urls[0],
              username: body.username,
              credential: body.credential
            }
          ]
        };
      } else {
        console.error('TURN credentials are invalid or missing:', turnData);
      }
    });
  }

  getCallStatusLabel(): string {
    // For single call
    if (!this.is_group) {
      if (this.incoming) {
        // Callee's view
        return `Incoming call from ${this.data.audioCall_detail.from?.fullName || 'Unknown'}`;
      } else {
        // Caller's view
        return `Calling ${this.data.audioCall_detail.from.fullName || 'Unknown'}`;
      }
    } else {
      // For group call, you can customize as needed
      if(this.join_call){
        return this.data.audioCall_detail.groupName;
      }else if (this.incoming) {
        return `Incoming group(${this.data.audioCall_detail.groupName}) call from ${this.data.audioCall_detail.from?.fullName || 'Unknown'}`;
      } else {
        return `Calling group ${this.data.audioCall_detail.groupName}`;
      }
    }
  }

  handleDisconnect(reason: any = null) {
    this.sound.stop();
    window.clearTimeout(this.timer);
    this.open_audio_dialog = false;
    this.open_audio_notification_dialog = false;
    
    // Only emit end_audio_call for single (1:1) calls, not group calls
    if (!this.is_group && reason && reason === "end_call" && !this.is_user_busy) {
      this.socketService.emit_callback(
        "end_audio_call", { ...this.data.audioCall_detail },
        () => {}
      );
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
      this.incoming = false;
      this.disconnectStreams();
      this.handleClose();
      this.cdr.detectChanges();
    }
  }
  handleClose() {
    this.dialogRef.close();
  }
  disconnectStreams() {
    // Clean up all audio analysis
    this.cleanupAllAudioAnalysis();
    
    // Disconnect local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
      this.cdr.detectChanges();
    }

    // Disconnect remote stream
    if (this.remoteStream) {
      this.remoteStream = null;
      this.cdr.detectChanges();
    }

    // Close all peer connections for group calls
    if (this.peerConnections) {
      Object.values(this.peerConnections).forEach((pc: RTCPeerConnection) => pc.close());
      this.peerConnections = {};
    }

    // Close the main peer connection for single calls
    if (this.pc) {
      this.pc.close();
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
    this.participantSpeakingStatus = {};
    this.participantAudioLevels = {};
    this.joinedParticipants = [];
    
    this.cdr.detectChanges();
  }

  // initialize all the socket related thing
  initSocketListeners() {
    if (!this.join_call) {
      this.timer = window.setTimeout(() => {
        this.snackBar.open('timer call after 60 seconds', 'close', { duration: 10000 });
        this.handleDisconnect();
        this.socketService.emit_callback(
          "audio_call_not_picked",
          { to: this.streamID, from: this.userID, call_id: this.call_id },
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
      console.debug('[AUDIO_CALL] audio_call_missed event received');
      this.handleDisconnect();
      this.snackBar.open(`audio_call_missed socketService.on`, 'close', {
        duration: 10000
      });
    });

    this.socketService.on("audio_call_accepted", (data: any) => {
      console.log('[AUDIO_CALL] audio_call_accepted event received', data);
      if (data && data.call_id && data.call_id !== this.call_id) return;
      console.debug('[AUDIO_CALL] audio_call_accepted event received', data);
      window.clearTimeout(this.timer);
      this.sound.stop(); //stop sound
      this.open_audio_dialog = true;
      this.open_audio_notification_dialog = false;
      this.is_user_busy = false;
      this.cdr.detectChanges();
    });

    this.socketService.on("audio_call_denied", (data: any) => {
      console.debug('[AUDIO_CALL] audio_call_denied event received', data);
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
    this.socketService.on("end_audio_call_res", (data: any) => {
      // console.log('[AUDIO_CALL] end_audio_call_res event received', data);
      if (!data || data.call_id !== this.call_id || (data.from._id !== this.userID && data.to_user_id !== this.userID)) return;
      console.debug('[AUDIO_CALL] end_audio_call_res event received', data);
      window.clearTimeout(this.timer);
      this.snackBar.open(`end_audio_call_res socket.on ${data}`, 'close', { duration: 10000 });
      this.sound.stop(); //stop sound
      this.incoming = false;
      this.open_audio_dialog = false;
      this.open_audio_notification_dialog = false;
      this.is_user_busy = false;
      this.handleClose();// at the end call handleClose Dialog
      this.disconnectStreams();
      this.cdr.detectChanges();
    });

    this.socketService.on("on_another_audio_call", (data: any) => {
      if (!data || data.call_id !== this.call_id || data.from !== this.userID) return;
      this.is_user_busy = true;
      this.snackBar.open("User is busy on another call", "close", { duration: 5000 });
      this.handleDisconnect();
    });

    // Subscribe to the user busy notification
    // this.socketService.onUserBusyNotification().subscribe((data) => {
    //   this.handleUserBusyNotification(data);
    // });
    this.socketService.onUserAvailable().subscribe((data) => {
      console.debug('[AUDIO_CALL] user_available event received', data);
      this.snackBar.open(data.message, 'Close', {
        duration: 0,
        panelClass: ['custom-snackbar']
      });
    });

    // ===================== added for group call start====================

    // Track ICE candidates until remote description is set
    const pendingIceCandidates: { [key: string]: RTCIceCandidate[] } = {};
    // Create a new peer connection for each participant
    this.socketService.on('incomingOffer', async (data: any) => {
      console.log(`incomingOffer= ${data}`);
      console.log(data);
      const { offer, from } = data;
      // Create a new peer connection
      const peerConnection = this.createPeerConnection(from);
      // Store any ICE candidates if they arrive before the remote description is set
      pendingIceCandidates[from] = [];

      // Set remote description
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Process any pending ICE candidates for this connection
      if (pendingIceCandidates[from].length > 0) {
        pendingIceCandidates[from].forEach(candidate => {
          peerConnection.addIceCandidate(candidate)
            .catch(error => console.error('Error adding received ICE candidate:', error));
        });
        // Clear the queue
        pendingIceCandidates[from] = [];
      }

      // Create and send the answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      this.socketService.emit('answer', { answer, room: this.call_id });
    });

    // Answer handler
    this.socketService.on('answer', async (data: any) => {
      console.log(`answer= ${data}`);
      console.log(data);
      const { answer, fromPeerId } = data;
      const peerConnection = this.peerConnections[fromPeerId];
      // Check if peerConnection is in the correct state to set the answer
      if (peerConnection.signalingState === 'have-local-offer') {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

          // Process any pending ICE candidates for this connection
          if (pendingIceCandidates[fromPeerId] && pendingIceCandidates[fromPeerId].length > 0) {
            pendingIceCandidates[fromPeerId].forEach(candidate => {
              peerConnection.addIceCandidate(candidate)
                .catch(error => console.error('Error adding received ICE candidate:', error));
            });
            // Clear the queue
            pendingIceCandidates[fromPeerId] = [];
          }
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    // ICE candidate handler
    this.socketService.on('ice-candidate', (data: any) => {
      console.log(`ice-candidate= ${data}`);
      console.log(data);
      const { candidate, participantId } = data;
      const peerConnection = this.peerConnections[participantId];

      // Check if candidate has valid sdpMid or sdpMLineIndex
      if (!candidate || (candidate.sdpMid === null && candidate.sdpMLineIndex === null)) {
        console.warn('Received invalid ICE candidate:', candidate);
        return;
      }

      if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
        // If the remote description is already set, add the ICE candidate directly
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => console.error('Error adding received ICE candidate:', error));
      } else {
        // Otherwise, queue the candidate for later processing
        if (!pendingIceCandidates[participantId]) {
          pendingIceCandidates[participantId] = [];
        }
        pendingIceCandidates[participantId].push(new RTCIceCandidate(candidate));
      }
    });
    // Client-side: Listening for when a user leaves the room
    this.socketService.on('user-left', ({ userId }: any) => {
      console.log(`[User Left] User ${userId} left the room`);
      
      // Clean up audio analysis for the leaving user
      this.cleanupAudioAnalysis(userId);
      
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
      
      // Remove the participant's audio stream from the UI
      const audioElement = document.getElementById(`audio-${userId}`);
      if (audioElement) {
        audioElement.remove();
      }
      
      // Close peer connection if exists
      if (this.peerConnections[userId]) {
        this.peerConnections[userId].close();
        delete this.peerConnections[userId];
      }
      
      // console.log(`[User Left] Cleanup completed for user: ${userId}`);
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

    // Listen for initial mute status when joining a call
    this.socketService.on('call_mute_status', (data: any) => {
      if (data && data.call_id === this.call_id && data.mute_status) {
        console.log(`[Initial Mute Status] Received for call ${this.call_id}:`, data.mute_status);
        data.mute_status.forEach((status: any) => {
          this.participantMuteStatus[status.user_id] = status.is_muted;
          console.log(`[Initial Mute Status] User ${status.user_id}: ${status.is_muted ? 'muted' : 'unmuted'}`);
        });
        this.cdr.detectChanges();
      }
    });

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

  }

  createPeerConnection(userId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection(this.servers);
    this.peerConnections[userId] = peerConnection;

    // Add local tracks to the peer connection
    if(this.localStream){
      this.localStream.getTracks().forEach((track: any) => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote tracks
    peerConnection.ontrack = (event) => {
      let remoteAudioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
      const remoteStream = event.streams[0];
      if (!remoteAudioElement) {
        this.addRemoteStreamToUI(userId, remoteStream); // Function to add remote stream to the UI
      } else {
        remoteAudioElement.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.emit('ice-candidate', { event: event.candidate, room: this.call_id });
      }
    };

    return peerConnection;
  }
  // ===================== added for group call end====================

  // In mesh logic (if still needed)
  addRemoteStreamToUI(userId: string, stream: MediaStream) {
    // Check if audio element already exists
    let remoteAudioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
    
    if (!remoteAudioElement) {
      remoteAudioElement = document.createElement('audio');
      remoteAudioElement.id = `audio-${userId}`;
      remoteAudioElement.autoplay = true;
      document.getElementById("remote-audios")?.appendChild(remoteAudioElement);
    }
    
    remoteAudioElement.srcObject = stream;
    remoteAudioElement.volume = this.masterVolume / 100;
    remoteAudioElement.muted = this.allAudioMuted;
    this.routeAudioElementToPreferredOutput(remoteAudioElement);
    
    // Add audio analysis for speaking detection (only for remote users)
    if (userId !== this.currentUserId) {
      this.setupAudioAnalysis(userId, stream);
    }
  }

  // Setup audio analysis for speaking detection
  setupAudioAnalysis(userId: string, stream: MediaStream): void {
    try {
      // Clean up existing audio analysis for this user
      this.cleanupAudioAnalysis(userId);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      // Store references for cleanup
      this.audioContexts[userId] = audioContext;
      this.audioSources[userId] = source;
      this.audioAnalyzers[userId] = analyser;
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      
      const checkAudioLevel = () => {
        // Check if analysis should continue
        if (!this.audioAnalyzers[userId]) {
          return; // Analysis was cleaned up
        }
        
        // Check mute status for this user
        const isUserMuted = userId === this.currentUserId ? this.isMute : this.participantMuteStatus[userId];
        
        // If user is muted, force not speaking
        if (isUserMuted) {
          this.updateParticipantSpeakingStatus(userId, false);
          this.updateParticipantAudioLevel(userId, 0);
        }
        // Otherwise, analyze normally
        else {
          analyser.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          const level = (average / 255) * 100;
          
          this.updateParticipantAudioLevel(userId, level);
          // Determine if speaking (threshold can be adjusted)
          const isSpeaking = level > 20; // Increased threshold for more accurate detection
          this.updateParticipantSpeakingStatus(userId, isSpeaking);
          
          // Debug logging for speaking detection
          if (isSpeaking && userId === this.currentUserId) {
            console.log(`[Audio Analysis] Local user speaking detected: level=${level.toFixed(2)}`);
          }
        }
        
        // Continue analysis only if still active
        if (this.audioAnalyzers[userId]) {
          this.animationFrames[userId] = requestAnimationFrame(checkAudioLevel);
        }
      };
      
      this.animationFrames[userId] = requestAnimationFrame(checkAudioLevel);
      console.log(`[Audio Analysis] Started for user: ${userId}`);
    } catch (error) {
      console.warn('Audio analysis not supported for user:', userId, error);
    }
  }

  // Cleanup audio analysis for a specific user
  cleanupAudioAnalysis(userId: string): void {
    if (this.animationFrames[userId]) {
      cancelAnimationFrame(this.animationFrames[userId]);
      delete this.animationFrames[userId];
    }
    
    if (this.audioSources[userId]) {
      this.audioSources[userId].disconnect();
      delete this.audioSources[userId];
    }
    
    if (this.audioAnalyzers[userId]) {
      delete this.audioAnalyzers[userId];
    }
    
    if (this.audioContexts[userId]) {
      this.audioContexts[userId].close();
      delete this.audioContexts[userId];
    }
    
    // Clear speaking status and audio levels
    delete this.participantSpeakingStatus[userId];
    delete this.participantAudioLevels[userId];
    delete this.participantMuteStatus[userId];
    
    // console.log(`[Audio Analysis] Cleaned up for user: ${userId}`);
  }

  // Cleanup all audio analysis
  cleanupAllAudioAnalysis(): void {
    Object.keys(this.audioContexts).forEach(userId => {
      this.cleanupAudioAnalysis(userId);
    });
  }

  // Setup local audio analysis for the current user
  setupLocalAudioAnalysis(stream: MediaStream): void {
    if (this.localStream) {
      console.log(`[Audio Analysis] Setting up local audio analysis for user: ${this.currentUserId}`);
      this.setupAudioAnalysis(this.currentUserId, stream);
      this.debugCurrentState(); // Debug the state after setup
    }
  }

  // Handle the user busy notification
  // handleUserBusyNotification(data: any) {
  //   // Show an alert or a message in the UI
  //   this.busyMessage = data.message || "The user is busy on another call.";
  //   this.cdr.detectChanges();
  // }


  async startAudioCall() {
    let streamID = ''; // for to user id
    if (!this.incoming) {
      console.log(this.data.intData.room.selectedRoomDetail.row);
      if (this.data.intData.room.selectedRoomDetail.row.is_group == false) {
        let touserid = this.data.intData.room.selectedRoomDetail.row.participants.filter(
          (participant: any) => {
            return participant.isme == 'no';
          }
        );
        streamID = touserid[0]._id;
      } else {
        streamID = '';

      }
    } else {
      streamID = this.streamID;
    }
    await this.getSafeMicStream().then(async (steam) => {
      this.localStream = steam;
      // this.localVideo.nativeElement.srcObject = e;
      const local_audioElement = document.getElementById('local-audio') as HTMLAudioElement;
      local_audioElement.srcObject = steam;
      local_audioElement.muted = true;
      local_audioElement.pause();
      
      // Setup local audio analysis
      this.setupLocalAudioAnalysis(steam);
      
      this.cdr.detectChanges();
      if (!this.incoming && !this.is_user_busy) {
        this.socketService.emit("start_audio_call", {
          to: this.streamID,
          from: this.userID,
          call_id: this.call_id,
          conversation_id: this.conversation_id,
          is_group: this.is_group,
          conv_participant: this.conv_participant
        });
        Plog.debug('Notify User B of the call via Socket.io');
        this.snackBar.open(`start_audio_call emit {from: ${this.userID} }, {to: ${this.streamID} } `, 'close', {
          duration: 10000
        });
      }

      this.pc = new RTCPeerConnection(this.servers);

      // Add local stream tracks to the peer connection
      this.localStream.getTracks().forEach((track: any) => {
        this.pc.addTrack(track, this.localStream);
      });
      // countrinue if to user if not busy
      if (!this.is_user_busy) {
        this.pc.ontrack = (event) => {
          console.log('remote event.streams');
          console.log(event.streams);
          const [remoteStream] = event.streams;
          this.remoteStream = event.streams;
          // this.remoteVideo.nativeElement.srcObject = remoteStream;
          const r_audioElement = document.getElementById('remote-audio') as HTMLAudioElement;
          r_audioElement.srcObject = remoteStream;
          r_audioElement.play();
          this.routeAudioElementToPreferredOutput(r_audioElement);
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
    })
  }

  async ngOnInit(): Promise<void> {
    Plog.debug('audio component initialized..');
    // Always reset state on open
    this.open_audio_dialog = false;
    this.open_audio_notification_dialog = false;
    this.is_user_busy = this.data.audioCall_detail?.is_user_busy;
    this.initSocketListeners();
    // enumerate audio devices for routing and switching
    await this.initAudioDevices();
    // Set isInitiator if current user is the call initiator
    this.isInitiator = (this.data.audioCall_detail?.from?._id === this.userID);
    this.cdr.detectChanges();
    if (!this.incoming) {
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
          groupName: this.data.audioCall_detail.groupName || this.data.intData.room.selectedRoomDetail.row.conv_name || ''
        });
        if (this.join_call) {
          await this.joinOngoingGroupCall();
        } else {
          await this.startGroupCall();
        }
      } else {
        this.startAudioCall(); //only for single chat
      }
    } else {
      this.open_audio_notification_dialog = true;
      // Only start timeout for incoming calls that are not joining an ongoing call
      if (!this.join_call) {
        this.sound.play(); //play sound only for new incoming calls
      }
    }
    this.cdr.detectChanges();
  }

  // Refactored Mediasoup setup for both start and join
  async setupMediasoupGroupCall() {
    const roomId = this.call_id;
    const userId = this.userID;
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
    // 6. Get user media and produce audio
    const stream = await this.getSafeMicStream();
    this.localStream = stream;
    this.setupLocalAudioAnalysis(stream);
    const track = stream.getAudioTracks()[0];
    const producer = await this.sendTransport.produce({ track });
    this.producers.push(producer);
    console.log('[Mediasoup] Audio producer created:', producer.id);
    // 7. Listen for new producers from other participants
    this.listenForNewProducers();
    // 8. Consume existing producers in the room
    await this.consumeExistingProducers();
    console.log('[Mediasoup] Group call started/joined successfully');
  }

  async startGroupCall() {
    console.log('startGroupCall calling');
    if (!this.is_group) return; // Only for group calls

    try {
      // Emit start_audio_call to backend if this user is the initiator
      if (!this.incoming && !this.is_user_busy) {
        this.socketService.emit("start_audio_call", {
          to: this.streamID,
          from: this.userID,
          call_id: this.call_id,
          conversation_id: this.conversation_id,
          is_group: this.is_group,
          conv_participant: this.conv_participant
        });
        this.snackBar.open(`start_audio_call emit {from: ${this.userID} }, {to: ${this.streamID} } `, 'close', {
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

      // Use shared setup method (no start_audio_call emit)
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

  handleAccept() {
    this.socketService.emit("audio_call_accepted", { ...this.data.audioCall_detail });
    window.clearTimeout(this.timer);
    this.open_audio_dialog = true;
    this.open_audio_notification_dialog = false;
    this.sound.stop();
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
        groupName: this.data.audioCall_detail.groupName || this.data.intData.room.selectedRoomDetail.row.conv_name || ''
      });
      this.startGroupCall();
    } else {
      this.startAudioCall();
    }
  };

  handleDeny() {
    this.sound.stop();
    this.socketService.emit("audio_call_denied", { ...this.data.audioCall_detail });
    this.handleDisconnect();
  };
  // checking profile image privacy status for display image 
  checkPic_privacy(user: { profilePhotoVisibility: string; }) {
    return this.chatService.checkPic_privacy(user, this.data.intData.room.loggedUser);
  }

  // Toggle mute start
  isMute = false;
  toggleMute() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks[0].enabled = !audioTracks[0].enabled;
      this.isMute = !this.isMute;
      
      console.log(`[Toggle Mute] User ${this.currentUserId} ${this.isMute ? 'muted' : 'unmuted'}`);
      
      // For group calls, emit mute status change to all participants (including self)
      if (this.is_group) {
        this.socketService.emit("user_mute_status_changed", {
          call_id: this.call_id,
          user_id: this.currentUserId, // Use currentUserId instead of userID
          is_muted: this.isMute,
          is_group: true
        });
      }
    }
  }
  // Toggle mute end

  // toggle speaker start
  async setOutputDevice(deviceId: string) {
    if (this.remoteStream) {
      const audioElement = document.getElementById('remote-audio') as HTMLAudioElement;
      if (typeof audioElement.sinkId !== 'undefined') {
        await audioElement.setSinkId(deviceId);
      } else {
        console.warn("Browser doesn't support output device selection.");
      }
    }
  }
  // toggle speaker end

  listenForNewProducers() {
    if (!this.is_group) return;
    this.socketService.off('mediasoup:new-producer');
    this.socketService.on('mediasoup:new-producer', async (data: any) => {
      // Avoid consuming our own audio producer to prevent echo
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
          const audio = document.createElement('audio');
          audio.srcObject = new MediaStream([consumer.track]);
          audio.autoplay = true;
          audio.volume = this.masterVolume / 100;
          audio.muted = this.allAudioMuted;
          audio.id = `audio-${remoteUserId || producerId}`;
          document.getElementById('remote-audios')?.appendChild(audio);
          this.routeAudioElementToPreferredOutput(audio);
          console.log('[Mediasoup] Remote audio element created for user:', remoteUserId);
          this.setupAudioAnalysis(remoteUserId || producerId, new MediaStream([consumer.track]));
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

  public endCallForAll() {
    this.socketService.emit('force_end_group_call', {
      call_id: this.call_id,
      user_id: this.userID
    });
    this.handleDisconnect('end_call');
  }

  trackById(index: number, item: any) { return item._id; }

  // Audio management methods
  isParticipantSpeaking(userId: string): boolean {
    return this.participantSpeakingStatus[userId] || false;
  }

  getAudioLevel(userId: string): number {
    return this.participantAudioLevels[userId] || 0;
  }

  setMasterVolume(event: any): void {
    this.masterVolume = event.target.value;
    // Apply volume to all remote audio elements
    const audioElements = document.querySelectorAll('#remote-audios audio');
    audioElements.forEach((audio: any) => {
      audio.volume = this.masterVolume / 100;
    });
  }

  toggleAllAudio(): void {
    this.allAudioMuted = !this.allAudioMuted;
    const audioElements = document.querySelectorAll('#remote-audios audio');
    audioElements.forEach((audio: any) => {
      audio.muted = this.allAudioMuted;
    });
  }

  // Route audio to non-headset speakers if desired (helps reduce sidetone-based echo in some setups)
  private async routeAudioElementToPreferredOutput(audioEl: HTMLAudioElement) {
    try {
      if (!('setSinkId' in HTMLMediaElement.prototype)) return;
      if (this.availableAudioOutputs.length === 0) await this.initAudioDevices();
      const target = this.findOutputDeviceForMode(this.outputMode);
      const targetDeviceId = target?.deviceId;
      if (!targetDeviceId) return;
      // @ts-ignore sinkId exists on supported browsers
      await (audioEl as any).setSinkId(targetDeviceId);
      this.currentOutputLabel = target?.label || '';
    } catch {
      // ignore routing errors
    }
  }

  private async initAudioDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableAudioInputs = devices.filter(d => d.kind === 'audioinput');
      this.availableAudioOutputs = devices.filter(d => d.kind === 'audiooutput');
    } catch {}
  }

  private findOutputDeviceForMode(mode: 'headset' | 'speaker'): MediaDeviceInfo | null {
    if (this.availableAudioOutputs.length === 0) return null;
    const score = (d: MediaDeviceInfo) => {
      const lbl = (d.label || '').toLowerCase();
      const isJabra = lbl.includes('jabra');
      const isHeadset = isJabra || /headset|earphone|earbud|buds|airpods|bluetooth/.test(lbl);
      const isSpeaker = lbl.includes('speaker') || lbl.includes('realtek');
      return { lbl, isJabra, isHeadset, isSpeaker };
    };
    const outs = this.availableAudioOutputs.map(d => ({ d, ...score(d) }));
    if (mode === 'headset') {
      const pick = outs.find(o => o.isJabra) || outs.find(o => o.isHeadset) || outs[0];
      return pick?.d || null;
    }
    // speaker mode: prefer explicit speakers and avoid Jabra/headsets when possible
    const pick = outs.find(o => o.isSpeaker && !o.isJabra)
      || outs.find(o => !o.isHeadset)
      || outs[0];
    return pick?.d || null;
  }

  // Toggle output device between headset and speakers
  async toggleOutputMode(): Promise<void> {
    this.outputMode = this.outputMode === 'headset' ? 'speaker' : 'headset';
    await this.initAudioDevices();
    // Update all remote audio elements
    const audioEls = Array.from(document.querySelectorAll('#remote-audios audio')) as HTMLAudioElement[];
    for (const el of audioEls) {
      await this.routeAudioElementToPreferredOutput(el);
    }
    // Also update single-call element if present
    const singleEl = document.getElementById('remote-audio') as HTMLAudioElement | null;
    if (singleEl) await this.routeAudioElementToPreferredOutput(singleEl);
    this.cdr.detectChanges();
  }

  // Switch microphone input between headset mic and built-in mic
  async toggleMicrophoneInput(): Promise<void> {
    try {
      const isHeadset = (label: string) => /jabra|headset|earphone|headphone/i.test(label);
      if (this.availableAudioInputs.length === 0) await this.initAudioDevices();
      const currentTrack = this.localStream?.getAudioTracks?.()[0];
      const currentLabel = currentTrack?.label || '';
      // Choose the opposite type from current
      const targetDevice = isHeadset(currentLabel)
        ? this.availableAudioInputs.find(d => !isHeadset(d.label))
        : (this.availableAudioInputs.find(d => isHeadset(d.label)) || this.availableAudioInputs[0]);
      const preferredId = targetDevice?.deviceId;
      const newStream = await this.getSafeMicStream(preferredId || undefined);
      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;

      // Update UI state
      this.currentInputLabel = newTrack.label || this.currentInputLabel;
      this.isHeadsetMic = /jabra|headset|earphone|headphone/i.test(this.currentInputLabel);

      // Replace in local stream
      if (!this.localStream) this.localStream = new MediaStream();
      // stop old track
      if (currentTrack) currentTrack.stop();
      // Remove old audio tracks from localStream
      this.localStream.getAudioTracks().forEach((t: MediaStreamTrack) => this.localStream.removeTrack(t));
      this.localStream.addTrack(newTrack);

      // Replace in WebRTC (1:1)
      if (this.pc) {
        const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) await sender.replaceTrack(newTrack);
      }

      // Replace in Mediasoup (group)
      if (this.is_group && this.producers && this.producers.length > 0) {
        const audioProducer = this.producers.find((p: any) => (p?.track?.kind === 'audio') || p?.kind === 'audio');
        if (audioProducer && typeof audioProducer.replaceTrack === 'function') {
          await audioProducer.replaceTrack({ track: newTrack });
        } else if (audioProducer && this.sendTransport) {
          try { audioProducer.close?.(); } catch {}
          const repl = await this.sendTransport.produce({ track: newTrack });
          // swap in array
          const idx = this.producers.indexOf(audioProducer);
          if (idx >= 0) this.producers[idx] = repl; else this.producers.push(repl);
        }
      }

      // Update local preview element if present
      const localAudioEl = document.getElementById('local-audio') as HTMLAudioElement | null;
      if (localAudioEl) {
        const s = localAudioEl.srcObject as MediaStream | null;
        if (s) {
          s.getAudioTracks().forEach((t: MediaStreamTrack) => s.removeTrack(t));
          s.addTrack(newTrack);
        } else {
          localAudioEl.srcObject = new MediaStream([newTrack]);
        }
        localAudioEl.muted = true;
      }
    } catch (e) {
      console.warn('Failed to switch microphone device', e);
    }
  }

  // Update speaking status for a participant
  updateParticipantSpeakingStatus(userId: string, isSpeaking: boolean): void {
    const wasSpeaking = this.participantSpeakingStatus[userId];
    this.participantSpeakingStatus[userId] = isSpeaking;
    
    // Debug logging for speaking status changes
    if (wasSpeaking !== isSpeaking) {
      console.log(`[Speaking Status] User ${userId} ${isSpeaking ? 'started' : 'stopped'} speaking`);
    }
    
    this.cdr.detectChanges();
  }

  // Update audio level for a participant
  updateParticipantAudioLevel(userId: string, level: number): void {
    this.participantAudioLevels[userId] = Math.min(100, Math.max(0, level));
    this.cdr.detectChanges();
  }

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

  // Remove participant from all lists and cleanup resources
  removeParticipant(userId: string): void {
    console.log(`[Remove Participant] Removing user: ${userId}`);
    
    // Clean up audio analysis
    this.cleanupAudioAnalysis(userId);
    
    // Remove from joined participants
    this.joinedParticipants = this.joinedParticipants.filter(p => p._id !== userId);
    
    // Remove from conversation participants (if still using)
    if (this.conv_participant) {
      this.conv_participant = this.conv_participant.filter((p: any) => p._id !== userId);
    }
    
    // Remove audio element
    const audioElement = document.getElementById(`audio-${userId}`);
    if (audioElement) {
      audioElement.remove();
    }
    
    // Close peer connection
    if (this.peerConnections[userId]) {
      this.peerConnections[userId].close();
      delete this.peerConnections[userId];
    }
    
    // Clear participant data
    delete this.participantMuteStatus[userId];
    delete this.participantSpeakingStatus[userId];
    delete this.participantAudioLevels[userId];
    
    this.cdr.detectChanges();
    console.log(`[Remove Participant] Completed for user: ${userId}`);
  }

  // Getter to properly handle userID for both incoming and outgoing calls
  get currentUserId(): string {
    if (this.incoming) {
      return this.data.intData?.room?.loggedUser?.id || this.data.audioCall_detail?.userID;
    }
    return this.data.audioCall_detail?.userID;
  }

  // Debug method to log current state
  debugCurrentState(): void {
    console.log('[Debug State] Current User ID:', this.currentUserId);
    console.log('[Debug State] userID:', this.userID);
    console.log('[Debug State] isMute:', this.isMute);
    console.log('[Debug State] participantMuteStatus:', this.participantMuteStatus);
    console.log('[Debug State] participantSpeakingStatus:', this.participantSpeakingStatus);
    console.log('[Debug State] participantAudioLevels:', this.participantAudioLevels);
    console.log('[Debug State] joinedParticipants:', this.joinedParticipants);
  }

  // Attempt to avoid loopback devices (Stereo Mix/What U Hear) and enforce strong echo-reduction
  private async getSafeMicStream(preferredDeviceId?: string): Promise<MediaStream> {
    const baseConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    };

    const loopbackPattern = /(stereo mix|what u hear|loopback|mix|wave out|rec playback)/i;
    const headsetPattern = /(jabra|headset|earphone|headphone)/i;
    // First attempt (prefer a requested device if provided)
    let stream = await navigator.mediaDevices.getUserMedia(
      preferredDeviceId
        ? { audio: { ...(baseConstraints.audio as MediaTrackConstraints), deviceId: { exact: preferredDeviceId } } }
        : baseConstraints
    );
    try {
      const track = stream.getAudioTracks()[0];
      if (track) {
        await track.applyConstraints({ echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } as MediaTrackConstraints);
      }
      this.currentInputLabel = track?.label || '';
      this.isHeadsetMic = /jabra|headset|earphone|headphone/i.test(this.currentInputLabel);
    } catch {}

    // If selected input seems to be a loopback device, pick a different mic
    const currentLabel = stream.getAudioTracks()[0]?.label || '';
    if (loopbackPattern.test(currentLabel) || !headsetPattern.test(currentLabel)) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const candidate = devices.find(d => d.kind === 'audioinput' && headsetPattern.test(d.label))
          || devices.find(d => d.kind === 'audioinput' && !loopbackPattern.test(d.label));
        if (candidate && candidate.deviceId) {
          stream.getTracks().forEach(t => t.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: candidate.deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1
            }
          });
          this.currentInputLabel = candidate.label || '';
          this.isHeadsetMic = /jabra|headset|earphone|headphone/i.test(this.currentInputLabel);
        }
      } catch {
        // keep original stream if re-selection fails
      }
    }
    return stream;
  }
}

