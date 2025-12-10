const socketIo = require("socket.io");
const {createMsg,DelMsg,updateUserSocket,getLoggedUser,updateUserStatus,friendReq,markAsDelivered,markConvAsRead,BookmarkMsg,notificationSeen} = require("./chatCon");
const {startCall} = require("./userCon");
const { setTimeout } = require("timers"); 
const UserModel = require("../models/userModel");
const Call = require("../models/call");
// const { verifyTokenMiddleware } = require("../utils/auth");

const webSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.origin || "http://localhost:4200",
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"],
      credentials: true,
    },
  });

  // to store online user 
  let users = {};
  // Track user call statuses and waiting lists
  const userCallStatus = {}; // e.g., { userId: 'busy' | 'available' }
  const waitingList = {}; // e.g., { userId: [userId1, userId2, ...] }

  function updateOnlineUsers(userId) {
    io.sockets.emit("onlineUsers", { users: Object.keys(users), frm_user_id: userId });
  }

  // Use the middleware verify token aspect updateOnlineUsers
  // io.use(verifyTokenMiddleware);

  io.on("connection", async(socket) => {
    // console.log(`New client connected`);
    // console.log(JSON.stringify(socket.handshake.query));
    const user_id = socket.handshake.query["user_id"];
    const socket_id=socket.id;
    // console.log(`socket_id=${socket_id}`);
    // console.log(`user_id=${user_id}`);
    // console.log(Boolean(user_id));
    // When a user logs in (or signs up), store their ID and socket ID 
    socket.on("addSocket", (data) => {
      // if(user_id!=null && Boolean(user_id)){
      if(data.userid && data.socket_id){
        // console.log("addSocket called node server");
        // console.log(data);
        // update sockedid and status of user in db
        updateUserSocket(user_id,socket_id,'connect'); 
        // console.log(user_id);
        if (!users.hasOwnProperty(user_id)) {
          // console.log("not exist==1 adding " + socket_id);
          users[user_id] = socket_id;
        }
        // console.log("users [userid , socketid] ");
        // console.log(users);
        updateOnlineUsers(user_id);
        setTimeout(() => {
          getLoggedUser(user_id).then(res=>{
            // console.log('get getLoggedUser response');
            // let data__=res.data;
            // console.log(data__);
            socket.emit('addSocket_res',res.data);
          });
        }, 100);
      }
    });
    // When a user logs out, remove their ID from the object
    socket.on("disconnect", async() => {
      // console.log('disconnect');
      for (let userId in users) {
        if (users[userId] === socket.id) {
          updateUserSocket(userId,socket.id,'disconnect');
          delete users[userId];
          updateOnlineUsers(userId);
          updateCallUser();
          if(waitingList[userId]){
            waitingList[userId] = [];
          }
          // console.log('waitingList');
          // console.log(waitingList);
          break;
        }
      }
      // console.log("A user disconnected: " + socket.id);
      // console.log("users ==2");
      // console.log(users);
      // io.sockets.emit('user-disconnected',socket.id);
    });

    // remote socket from call room list
    function updateCallUser(userId){
      // Retrieve the user's room from the stored information
      const room = userCallRooms[socket.id];

      if (room && room!=undefined) {
        // Notify other participants in the room
        socket.to(room).emit('user-left', { userId: user_id, room });

        // Clean up the user's room information
        delete userCallRooms[socket.id];
        console.log(`User ${user_id} disconnected from room: ${room}`);
      }
    }
  
    // on message send start
    socket.on("send_msg", (data) => {
      // console.log("message ===1==");
      // console.log(data);
      // console.log('is group='+data.chat_type);
      // console.log(data.participants);
      createMsg(data).then(res=>{
        // console.log('createMsg res');
        // console.log(res);
        data._id=res.data._id;
        data.full_send_datetime=res.data.send_datetime;
        data.attachments=res.data.attachments;
        if(res.temp_conversation_id){
          data.temp_conversation_id=res.temp_conversation_id;
        }
        // console.log(data);
        socket.emit('msg_send_res_self',data);
        if(res.status==200){
          if (data.chat_type === true) {
            socket.to("chat-room-" + data.conversation_id).emit("rec_msg", data);
          } else {
            let tosocketid = users[data.to];
            socket.broadcast.to(tosocketid).emit("rec_msg", data);
          }
        }
      });
    });
    // on message send end
  
    // create socket for room
    socket.on("join-chat-room", (data) => {
      // console.log('join-chat-room');
      // console.log(data);
      setTimeout(() => {
        data.forEach((e) => {
          socket.join("chat-room-" + e._id);
        });
      }, 0);
      // console.log('socket rooms', io.sockets.adapter.rooms);
    });
  
    // Delete message start
    socket.on("delete_message", (data) => {
      // console.log('delete_message');
      // console.log(data);
      DelMsg(data).then(res=>{
        // console.log('res index res');
        // console.log(res);
        if(res.status==200){
          // console.log('is group='+data.chat_type);
          let conv_id =data.conversation_id._id ?data.conversation_id._id:data.conversation_id; 
          // console.log('conversation_id='+conv_id);
          // console.log(data.participants);
          if (data.chat_type==1) {
            socket.to("chat-room-" + conv_id).emit("rec_del_msg", data);
          } else {
            // console.log('to userid='+data.to);
            let to_id;
            if(data.to_id){
              to_id= data.to_id; 
            }else{
              to_id= data.to._id; 
            }
            let tosocketid = users[to_id];
            // console.log('sockeid=='+tosocketid);
            socket.broadcast.to(tosocketid).emit("rec_del_msg", data);
          }
        }
        // console.log(res);
      })
    });
    // Delete message end
    
    // Bookmark message start
    socket.on("bookmark_message", (data,callback) => {
      // console.log('bookmark_message');
      // console.log(data);
      BookmarkMsg(data).then(res=>{
        // console.log('res index res');
        // console.log(res);
        callback(res);
        // console.log(res);
      })
    });
    // Bookmark message end
  
    // send friend reqest
    socket.on("friend_request", async (data) => {
      await friendReq('send',data,io);
    });
  
    // accept the friend req
    socket.on("accept_request", async (data) => {
      await friendReq('accept',data,io);
    });
  
    
    // update msg delivered
    socket.on('message-delivered', (data) => {
      // console.log('message-delivered');
      // console.log(data);
      markAsDelivered(data,user_id).then(res=>{
        // console.log(res);
        if(res.status==200){
          // console.log(`msg delivery status updatedd`);
          // console.log(res);
          data.deliveredTo=res.data.deliveredTo;
        }
        if (data.chat_type === true) {
          // socket.to("chat-room-" + data.conversation_id).emit("rec_msg", data);
        } else {
          let tosocketid = users[data.from.id];
          // console.log('tosocketid==='+tosocketid);
          socket.broadcast.to(tosocketid).emit("message-delivered", data);
        }
      });
    });
    
    // mark as read as user select conv socket called start
    socket.on('markConvAsRead', (data,callback) => {
      // console.log('markConvAsRead index');
      // console.log(data);
      const data2={conv_id:data._id,user_id:user_id};
      markConvAsRead(data2).then(res=>{
        // console.log(res);
        if(res.status==200){
          // console.log(`msg read status updatedd`);
          // console.log(res);
          // data.deliveredTo=res.data.deliveredTo;
          if (data.is_group === true) {
            let myuserDetail=data.participants.filter((e)=>{return e._id==user_id});
            socket.to("chat-room-" + data._id).emit("markConvAsRead_res", data,myuserDetail[0]);
          } else {
            // finding other user 
            let otherUser=data.participants.filter((e)=>{return e._id!=user_id});
            let tosocketid = users[otherUser[0]._id];
            // console.log('user_id==='+user_id);
            // console.log('tosocketid==='+tosocketid);
            socket.broadcast.to(tosocketid).emit("markConvAsRead_res", data,user_id);
          }
          callback(res);
        }else{
          callback([]);
        }
      });
    });
    // mark as read as user select conv socket called end
  
    // user status change start
    socket.on('user_status_change',(data)=>{
      // console.log('user_status_change calling')
      // console.log('user_id='+user_id);
      // console.log(data);
      updateUserStatus(user_id,data.status).then(res=>{
        // console.log('user_status_change res');
        // console.log(res);
        if(res.status==200){
          // console.log(res.data);
          socket.broadcast.emit('user_status_change_res',res.data);
        }
      });
    });
    // user status change end
    
    // send location start
    socket.on("send-location",(data)=>{
      // console.log('send-location calling');
      // console.log(data);
      io.emit('recieve-location',{id:socket.id,...data})
    });
    // send location end
  
    // -------------- HANDLE AUDIO CALL SOCKET EVENTS ----------------- //
  
    // init start call(audio/video) start
    socket.on("start_call",(data,callback)=>{
      console.log("start_call calling", data);
      startCall(data).then(async (res)=>{
        // console.log('startCall response ',res);      
        if(res.status==200){
          const {to_user_id, from_user_id,type,conversation_id, is_group}= data;
          // console.log('1 userCallStatus');
          // console.log(userCallStatus);
          // Check if the recipient is already busy
          if(is_group){
            res.data.is_user_busy=false;
            callback(res);
            userCallStatus[from_user_id] = 'busy';
          }else{
            if (userCallStatus[to_user_id] === 'busy') {
              const to_user = await UserModel.findById(to_user_id).select("fullName");
              // console.log(`${to_user.fullName} is busy on another call`);
              // Notify caller that the user is busy
              // socket.emit("user_busy_notification", {
              //   message: `${to_user.fullName} is busy on another call.`
              // });
              // Add User A to the waiting list for User B
              if (!waitingList[to_user_id]) {
                waitingList[to_user_id] = [];
              }
              waitingList[to_user_id].push(from_user_id);
              // console.log('waitingList');
              // console.log(waitingList);
              await Call.findOneAndUpdate(
                {_id: res.data.call_id,},
                { verdict: "Busy", status: "Ongoing", endedAt: Date.now() }
              );
              res.data.is_user_busy=true;
              res.data.is_user_busy_msg=`${to_user.fullName} is busy on another call`;
              callback(res);
              return;
            }else{
              res.data.is_user_busy=false;
              callback(res);
              userCallStatus[from_user_id] = 'busy';
              // userCallStatus[to_user_id] = 'busy';
              // console.log('else userCallStatus');
              // console.log(userCallStatus);
              // const from_user = await UserModel.findById(from_user_id);
              // const to_user = await UserModel.findById(to_user_id).select('socket_id');
              // console.log("to_user", to_user);
              // // send notification to receiver of call
              // setTimeout(()=>{
              //   console.log('sending call notificataion to end ')
              //   io.to(to_user?.socket_id).emit("call_notification", {
              //     from: from_user,
              //     call_id:res.data.call_id,
              //     streamID: from_user_id,
              //     userID: to_user_id,
              //     userName: to_user_id,
              //     call_type:type // type = call_type like : audio/video
              //   });
              // },1000);
            }
          }
        }
      });
    });
    // init start call(audio/video) end
  
  
    // handle start_audio_call event
    socket.on("start_audio_call", async (data) => {
      console.log('start_audio_call calling');
      console.log(data);
      const { from, to, call_id,conversation_id,is_group,conv_participant } = data;
      
      const from_user = await UserModel.findById(from);
      if(is_group){
        socket.to("chat-room-" + conversation_id).emit("call_notification", {
          from: from_user,
          call_id,
          streamID: from,
          conversation_id,
          is_group,
          call_type:'audio',
          conv_participant
        });
      }else{
        const to_user = await UserModel.findById(to);
        userCallStatus[to] = 'busy';
        // console.log('userCallStatus',userCallStatus);
    
        // console.log("to_user", to_user);
    
        // send notification to receiver of call
        io.to(to_user?.socket_id).emit("call_notification", {
          from: from_user,
          call_id,
          streamID: from,
          userID: to,
          userName: to,
          conversation_id,
          is_group,
          call_type:'audio',
          conv_participant
        });
      }
  
    });
  
    // handle audio_call_not_picked
    socket.on("audio_call_not_picked", async (data) => {
      // console.log('audio_call_not_picked calling');
      // console.log(data);
      // find and update call record
      const { to, from,call_id} = data;
  
      const to_user = await UserModel.findById(to);
  
      await Call.findOneAndUpdate(
        {
          _id: call_id,
          // participants: { $size: 2, $all: [to, from] },
        },
        { verdict: "Missed", status: "Ended", endedAt: Date.now() }
      );
  
      // TODO => emit call_missed to receiver of call
      io.to(to_user?.socket_id).emit("audio_call_missed", {
        from,
        to,
      });
    });
    // end call
    socket.on("end_audio_call", async (data) => {
      // console.log('end_audio_call calling');
      // console.log(data);
      const { call_id,from,userID,is_group,conversation_id} = data;
      const to_user_id =userID;
      const from_id =from._id;
  
      const rec_exist = await Call.findOne({_id:call_id}).select("_id");
      if(rec_exist){
        await Call.findOneAndUpdate(
          {
            _id: call_id,
            status: {$ne:"Ended"}
          },
          { status: "Ended", endedAt: Date.now() }
        );
  
        // Reset call statuses
        userCallStatus[from_id] = 'available';
        userCallStatus[to_user_id] = 'available';
        // console.log('userCallStatus available');
        // console.log(userCallStatus);
  
        // Notify all users waiting for User B to be available
        // console.log('waitingList before clear');
        // console.log(waitingList);
        // console.log('checking waiting list from');
        // console.log(waitingList[from_id]);
        if (waitingList[from_id]) {
          const waitingUser = await UserModel.findById(from_id).select("fullName");
          // console.log('emiting to user='+waitingUser.fullName);
          waitingList[from_id].forEach(async(waitingUserId) => {
            io.to(users[waitingUserId]).emit("user_available", { message: `${waitingUser.fullName} is now available.` });
          });
  
          // Clear the waiting list for User B
          // console.log('clear to user id ', from_id);
          waitingList[from_id] = [];
        }
        // console.log('checking waiting list to');
        // console.log(waitingList[to_user_id]);
        if (waitingList[to_user_id]) {
          const waitingUser = await UserModel.findById(to_user_id).select("fullName");
          // console.log('emiting to user='+waitingUser.fullName);
          waitingList[to_user_id].forEach(async(waitingUserId) => {
            io.to(users[waitingUserId]).emit("user_available", { message: `${waitingUser.fullName} is now available.` });
          });
  
          // Clear the waiting list for User B
          // console.log('clear to user id ', to_user_id);
          waitingList[to_user_id] = [];
        }
  
        // for notify caller that call have ended (only for direct conversation)
        if(is_group){
          socket.to("chat-room-" + conversation_id).emit("end_audio_call_res", {from,to_user_id});
        }else{
          const from_user = await UserModel.findById(from._id);
          if(from_user?.socket_id){
            io.to(from_user?.socket_id).emit("end_audio_call_res", {from,to_user_id});
          }
        }
      }
    });
  
    // handle audio_call_accepted
    socket.on("audio_call_accepted", async (data) => {
      const { streamID, from,call_id } = data;
  
      const from_user = await UserModel.findById(from);
  
      // find and update call record
      let res=await Call.findOneAndUpdate(
        {
          // participants: { $size: 2, $all: [streamID, from]},
          _id:call_id 
        },
        { verdict: "Accepted", startedAt: Date.now() }
      );
      // TODO => emit call_accepted to sender of call
      io.to(from_user?.socket_id).emit("audio_call_accepted", {
        from,
        streamID,
      });
    });
  
    // handle audio_call_denied
    socket.on("audio_call_denied", async (data) => {
      // find and update call record
      const { to, from,call_id } = data;
  
      await Call.findOneAndUpdate(
        {
          _id:call_id ,
          // participants: { $size: 2, $all: [to, from] },
        },
        { verdict: "Denied", status: "Ended", endedAt: Date.now() }
      );
  
      const from_user = await UserModel.findById(from);
      // TODO => emit call_denied to sender of call
  
      io.to(from_user?.socket_id).emit("audio_call_denied", {
        from,
        to,
      });
    });
  
    // handle user_is_busy_audio_call
    socket.on("user_is_busy_audio_call", async (data) => {
      // console.log('user_is_busy_audio_call calling');
      const { to, from,call_id } = data;
      // find and update call record
      await Call.findOneAndUpdate(
        {
          _id:call_id,
          participants: { $size: 2, $all: [to, from] },
        },
        { verdict: "Busy", status: "Ended", endedAt: Date.now() }
      );
  
      const from_user = await UserModel.findById(from);
      // TODO => emit on_another_audio_call to sender of call
      io.to(from_user?.socket_id).emit("on_another_audio_call", {
        from,
        to,
      });
    });
  
    // start video call
    socket.on("start_video_call", async (data) => {
      // console.log('start_video_call calling');
      // console.log(data);
      const { from, to, call_id,conversation_id,is_group } = data;
  
      const from_user = await UserModel.findById(from);
      if(is_group){
        socket.to("chat-room-" + conversation_id).emit("call_notification", {
          from: from_user,
          call_id,
          streamID: from,
          conversation_id,
          is_group,
          call_type:'video'
        });
      }else{
        const to_user = await UserModel.findById(to);
    
        userCallStatus[to] = 'busy';
        // console.log("to_user", to_user);
    
        // send notification to receiver of call
        io.to(to_user?.socket_id).emit("call_notification", {
          from: from_user,
          call_id,
          streamID: from,
          userID: to,
          userName: to,
          call_type:'video'
        });
      }
    });
  
     // start typing
    socket.on("start_typing", async (data) => {
      // console.log('start_typing calling');
      const { loggedUser, conv_participant, conv_id,is_group } = data;
      // console.log(data);
      if(!is_group){
        const to_user=conv_participant.filter(e=>e.isme=='no');
        // console.log("to_user", to_user);
        const to = await UserModel.findById(to_user[0]._id).select("socket_id");
        // console.log("to", to);
        // const from_user = await UserModel.findById(loggedUser.id).select("socket_id");
    
        // send notification to receiver of call
        if(to.socket_id){
          io.to(to?.socket_id).emit("start_typing_rec", {
            from: loggedUser,
            to:to_user,
            conv_id:conv_id,
            is_group:is_group
          });
        }
      }else{
        socket.to("chat-room-" + conv_id).emit("start_typing_rec", {
          from: loggedUser,
          conv_id:conv_id,
          is_group:is_group
        });
      }
    });
    // stop typing
    socket.on("stop_typing", async (data) => {
      // console.log('stop_typing calling');
      const { loggedUser, conv_participant, conv_id,is_group } = data;
      // console.log(data);
      if(!is_group){
        const to_user=conv_participant.filter(e=>e.isme=='no');
        // console.log("to_user", to_user);
        const to = await UserModel.findById(to_user[0]._id).select("socket_id");
        // console.log("to", to);
        // const from_user = await UserModel.findById(loggedUser.id).select("socket_id");
    
        // send notification to receiver of call
        if(to.socket_id){
          io.to(to?.socket_id).emit("stop_typing_rec", {
            from: loggedUser,
            to:to_user,
            conv_id:conv_id,
            is_group:is_group
          });
        }
      }else{
        socket.to("chat-room-" + conv_id).emit("stop_typing_rec", {
          from: loggedUser,
          conv_id:conv_id,
          is_group:is_group
        });
      }
    });
    socket.on("notify_conv_user_add_remove",async(data)=>{
      const {participants,conv_id}=data;
      // console.log('notify_conv_user_add_remove calling');
      let res=await UserModel.find({
        _id: { $in: participants },
        socket_id: { $exists: true, $ne: '' }
      }).select('socket_id');
      // console.log(res);
      if(res.length>0){
        for (let i = 0; i < res.length; i++) {
          const e = res[i];
          // console.log('inside loop='+i);
          // console.log(e);
          socket.broadcast.to(e.socket_id).emit("notify_conv_user_add_remove_rec", data);
        }
        // socket.to("chat-room-" + conv_id).emit("notify_conv_user_add_remove_rec", data);
      }
    });
  
    // new socket config for video call start
    // Forward signaling messages (offer, answer, ICE candidates)
    socket.on('signal', (data) => {
      // console.log('on signal calling');
      // console.log(data);
      socket.to(data.room).emit('signal', data);
    });
  
    // Join room
    let userCallRooms = {}; // e.g., { socketId: roomId }
    socket.on('join-room', (room) => {
      socket.join(room);
      // Store the user's room
      userCallRooms[socket.id] = room;
      // console.log(`User joined room: ${room}`);
    });
    // new socket config for video call end
    
    // =========== handle group call start =============
    // Relay ICE candidates to all other peers in the room
    socket.on("ice-candidate", ({ candidate, room }) => {
      console.log('ice-candidate',{ candidate, room });
      // Broadcast the ICE candidate to the room
      socket.to(room).emit("ice-candidate", {
        candidate,
        participantId: user_id
      });
    });
    
    // Relay an offer from Peer A to Peer B
    socket.on("offer", (data) => {
      console.log("offer==",data);
      const { offer, room } = data;  // Include room identifier
      // Broadcast to all other participants in the room except the sender
      socket.to(room).emit("incomingOffer", { offer, from: user_id });
    });

    // Relay an answer from Peer B to Peer A
    socket.on("answer", (data) => {
      console.log("answer==",data);
      const { answer, room } = data;  // Include room identifier
      // Broadcast to all other participants in the room except the sender
      socket.to(room).emit("answer", { answer, fromPeerId: user_id });
    });
    // =========== handle group call end =============

    // update msg delivered
    socket.on('notification-seen', (notification_id) => {
      // console.log('notification-seen');
      // console.log(notification_id);
      notificationSeen(notification_id).then(res=>{
        // console.log(res);
        if(res.status==200){
          console.log(`notification-seen status updatedd`);
          // console.log(res);
          // data.deliveredTo=res.data.deliveredTo;
        }
      });
    });

  });

  return io;
};

module.exports = webSocket;
