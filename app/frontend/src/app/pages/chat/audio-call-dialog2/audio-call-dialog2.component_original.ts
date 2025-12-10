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
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-audio-call-dialog2',
  imports: [
    MatDialogModule,
    MatIconModule, MatSliderModule,
    FirstCharsPipe, NgIf
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

  // dialog status
  open_audio_dialog = false;
  open_audio_notification_dialog = false;
  timer: any;
  serverPath: any;
  sound: any;
  showAudio = true;
  is_user_busy_msg = this.data.audioCall_detail?.is_user_busy_msg;
  is_user_busy = this.data.audioCall_detail?.is_user_busy;

  servers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  };

  constructor(public dialogRef: MatDialogRef<AudioCallDialog2Component>, @Inject(MAT_DIALOG_DATA) public data: any, private socketService: SocketService, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef) {
    this.serverPath = this.callService.serverPath;
    this.sound = new Howl({ src: ['assets/media/skype_ringtone.mp3'], loop: true, html5: true });
    // console.log(this.conv_participant);
  }
  handleDisconnect(reason: any = null) {
    this.sound.stop(); //stop sound
    window.clearTimeout(this.timer);

    if (reason && reason === "backdropClick") {
      return;
    } else {
      this.incoming = false;
      // for end call button clicked
      if (reason && reason === "end_call" && !this.is_user_busy) {
        this.socketService.emit_callback(
          "end_audio_call", { ...this.data.audioCall_detail },
          () => {
            this.snackBar.open(`emiting end_audio_call from: ${this.call_id}`, 'close', {
              duration: 10000
            });
            // TODO abort call => Call verdict will be marked as Missed
          }
        );
      }

      // at the end call handleClose Dialog
      this.handleClose();
      this.disconnectStreams();

      // clean up event listners
      // this.socketService?.off("audio_call_accepted");
      // this.socketService?.off("audio_call_denied");
      // this.socketService?.off("audio_call_missed");
    }
  }
  handleClose() {
    this.dialogRef.close();
  }
  disconnectStreams() {
    // Disconnect local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
      this.cdr.detectChanges();
    }

    // Disconnect remote stream
    if (this.remoteStream) {
      // this.remoteStream.getTracks().forEach((track:any) => track.stop());
      this.remoteStream = null;
      this.cdr.detectChanges();
    }

    // Close single call peer connection
    if (this.pc) {
      this.pc.close();
      // this.pc = undefined;
    }

    // Close all group call peer connections
    if (this.peerConnections) {
      Object.values(this.peerConnections).forEach((pc: RTCPeerConnection) => {
        try {
          pc.close();
        } catch (e) {
          console.warn('Error closing peer connection:', e);
        }
      });
      this.peerConnections = {};
    }
  }

  // initialize all the socket related thing
  initSocketListeners() {
    this.timer = window.setTimeout(() => {
      // TODO => You can play an audio indicating missed call at this line at sender's end
      // console.log(this.timer);
      this.snackBar.open('timer call after 60 seconds', 'close', { duration: 10000 });
      this.handleDisconnect();
      // alert('timer call after 30 seconds');
      this.socketService.emit_callback(
        "audio_call_not_picked",
        { to: this.streamID, from: this.userID, call_id: this.call_id },
        () => {
          this.snackBar.open(`after 60 second timeout emiting audio_call_not_picked from: ${this.userID}`, 'close', {
            duration: 10000
          });
          // TODO abort call => Call verdict will be marked as Missed
        }
      );
    }, 60 * 1000);

    this.socketService.on("audio_call_missed", () => {
      // console.log('audio_call_missed on');
      // TODO => You can play an audio indicating call is missed at receiver's end
      // Abort call
      this.handleDisconnect();
      this.snackBar.open(`audio_call_missed socketService.on`, 'close', {
        duration: 10000
      });
    });

    this.socketService.on("audio_call_accepted", (data: any) => {
      // TODO => You can play an audio indicating call is started
      // clear timeout for "audio_call_not_picked"
      window.clearTimeout(this.timer);
      console.error('audio call accepted by ');
      console.error(data);
      this.snackBar.open(`audio call accepted by ${data}`, 'close', {
        duration: 10000
      });
      this.sound.stop(); //stop sound
    });

    this.socketService.on("audio_call_denied", (data: any) => {
      console.error('audio call denied by ');
      console.error(data);
      this.snackBar.open(`audio_call_denied socket.on ${data}`, 'close', {
        duration: 10000
      });
      window.clearTimeout(this.timer);
      // TODO => You can play an audio indicating call is denined
      // ABORT CALL
      this.handleDisconnect();
    });
    // res from other user that they end the call (for single chat only)
    this.socketService.on("end_audio_call_res", (data: any) => {
      window.clearTimeout(this.timer);
      console.error('audio call end by ');
      console.error(data);
      this.snackBar.open(`end_audio_call_res socket.on ${data}`, 'close', { duration: 10000 });
      // ABORT CALL
      this.sound.stop(); //stop sound
      this.incoming = false;
      this.handleClose();// at the end call handleClose Dialog
      this.disconnectStreams();
      this.cdr.detectChanges();
    });

    // Subscribe to the user busy notification
    // this.socketService.onUserBusyNotification().subscribe((data) => {
    //   this.handleUserBusyNotification(data);
    // });
    this.socketService.onUserAvailable().subscribe((data) => {
      // console.log('onUserAvailable');
      // console.log(data);
      this.snackBar.open(data.message, 'Close', {
        duration: 0, // Set duration to 0 to keep it open indefinitely
        panelClass: ['custom-snackbar'] // Optional: add custom styles if needed
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
      console.log(`User ${userId} left the room`);
      // Remove the participant's video stream from the UI
      const videoElement = document.getElementById(`video-${userId}`);
      if (videoElement) {
        videoElement.remove();
      }

      // Close the peer connection
      if (this.peerConnections[userId]) {
        this.peerConnections[userId].close();
        delete this.peerConnections[userId];
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
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(async (steam) => {
      this.localStream = steam;
      // this.localVideo.nativeElement.srcObject = e;
      const local_audioElement = document.getElementById('local-audio') as HTMLAudioElement;
      local_audioElement.srcObject = steam;
      local_audioElement.pause();
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

      this.pc = new RTCPeerConnection();

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
    this.initSocketListeners();
    if (!this.incoming) {
      if (this.is_group) {
        this.startGroupCall(); // for group
      } else {
        this.startAudioCall(); //only for single chat
      }
    } else {
      this.open_audio_notification_dialog = true;
    }
    this.sound.play(); //play sound
  }
  handleAccept() {
    this.socketService.emit("audio_call_accepted", { ...this.data.audioCall_detail });
    // dispatch(UpdateAudioCallDialog({ state: true }));
    window.clearTimeout(this.timer);
    this.open_audio_dialog = true;
    this.open_audio_notification_dialog = false;
    this.sound.stop(); //stop sound
    // Accept the call
    if (this.is_group) {
      this.startGroupCall(); // for group
    } else {
      this.startAudioCall(); //only for single chat
    }
  };

  handleDeny() {
    this.sound.stop(); //stop sound
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

  // new for group call start
  async startGroupCall() {
    console.log('startGroupCall calling');
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(async (steam) => {
      this.localStream = steam;
      // this.localVideo.nativeElement.srcObject = e;
      const local_audioElement = document.getElementById('local-audio') as HTMLAudioElement;
      local_audioElement.srcObject = steam;
      local_audioElement.pause();
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
      // The current user initiating the call
      // console.log('this.conv_participant');
      // console.log(this.conv_participant);
      // Loop through each participant in the room and create a peer connection
      for (const participant of this.conv_participant) {
        if (participant._id === this.data.intData.room.loggedUser.id) continue; // Skip if it's the current user

        // Setup the peer connection for each participant
        const peerConnection = this.setupPeerConnection(participant._id);

        // Emit the 'join-room' event to the server to join the specific room
        this.socketService.joinRoom(this.call_id);

        // Create an offer and set the local description
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Send the offer to the server
        this.socketService.emit('offer', { offer, room: this.call_id });
      }
      // console.log(filter);
    })
  }
  configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' } // Use STUN servers to get the ICE candidates
    ]
  };

  // Function to set up a peer connection for a given participant
  setupPeerConnection(userId: string): RTCPeerConnection {
    // Create a new RTCPeerConnection
    const peerConnection = new RTCPeerConnection(this.configuration);
    this.peerConnections[userId] = peerConnection;

    // Add local media tracks to the connection
    this.localStream.getTracks().forEach((track: any) => {
      peerConnection.addTrack(track, this.localStream);
    });

    // Handle the remote stream from the other participant
    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      this.addRemoteStreamToUI(userId, remoteStream); // Function to add remote stream to the UI
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to the server
        this.socketService.emit('ice-candidate', { candidate: event.candidate, room: this.call_id });
      }
    };

    return peerConnection;
  }
  // Helper function to add the remote stream to the UI
  addRemoteStreamToUI(userId: string, stream: MediaStream) {
    const remoteAudioElement = document.createElement('audio');
    remoteAudioElement.id = `audio-${userId}`;
    remoteAudioElement.srcObject = stream;
    remoteAudioElement.autoplay = true;
    // remoteAudioElement.playsInline = true; // For better mobile browser support
    document.getElementById("remote-audios")?.appendChild(remoteAudioElement);
  }
}

