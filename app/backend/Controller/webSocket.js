const socketIo = require("socket.io");
const {
  createMsg,
  DelMsg,
  updateUserSocket,
  getLoggedUser,
  updateUserStatus,
  friendReq,
  markAsDelivered,
  markConvAsRead,
  BookmarkMsg,
  notificationSeen
} = require("./chatCon");
const { startCall } = require("./userCon");
const UserModel = require("../models/userModel");
const Call = require("../models/call");
const Conversation = require("../models/convModel");

// Constants
const SOCKET_CONFIG = {
  cors: {
    origin: process.env.origin || "http://localhost:4200",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
};

const CALL_STATUS = {
  BUSY: 'busy',
  AVAILABLE: 'available'
};

const CALL_VERDICT = {
  ACCEPTED: 'Accepted',
  DENIED: 'Denied',
  MISSED: 'Missed',
  BUSY: 'Busy'
};

// State management class
class WebSocketState {
  constructor() {
    this.users = new Map(); // userId -> socketId
    this.userCallStatus = new Map(); // userId -> status
    this.waitingList = new Map(); // userId -> [waitingUserIds]
    this.muteStatus = new Map(); // callId -> { userId: boolean }
    this.videoMuteStatus = new Map(); // callId -> { userId: boolean }
    this.joinedUsersByCallId = new Map(); // callId -> [users]
    this.userCallRooms = new Map(); // socketId -> roomId
  }

  addUser(userId, socketId) {
    this.users.set(userId, socketId);
  }

  removeUser(userId) {
    this.users.delete(userId);
    this.userCallStatus.delete(userId);
    this.waitingList.delete(userId);
  }

  getUserSocketId(userId) {
    return this.users.get(userId);
  }

  getOnlineUsers() {
    return Array.from(this.users.keys());
  }

  setCallStatus(userId, status) {
    this.userCallStatus.set(userId, status);
  }

  getCallStatus(userId) {
    return this.userCallStatus.get(userId) || CALL_STATUS.AVAILABLE;
  }

  addToWaitingList(userId, waitingUserId) {
    if (!this.waitingList.has(userId)) {
      this.waitingList.set(userId, []);
    }
    this.waitingList.get(userId).push(waitingUserId);
  }

  clearWaitingList(userId) {
    this.waitingList.delete(userId);
  }

  addJoinedUser(callId, user) {
    if (!this.joinedUsersByCallId.has(callId)) {
      this.joinedUsersByCallId.set(callId, []);
    }
    const users = this.joinedUsersByCallId.get(callId);
    if (!users.find(u => u._id === user._id)) {
      users.push(user);
    }
  }

  removeJoinedUser(callId, userId) {
    const users = this.joinedUsersByCallId.get(callId);
    if (users) {
      const filteredUsers = users.filter(u => u._id !== userId);
      if (filteredUsers.length === 0) {
        this.joinedUsersByCallId.delete(callId);
        return null; // No users left
      }
      this.joinedUsersByCallId.set(callId, filteredUsers);
      return filteredUsers;
    }
    return null;
  }

  setUserCallRoom(socketId, roomId) {
    this.userCallRooms.set(socketId, roomId);
  }

  getUserCallRoom(socketId) {
    return this.userCallRooms.get(socketId);
  }

  removeUserCallRoom(socketId) {
    this.userCallRooms.delete(socketId);
  }
}

// Event handler classes
class ChatEventHandler {
  constructor(io, state) {
    this.io = io;
    this.state = state;
  }

  async handleSendMessage(socket, data) {
    try {
      const res = await createMsg(data);
      
      // Update message data with response
      Object.assign(data, {
        _id: res.data._id,
        full_send_datetime: res.data.send_datetime,
        attachments: res.data.attachments,
        ...(res.temp_conversation_id && { temp_conversation_id: res.temp_conversation_id })
      });

      socket.emit('msg_send_res_self', data);

      if (res.status === 200) {
        if (data.chat_type === true) {
          socket.to(`chat-room-${data.conversation_id}`).emit("rec_msg", data);
        } else {
          const toSocketId = this.state.getUserSocketId(data.to);
          if (toSocketId) {
            socket.broadcast.to(toSocketId).emit("rec_msg", data);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handleDeleteMessage(socket, data) {
    try {
      const res = await DelMsg(data);
      
      if (res.status === 200) {
        const convId = data.conversation_id._id || data.conversation_id;
        
        if (data.chat_type === 1) {
          socket.to(`chat-room-${convId}`).emit("rec_del_msg", data);
        } else {
          const toId = data.to_id || data.to._id;
          const toSocketId = this.state.getUserSocketId(toId);
          if (toSocketId) {
            socket.broadcast.to(toSocketId).emit("rec_del_msg", data);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  }

  async handleBookmarkMessage(socket, data, callback) {
    try {
      const res = await BookmarkMsg(data);
      callback(res);
    } catch (error) {
      console.error('Error bookmarking message:', error);
      callback({ status: 500, message: 'Failed to bookmark message' });
    }
  }

  async handleMessageDelivered(socket, data, userId) {
    try {
      const res = await markAsDelivered(data, userId);
      
      if (res.status === 200) {
        data.deliveredTo = res.data.deliveredTo;
        
        if (data.chat_type !== true) {
          const toSocketId = this.state.getUserSocketId(data.from.id);
          if (toSocketId) {
            socket.broadcast.to(toSocketId).emit("message-delivered", data);
          }
        }
      }
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  }

  async handleMarkConversationAsRead(socket, data, userId, callback) {
    try {
      const data2 = { conv_id: data._id, user_id: userId };
      const res = await markConvAsRead(data2);
      
      if (res.status === 200) {
        if (data.is_group === true) {
          const myUserDetail = data.participants.find(e => e._id === userId);
          socket.to(`chat-room-${data._id}`).emit("markConvAsRead_res", data, myUserDetail);
        } else {
          const otherUser = data.participants.find(e => e._id !== userId);
          const toSocketId = this.state.getUserSocketId(otherUser._id);
          if (toSocketId) {
            socket.broadcast.to(toSocketId).emit("markConvAsRead_res", data, userId);
          }
        }
        callback(res);
      } else {
        callback([]);
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      callback([]);
    }
  }

  handleJoinChatRoom(socket, data) {
    data.forEach(conversation => {
      socket.join(`chat-room-${conversation._id}`);
    });
  }

  async handleTyping(socket, data, isTyping) {
    try {
      const { loggedUser, conv_participant, conv_id, is_group } = data;
      
      if (!is_group) {
        const toUser = conv_participant.find(e => e.isme === 'no');
        const to = await UserModel.findById(toUser._id).select("socket_id");
        
        if (to?.socket_id) {
          const eventName = isTyping ? "start_typing_rec" : "stop_typing_rec";
          this.io.to(to.socket_id).emit(eventName, {
            from: loggedUser,
            to: toUser,
            conv_id,
            is_group
          });
        }
      } else {
        const eventName = isTyping ? "start_typing_rec" : "stop_typing_rec";
        socket.to(`chat-room-${conv_id}`).emit(eventName, {
          from: loggedUser,
          conv_id,
          is_group
        });
      }
    } catch (error) {
      console.error('Error handling typing:', error);
    }
  }
}

class CallEventHandler {
  constructor(io, state) {
    this.io = io;
    this.state = state;
  }

  async handleStartCall(socket, data, callback) {
    try {
      const res = await startCall(data);
      
      if (res.status === 200) {
        const { to_user_id, from_user_id, is_group } = data;
        
        if (is_group) {
          res.data.is_user_busy = false;
          callback(res);
          this.state.setCallStatus(from_user_id, CALL_STATUS.BUSY);
        } else {
          if (this.state.getCallStatus(to_user_id) === CALL_STATUS.BUSY) {
            const toUser = await UserModel.findById(to_user_id).select("fullName");
            this.state.addToWaitingList(to_user_id, from_user_id);
            
            await Call.findOneAndUpdate(
              { _id: res.data.call_id },
              { verdict: CALL_VERDICT.BUSY, status: "Ongoing", endedAt: Date.now() }
            );
            
            res.data.is_user_busy = true;
            res.data.is_user_busy_msg = `${toUser.fullName} is busy on another call`;
            callback(res);
            return;
          } else {
            res.data.is_user_busy = false;
            callback(res);
            this.state.setCallStatus(from_user_id, CALL_STATUS.BUSY);
          }
        }
      }
    } catch (error) {
      console.error('Error starting call:', error);
      callback({ status: 500, message: 'Failed to start call' });
    }
  }

  async handleAudioCall(socket, data) {
    try {
      const { from, to, call_id, conversation_id, is_group, conv_participant, groupName } = data;
      const fromUser = await UserModel.findById(from);
      
      if (is_group) {
        const conv = await Conversation.findById(conversation_id).select('participants conv_name');
        const groupMembers = (conv?.participants || []).filter(id => id.toString() !== from.toString());
        const finalGroupName = groupName || conv?.conv_name || '';
        
        groupMembers.forEach(memberId => {
          const memberSocketId = this.state.getUserSocketId(memberId.toString());
          if (memberSocketId) {
            this.io.to(memberSocketId).emit("call_notification", {
              from: fromUser,
              call_id,
              streamID: from,
              conversation_id,
              is_group,
              call_type: 'audio',
              conv_participant,
              groupName: finalGroupName
            });
          }
        });
      } else {
        const toUser = await UserModel.findById(to);
        this.state.setCallStatus(to, CALL_STATUS.BUSY);
        
        if (toUser?.socket_id) {
          this.io.to(toUser.socket_id).emit("call_notification", {
            from: fromUser,
            call_id,
            streamID: from,
            userID: to,
            userName: to,
            conversation_id,
            is_group,
            call_type: 'audio',
            conv_participant
          });
        }
      }
    } catch (error) {
      console.error('Error handling audio call:', error);
    }
  }

  async handleCallNotPicked(socket, data) {
    try {
      const { to, from, call_id } = data;
      const toUser = await UserModel.findById(to);

      await Call.findOneAndUpdate(
        { _id: call_id },
        { verdict: CALL_VERDICT.MISSED, status: "Ended", endedAt: Date.now() }
      );

      if (toUser?.socket_id) {
        this.io.to(toUser.socket_id).emit("audio_call_missed", { from, to });
      }
    } catch (error) {
      console.error('Error handling call not picked:', error);
    }
  }

  async handleEndCall(socket, data) {
    try {
      const { call_id, from, userID, is_group, conversation_id } = data;
      const toUserId = userID;
      const fromId = from._id || from;

      const recExist = await Call.findOne({ _id: call_id }).select("_id status");
      
      if (recExist && recExist.status !== "Ended" && recExist.status !== "Busy") {
        await Call.findOneAndUpdate(
          { _id: call_id, status: { $ne: "Ended" } },
          { status: "Ended", endedAt: Date.now() }
        );

        // Reset call statuses
        this.state.setCallStatus(fromId, CALL_STATUS.AVAILABLE);
        this.state.setCallStatus(toUserId, CALL_STATUS.AVAILABLE);

        // Notify waiting users
        await this.notifyWaitingUsers([fromId, toUserId]);

        if (is_group) {
          socket.to(`chat-room-${conversation_id}`).emit("end_audio_call_res", { from, to_user_id: toUserId, call_id });
        } else {
          const [fromUser, toUser] = await Promise.all([
            UserModel.findById(fromId),
            UserModel.findById(toUserId)
          ]);

          [fromUser, toUser].forEach(user => {
            if (user?.socket_id) {
              this.io.to(user.socket_id).emit("end_audio_call_res", { from, to_user_id: toUserId, call_id });
            }
          });
        }
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  async handleCallAccepted(socket, data) {
    try {
      const { streamID, from, call_id } = data;
      const fromUser = await UserModel.findById(from._id);

      await Call.findOneAndUpdate(
        { _id: call_id },
        { verdict: CALL_VERDICT.ACCEPTED, startedAt: Date.now() }
      );

      if (fromUser?.socket_id) {
        this.io.to(fromUser.socket_id).emit("audio_call_accepted", { from, streamID, call_id });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  }

  async handleCallDenied(socket, data) {
    try {
      const { to, from, call_id, conversation_id, is_group } = data;

      await Call.findOneAndUpdate(
        { _id: call_id },
        { 
          verdict: CALL_VERDICT.DENIED, 
          status: "Ended", 
          endedAt: Date.now(),
          $addToSet: { denied: from._id || from }
        }
      );

      const calleeHasOtherCalls = await Call.findOne({
        _id: { $ne: call_id },
        participants: from._id,
        status: "Ongoing"
      });

      if (!calleeHasOtherCalls) {
        this.state.setCallStatus(from._id, CALL_STATUS.AVAILABLE);
      }
      
      if (!is_group) {
        this.state.setCallStatus(data.userID, CALL_STATUS.AVAILABLE);
      }

      await this.notifyWaitingUsers([from, to]);

      if (is_group) {
        const callDoc = await Call.findById(call_id).select('participants');
        if (callDoc?.participants) {
          callDoc.participants.forEach(participantId => {
            if (participantId.toString() !== (from._id ? from._id.toString() : from.toString())) {
              const socketId = this.state.getUserSocketId(participantId.toString());
              if (socketId) {
                this.io.to(socketId).emit("audio_call_denied", { from, to, call_id });
              }
            }
          });
        }
      } else {
        const fromUser = await UserModel.findById(from._id);
        if (fromUser?.socket_id) {
          this.io.to(fromUser.socket_id).emit("audio_call_denied", { from, to, call_id });
        }
      }
    } catch (error) {
      console.error('Error denying call:', error);
    }
  }

  async notifyWaitingUsers(userIds) {
    for (const userId of userIds) {
      const waitingList = this.state.waitingList.get(userId);
      if (waitingList?.length) {
        const waitingUser = await UserModel.findById(userId).select("fullName");
        waitingList.forEach(waitingUserId => {
          const socketId = this.state.getUserSocketId(waitingUserId);
          if (socketId) {
            this.io.to(socketId).emit("user_available", { 
              message: `${waitingUser.fullName} is now available.` 
            });
          }
        });
        this.state.clearWaitingList(userId);
      }
    }
  }

  async handleUserJoinedCall(socket, data) {
    try {
      socket.join(data.call_id);
      this.state.addJoinedUser(data.call_id, data.user);

      const sentData = {
        call_id: data.call_id,
        users: this.state.joinedUsersByCallId.get(data.call_id)
      };

      this.io.in(data.call_id).emit('user_joined_call', sentData);
      
      // Send current mute status to the joining user
      if (this.state.muteStatus.has(data.call_id)) {
        const muteStatus = this.state.muteStatus.get(data.call_id);
        const videoMuteStatus = this.state.videoMuteStatus.get(data.call_id) || new Map();
        const muteStatusArray = Array.from(muteStatus.entries()).map(([userId, isMuted]) => ({
          user_id: userId,
          is_muted: isMuted,
          is_video_muted: videoMuteStatus.get(userId) || false
        }));
        
        socket.emit('call_mute_status', {
          call_id: data.call_id,
          mute_status: muteStatusArray
        });
      }
    } catch (error) {
      console.error('Error handling user joined call:', error);
    }
  }

  async handleUserLeftGroupCall(socket, data) {
    try {
      const { call_id, user_id } = data;
      const remainingUsers = this.state.removeJoinedUser(call_id, user_id);
      
              // Clean up mute status for the leaving user
        if (this.state.muteStatus.has(call_id)) {
          this.state.muteStatus.get(call_id).delete(user_id);
          // If no more mute status for this call, remove the entire entry
          if (this.state.muteStatus.get(call_id).size === 0) {
            this.state.muteStatus.delete(call_id);
          }
        }
        
        // Clean up video mute status for the leaving user
        if (this.state.videoMuteStatus.has(call_id)) {
          this.state.videoMuteStatus.get(call_id).delete(user_id);
          // If no more video mute status for this call, remove the entire entry
          if (this.state.videoMuteStatus.get(call_id).size === 0) {
            this.state.videoMuteStatus.delete(call_id);
          }
        }
      
      if (remainingUsers === null) {
        // No users left, end the call
        this.io.in(call_id).emit('end_group_call', { call_id });
        await Call.findOneAndUpdate(
          { _id: call_id },
          { status: 'Ended', endedAt: Date.now() }
        );
        // Clean up mute status for the entire call
        this.state.muteStatus.delete(call_id);
        this.state.videoMuteStatus.delete(call_id);
      } else {
        // Update participant list
        this.io.in(call_id).emit('user_joined_call', {
          call_id,
          users: remainingUsers
        });
      }
    } catch (error) {
      console.error('Error handling user left group call:', error);
    }
  }

  async handleForceEndGroupCall(socket, data) {
    try {
      const { call_id } = data;
      this.state.joinedUsersByCallId.delete(call_id);
      this.io.in(call_id).emit('end_group_call', { call_id });
      
      await Call.findOneAndUpdate(
        { _id: call_id },
        { status: 'Ended', endedAt: Date.now() }
      );
      
      // Clean up mute status for the entire call
      this.state.muteStatus.delete(call_id);
    } catch (error) {
      console.error('Error force ending group call:', error);
    }
  }

  async handleUserMuteStatusChanged(socket, data) {
    try {
      const { call_id, user_id, is_muted, is_group } = data;
      
      if (is_group && call_id) {
        // Store mute status in state
        if (!this.state.muteStatus.has(call_id)) {
          this.state.muteStatus.set(call_id, new Map());
        }
        this.state.muteStatus.get(call_id).set(user_id, is_muted);
        
        // Broadcast to ALL participants in the call (including the sender)
        this.io.in(call_id).emit('user_mute_status_changed', {
          call_id,
          user_id,
          is_muted,
          is_group
        });
        
        console.log(`[Mute Status] User ${user_id} ${is_muted ? 'muted' : 'unmuted'} in call ${call_id}`);
      }
    } catch (error) {
      console.error('Error handling user mute status change:', error);
    }
  }

  async handleUserVideoMuteStatusChanged(socket, data) {
    try {
      const { call_id, user_id, is_muted, is_group } = data;
      
      if (is_group && call_id) {
        // Store video mute status in state
        if (!this.state.videoMuteStatus) {
          this.state.videoMuteStatus = new Map();
        }
        if (!this.state.videoMuteStatus.has(call_id)) {
          this.state.videoMuteStatus.set(call_id, new Map());
        }
        this.state.videoMuteStatus.get(call_id).set(user_id, is_muted);
        
        // Broadcast to ALL participants in the call (including the sender)
        this.io.in(call_id).emit('user_video_mute_status_changed', {
          call_id,
          user_id,
          is_muted,
          is_group
        });
        
        console.log(`[Video Mute Status] User ${user_id} ${is_muted ? 'video muted' : 'video unmuted'} in call ${call_id}`);
      }
    } catch (error) {
      console.error('Error handling user video mute status change:', error);
    }
  }
}

class MediaSoupEventHandler {
  constructor(io, state) {
    this.io = io;
    this.state = state;
  }

  async handleConnectTransport(socket, data, app) {
    try {
      const { roomId, transportId, dtlsParameters } = data;
      const mediasoupService = app.get('mediasoupService');
      await mediasoupService.connectTransport(roomId, transportId, dtlsParameters);
      socket.emit('mediasoup:transport-connected', { transportId });
    } catch (error) {
      console.error('Error connecting transport:', error);
      socket.emit('mediasoup:error', { error: 'Failed to connect transport' });
    }
  }

  async handleCreateProducer(socket, data, app, userId) {
    try {
      const { roomId, transportId, kind, rtpParameters } = data;
      const mediasoupService = app.get('mediasoupService');
      const producer = await mediasoupService.createProducer(roomId, transportId, kind, rtpParameters, userId);
      
      socket.to(roomId).emit('mediasoup:new-producer', {
        producerId: producer.id,
        kind: producer.kind,
        userId
      });
      
      socket.emit('mediasoup:producer-created', {
        id: producer.id,
        type: producer.type,
        rtpParameters: producer.rtpParameters
      });
    } catch (error) {
      console.error('Error creating producer:', error);
      socket.emit('mediasoup:error', { error: 'Failed to create producer' });
    }
  }

  async handleCreateConsumer(socket, data, app, userId) {
    try {
      const { roomId, transportId, producerId, rtpCapabilities } = data;
      const mediasoupService = app.get('mediasoupService');
      const consumer = await mediasoupService.createConsumer(roomId, transportId, producerId, rtpCapabilities, userId);
      
      socket.emit('mediasoup:consumer-created', {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: consumer.producerPaused
      });
    } catch (error) {
      console.error('Error creating consumer:', error);
      socket.emit('mediasoup:error', { error: 'Failed to create consumer' });
    }
  }

  async handleProducerAction(socket, data, app, action) {
    try {
      const { roomId, producerId } = data;
      const mediasoupService = app.get('mediasoupService');
      
      if (action === 'pause') {
        await mediasoupService.pauseProducer(roomId, producerId);
      } else if (action === 'resume') {
        await mediasoupService.resumeProducer(roomId, producerId);
      } else if (action === 'close') {
        await mediasoupService.closeProducer(roomId, producerId);
      }
      
      const eventName = `mediasoup:producer-${action}d`;
      socket.to(roomId).emit(eventName, { producerId });
      socket.emit(eventName, { producerId });
    } catch (error) {
      console.error(`Error ${action}ing producer:`, error);
      socket.emit('mediasoup:error', { error: `Failed to ${action} producer` });
    }
  }

  async handleConsumerAction(socket, data, app, action) {
    try {
      const { roomId, consumerId } = data;
      const mediasoupService = app.get('mediasoupService');
      
      if (action === 'pause') {
        await mediasoupService.pauseConsumer(roomId, consumerId);
      } else if (action === 'resume') {
        await mediasoupService.resumeConsumer(roomId, consumerId);
      } else if (action === 'close') {
        await mediasoupService.closeConsumer(roomId, consumerId);
      }
      
      const eventName = `mediasoup:consumer-${action}d`;
      socket.emit(eventName, { consumerId });
    } catch (error) {
      console.error(`Error ${action}ing consumer:`, error);
      socket.emit('mediasoup:error', { error: `Failed to ${action} consumer` });
    }
  }

  async handleCloseTransport(socket, data, app) {
    try {
      const { roomId, transportId } = data;
      const mediasoupService = app.get('mediasoupService');
      await mediasoupService.closeTransport(roomId, transportId);
      socket.emit('mediasoup:transport-closed', { transportId });
    } catch (error) {
      console.error('Error closing transport:', error);
      socket.emit('mediasoup:error', { error: 'Failed to close transport' });
    }
  }

  async handleLeaveRoom(socket, data, app, userId) {
    try {
      const { roomId } = data;
      const mediasoupService = app.get('mediasoupService');
      await mediasoupService.removeUserFromRoom(roomId, userId);
      socket.to(roomId).emit('mediasoup:user-left', { userId });
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('mediasoup:error', { error: 'Failed to leave room' });
    }
  }

  async handleGetRoomProducers(socket, data, app) {
    try {
      const { roomId } = data;
      const mediasoupService = app.get('mediasoupService');
      const producers = await mediasoupService.getRoomProducers(roomId);
      socket.emit('mediasoup:room-producers', { producers });
    } catch (error) {
      console.error('Error getting room producers:', error);
      socket.emit('mediasoup:error', { error: 'Failed to get room producers' });
    }
  }
}

// Main WebSocket class
class WebSocketManager {
  constructor(server, app) {
    this.io = socketIo(server, SOCKET_CONFIG);
    this.app = app;
    this.state = new WebSocketState();
    this.chatHandler = new ChatEventHandler(this.io, this.state);
    this.callHandler = new CallEventHandler(this.io, this.state);
    this.mediaSoupHandler = new MediaSoupEventHandler(this.io, this.state);
  }

  updateOnlineUsers(userId) {
    this.io.sockets.emit("onlineUsers", { 
      users: this.state.getOnlineUsers(), 
      frm_user_id: userId 
    });
  }

  async handleUserLeft(callId, userId) {
    const remainingUsers = this.state.removeJoinedUser(callId, userId);
    
    if (remainingUsers === null) {
      this.io.in(callId).emit('end_group_call', { call_id: callId });
      await Call.findOneAndUpdate(
        { _id: callId },
        { status: 'Ended', endedAt: Date.now() }
      );
    } else {
      this.io.in(callId).emit('user_joined_call', {
        call_id: callId,
        users: remainingUsers
      });
    }
  }

  setupEventHandlers(socket) {
    const userId = socket.handshake.query["user_id"];
    const socketId = socket.id;

    // Connection management
    socket.on("addSocket", async (data) => {
      if (data.userid && data.socket_id) {
        await updateUserSocket(userId, socketId, 'connect');
        
        if (!this.state.users.has(userId)) {
          this.state.addUser(userId, socketId);
        }
        
        this.updateOnlineUsers(userId);
        
        setTimeout(async () => {
          try {
            const res = await getLoggedUser(userId);
            socket.emit('addSocket_res', res.data);
          } catch (error) {
            console.error('Error getting logged user:', error);
          }
        }, 100);
      }
    });

    socket.on("disconnect", async () => {
      const disconnectedUserId = Array.from(this.state.users.entries())
        .find(([_, socketId]) => socketId === socket.id)?.[0];

      if (disconnectedUserId) {
        await updateUserSocket(disconnectedUserId, socket.id, 'disconnect');
        this.state.removeUser(disconnectedUserId);
        this.updateOnlineUsers(disconnectedUserId);
        
        // Clean up call rooms
        const room = this.state.getUserCallRoom(socket.id);
        if (room) {
          socket.to(room).emit('user-left', { userId: disconnectedUserId, room });
          this.state.removeUserCallRoom(socket.id);
        }

        // Clean up group call participants
        for (const [callId, _] of this.state.joinedUsersByCallId) {
          await this.handleUserLeft(callId, disconnectedUserId);
        }

        // Clean up mute status for disconnected user
        for (const [callId, muteStatusMap] of this.state.muteStatus) {
          if (muteStatusMap.has(disconnectedUserId)) {
            muteStatusMap.delete(disconnectedUserId);
            // If no more mute status for this call, remove the entire entry
            if (muteStatusMap.size === 0) {
              this.state.muteStatus.delete(callId);
            }
          }
        }

        // Clean up video mute status for disconnected user
        for (const [callId, videoMuteStatusMap] of this.state.videoMuteStatus) {
          if (videoMuteStatusMap.has(disconnectedUserId)) {
            videoMuteStatusMap.delete(disconnectedUserId);
            // If no more video mute status for this call, remove the entire entry
            if (videoMuteStatusMap.size === 0) {
              this.state.videoMuteStatus.delete(callId);
            }
          }
        }

        // --- Mediasoup cleanup on disconnect ---
        const mediasoupService = this.app.get('mediasoupService');
        if (mediasoupService && typeof mediasoupService.removeUserFromRoom === 'function') {
          for (const [roomId, room] of mediasoupService.rooms) {
            if (room.peers.has(disconnectedUserId)) {
              await mediasoupService.removeUserFromRoom(roomId, disconnectedUserId);
              socket.to(roomId).emit('mediasoup:user-left', { userId: disconnectedUserId });
            }
          }
        }
        // --- End mediasoup cleanup ---
      }
    });

    // Chat events
    socket.on("send_msg", (data) => this.chatHandler.handleSendMessage(socket, data));
    socket.on("delete_message", (data) => this.chatHandler.handleDeleteMessage(socket, data));
    socket.on("bookmark_message", (data, callback) => this.chatHandler.handleBookmarkMessage(socket, data, callback));
    socket.on("join-chat-room", (data) => this.chatHandler.handleJoinChatRoom(socket, data));
    socket.on("message-delivered", (data) => this.chatHandler.handleMessageDelivered(socket, data, userId));
    socket.on("markConvAsRead", (data, callback) => this.chatHandler.handleMarkConversationAsRead(socket, data, userId, callback));
    socket.on("start_typing", (data) => this.chatHandler.handleTyping(socket, data, true));
    socket.on("stop_typing", (data) => this.chatHandler.handleTyping(socket, data, false));

    // Friend requests
    socket.on("friend_request", async (data) => await friendReq('send', data, this.io));
    socket.on("accept_request", async (data) => await friendReq('accept', data, this.io));
    socket.on("reject_request", async (data) => await friendReq('reject', data, this.io));

    // User status
    socket.on('user_status_change', async (data) => {
      try {
        const res = await updateUserStatus(userId, data.status);
        if (res.status === 200) {
          socket.broadcast.emit('user_status_change_res', res.data);
        }
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    });

    // Location sharing
    socket.on("send-location", (data) => {
      this.io.emit('recieve-location', { id: socket.id, ...data });
    });

    // Call events
    socket.on("start_call", (data, callback) => this.callHandler.handleStartCall(socket, data, callback));
    socket.on("start_audio_call", (data) => this.callHandler.handleAudioCall(socket, data));
    socket.on("audio_call_not_picked", (data) => this.callHandler.handleCallNotPicked(socket, data));
    socket.on("end_audio_call", (data) => this.callHandler.handleEndCall(socket, data));
    socket.on("audio_call_accepted", (data) => this.callHandler.handleCallAccepted(socket, data));
    socket.on("audio_call_denied", (data) => this.callHandler.handleCallDenied(socket, data));
    socket.on("user_is_busy_audio_call", async (data) => {
      try {
        const { to, from, call_id } = data;
        await Call.findOneAndUpdate(
          { _id: call_id, participants: { $size: 2, $all: [to, from] } },
          { verdict: CALL_VERDICT.BUSY, status: "Ended", endedAt: Date.now() }
        );
        const fromUser = await UserModel.findById(from);
        if (fromUser?.socket_id) {
          this.io.to(fromUser.socket_id).emit("on_another_audio_call", { from, to });
        }
      } catch (error) {
        console.error('Error handling busy call:', error);
      }
    });

    // Video call
    socket.on("start_video_call", async (data) => {
      try {
        const { from, to, call_id, conversation_id, is_group } = data;
        const fromUser = await UserModel.findById(from);
        
        if (is_group) {
          socket.to(`chat-room-${conversation_id}`).emit("call_notification", {
            from: fromUser,
            call_id,
            streamID: from,
            conversation_id,
            is_group,
            call_type: 'video'
          });
        } else {
          const toUser = await UserModel.findById(to);
          this.state.setCallStatus(to, CALL_STATUS.BUSY);
          
          if (toUser?.socket_id) {
            this.io.to(toUser.socket_id).emit("call_notification", {
              from: fromUser,
              call_id,
              streamID: from,
              userID: to,
              userName: to,
              call_type: 'video'
            });
          }
        }
      } catch (error) {
        console.error('Error starting video call:', error);
      }
    });

    // Group call events
    socket.on('user_joined_call', (data) => this.callHandler.handleUserJoinedCall(socket, data));
    socket.on('user-left-group-call', (data) => this.callHandler.handleUserLeftGroupCall(socket, data));
    socket.on('force_end_group_call', (data) => this.callHandler.handleForceEndGroupCall(socket, data));
    socket.on('user_mute_status_changed', (data) => this.callHandler.handleUserMuteStatusChanged(socket, data));
    socket.on('user_video_mute_status_changed', (data) => this.callHandler.handleUserVideoMuteStatusChanged(socket, data));

    // WebRTC signaling
    socket.on('signal', (data) => socket.to(data.room).emit('signal', data));
    socket.on('join-room', (room) => {
      socket.join(room);
      this.state.setUserCallRoom(socket.id, room);
    });

    // ICE candidates and offers/answers
    socket.on("ice-candidate", ({ candidate, room }) => {
      socket.to(room).emit("ice-candidate", { candidate, participantId: userId });
    });

    socket.on("offer", (data) => {
      const { offer, room } = data;
      socket.to(room).emit("incomingOffer", { offer, from: userId });
    });

    socket.on("answer", (data) => {
      const { answer, room } = data;
      socket.to(room).emit("answer", { answer, fromPeerId: userId });
    });

    // Notifications
    socket.on('notification-seen', async (notification_id) => {
      try {
        const res = await notificationSeen(notification_id);
        if (res.status === 200) {
          console.log('Notification seen status updated');
        }
      } catch (error) {
        console.error('Error marking notification as seen:', error);
      }
    });

    socket.on("notify_conv_user_add_remove", async (data) => {
      try {
        const { participants } = data;
        const users = await UserModel.find({
          _id: { $in: participants },
          socket_id: { $exists: true, $ne: '' }
        }).select('socket_id');

        users.forEach(user => {
          socket.broadcast.to(user.socket_id).emit("notify_conv_user_add_remove_rec", data);
        });
      } catch (error) {
        console.error('Error notifying conversation users:', error);
      }
    });

    // MediaSoup events
    socket.on('mediasoup:connect-transport', (data) => this.mediaSoupHandler.handleConnectTransport(socket, data, this.app));
    socket.on('mediasoup:create-producer', (data) => this.mediaSoupHandler.handleCreateProducer(socket, data, this.app, userId));
    socket.on('mediasoup:create-consumer', (data) => this.mediaSoupHandler.handleCreateConsumer(socket, data, this.app, userId));
    socket.on('mediasoup:pause-producer', (data) => this.mediaSoupHandler.handleProducerAction(socket, data, this.app, 'pause'));
    socket.on('mediasoup:resume-producer', (data) => this.mediaSoupHandler.handleProducerAction(socket, data, this.app, 'resume'));
    socket.on('mediasoup:close-producer', (data) => this.mediaSoupHandler.handleProducerAction(socket, data, this.app, 'close'));
    socket.on('mediasoup:pause-consumer', (data) => this.mediaSoupHandler.handleConsumerAction(socket, data, this.app, 'pause'));
    socket.on('mediasoup:resume-consumer', (data) => this.mediaSoupHandler.handleConsumerAction(socket, data, this.app, 'resume'));
    socket.on('mediasoup:close-consumer', (data) => this.mediaSoupHandler.handleConsumerAction(socket, data, this.app, 'close'));
    socket.on('mediasoup:close-transport', (data) => this.mediaSoupHandler.handleCloseTransport(socket, data, this.app));
    socket.on('mediasoup:leave-room', (data) => this.mediaSoupHandler.handleLeaveRoom(socket, data, this.app, userId));
    socket.on('mediasoup:get-room-producers', (data) => this.mediaSoupHandler.handleGetRoomProducers(socket, data, this.app));
  }

  initialize() {
    this.io.on("connection", (socket) => {
      this.setupEventHandlers(socket);
    });
  }

  getIO() {
    return this.io;
  }
}

// Export the optimized WebSocket manager
const webSocket = (server, app) => {
  const wsManager = new WebSocketManager(server, app);
  wsManager.initialize();
  return wsManager.getIO();
};

module.exports = webSocket;
