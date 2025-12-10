const UserModel = require("../models/userModel");
const Conversation = require("../models/convModel");
const ConversationMem = require("../models/convMemberModel");
const msgModel = require("../models/msgModel");
const SystemEvent = require("../models/systemEventModel");
const bookmarkModel = require("../models/bookmarkModel");
const ConnectionModel = require("../models/ConnectionModel");
const jwt = require("jsonwebtoken");
const { getAuthData } = require("../utils/auth");
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const axios = require('axios');
const ObjectId = mongoose.Types.ObjectId;
const { getAllContact_socket,getConnectionById } = require('../helpers/commonHelper');
const NotificationModel = require("../models/notificationModel");
const {createNotification,updateNotificationSeen} =require('../Controller/notifications.controller');
// API key stored in environment variable
const STADIA_API_KEY = process.env.STADIA_API_KEY;
// Configure storage
const chat_file_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join('./uploads/chat/');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});
const upload1 = multer({ storage: chat_file_storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // Limit file size to 5MB
  },});

// for profile
const profile_img_storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join('./uploads/profile/');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    let extArray = file.mimetype.split("/");
    let extension = extArray[extArray.length - 1];
    // cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    cb(null, file.fieldname + '-' + Date.now() + '.'+extension)
  }
});
const upload2 = multer({ storage: profile_img_storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // Limit file size to 5 MB
  },});

module.exports = {
  // updated socketid
  updateUserSocket: async (user_id, socket_id, type) => {
    await UserModel.findByIdAndUpdate(user_id, {
      socket_id: type == "connect" ? socket_id : "",
      is_online: type == "connect" ? true : false,
      lastSeen: Date.now()
    });
  },
  
  getLoggedUser: async(user_id)=>{
    try {
      const user_detail = await UserModel.findById(user_id);
      return { status: 200, data: user_detail };
      // return res.status(200).json({ data: user_detail, message: "get data" });
    } catch (error) {
      console.log('error--1')
      console.log(error);
      return { status: 500, message: "error", error : error};
      // return res.status(500).json({ message: "error", error });
    }
  },

  // create conversation start
  createConv: async (req, res) => {
    let particip = [...new Set(req.body.participants)];
    req.body.participants = particip;
    // checking exist rec for one - one conv
    if (req.body.is_group == false) {
      const exist_conversations = await Conversation.find({
        participants: {
          $all: req.body.participants,
        },
        is_group: false,
      });
      if (exist_conversations.length > 0) {
        return res.status(204).json({
          message: "conversation already exist",
          data: exist_conversations,
        });
        return false;
      }
    }

    const conModel = new Conversation(req.body);
    try {
      const response = await conModel.save();
      if (response._id) {
        let authdata = getAuthData(req)._id;

        try {
          let response2 = [];
          for (let i = 0; i < particip.length; i++) {
            const memb_id = particip[i];
            let sd = {
              conversation_id: response._id,
              user_id: memb_id,
              is_leave: false,
              created_by: authdata,
            };
            const conGrpModel = new ConversationMem(sd);
            response2.push(await conGrpModel.save());
          }
          return res.status(201).json({
            message: "Conversation created successfully",
            data: response2,
          });
        } catch (err) {
          return res.status(500).json({ message: "error", error });
        }
      }
      return res
        .status(201)
        .json({ message: "Conversation created successfully", data: response });
    } catch (error) {
      return res.status(500).json({ message: "error", error });
    }
  },
  // create conversation end

  removeDuplicates: (array) => {
    return [...new Set(array)];
  },

  // create msg start
  createMsg: async (data) => {
    // console.log('createMsg caling');
    // console.log(data);
    if(data.is_conv_temp){
      // console.log('is_conv_temp='+data.is_conv_temp);
      // check existing conversation
      // console.log('your have temp conv _id '+data.is_conv_temp);
      let isexist=await checkAndCreateConversation(data);
      // console.log('isexist');
      // console.log(isexist);
      if(isexist.data.length>0){
        data.temp_conversation_id=data.conversation_id;
        data.conversation_id=isexist.data[0]._id;
      }
    }
    // console.log('data.conversation_id==');
    // console.log(data.conversation_id);
    // return false;
    try {
      let savedata = {
        conversation_id: data.conversation_id,
        chat_type: data.chat_type == true ? 1 : 0,
      };

      if (data.sendFrom && data.sendFrom.id) {
        savedata.from = data.sendFrom.id;
        savedata.created_by = data.sendFrom.id;
      } else if (data.from) {
        savedata.from = data.from;
        savedata.created_by = data.from;
      }

      if (data.message) {
        savedata.message = data.message;
      }
      if (data.reply_to && data.reply_to._id) {
        savedata.reply_to = data.reply_to._id;
      }
      if (data.to) {
        savedata.to = data.to;
      }
      if (data.location) {
        savedata.location = data.location;
      }
      if (data.attachment && data.attachment.length > 0) {
        savedata.attachments = data.attachment;
      }
      if (data.sticker) {
        savedata.sticker = data.sticker;
      }
      // Forwarded message support
      if (data.forwarded) {
        savedata.forwarded = true;
        if (data.forward_msg_id) {
          savedata.forward_msg_id = data.forward_msg_id;
        }
        if (data.forward_snapshot) {
          savedata.forward_snapshot = data.forward_snapshot;
        }
      }
      const messgModel = new msgModel(savedata);
      try {
        const response = await messgModel.save();
        // check if anyone deleted/archive if deleted then reactive conv 
        checkConvDeleted(data);
        // console.log('after save:'+data.temp_conversation_id);
        if(data.temp_conversation_id){
          return { status: 200, data: response,temp_conversation_id:data.temp_conversation_id };
        }
        return { status: 200, data: response };
      } catch (err) {
        console.log(err);
        return { status: 500, data: err };
      }
      // return authdata;
    } catch (error) {
      console.log("error");
      console.log(error);
      return { status: 500, data: error };
    }
  },
  // create msg end

  // get conversation start
  getConv: async (req, res) => {
    let authdata = getAuthData(req);
    try {
      var mysesion_data = await UserModel.find(
        { _id: authdata._id },
        { password: 0 }
      );
      let user_id=new ObjectId(authdata._id);
  
      // new
      // for getting archive and non archived data 
      let get_archive_data=req.body.is_archive;
      let archive_by;
      if (get_archive_data) {
        archive_by = { $eq: user_id };
      } else {
        archive_by = { $ne: user_id };
      }
  
      // // Aggregation pipeline
      const pipeline = [
        {
          $match: {
            participants: {
              $all: [user_id]
            },
            delete_by: { $ne: user_id } 
          }
        },
        {
          $lookup: {
            from: "messages", // The collection to join
            localField: "_id", // Field from the conversations collection
            foreignField: "conversation_id", // Field from the messages collection
            as: "messages" // Output array field
          }
        },
        {
          $unwind:{
            path:"$messages", // Deconstruct the messages array
            preserveNullAndEmptyArrays: true // Include conversations with no messages
          } 
        },
        // $match stage to filter out deleted messages
        {
          $match: {
            // "messages.deleted_by": { $ne: user_id },
            // "messages.is_delete": 0 // Replace "deleted" with the appropriate field indicating message deletion
            $or: [
              { "messages.deleted_by": { $ne: user_id }, "messages.is_delete": 0 },
              { "messages": null } // Allow conversations with no messages
            ]
          }
        },
        {
          $sort: { "messages.send_datetime": -1 } // Sort messages by timestamp in descending order
        },
        {
          $group: {
            _id: "$_id", // Group by conversation ID
            conversation: { $first: "$$ROOT" }, // Get the first document in each group (latest message)
            latestMessage: { $first: "$messages" } // Get the first message in each group (latest message)
          }
        },
        {
          $lookup: {
            from: "users", // The collection to join
            localField: "conversation.participants", // Field from the conversations collection
            foreignField: "_id", // Field from the participants collection
            as: "participants" // Output array field
          }
        },
        {
          $addFields: {
            participants: {
              $map: {
                input: "$participants",
                as: "participant",
                in: {
                  _id: "$$participant._id",
                  name: "$$participant.fullName",
                  email: "$$participant.email",
                  profile_pic:"$$participant.profile_pic",
                  fullName: "$$participant.fullName",
                  status: "$$participant.status",
                  statusMsg: "$$participant.statusMsg",
                  is_online: "$$participant.is_online",
                  lastSeen: "$$participant.lastSeen",
                  profilePhotoVisibility: "$$participant.profilePhotoVisibility",
                  isme: {
                    $cond: {
                      if: {
                        $eq: [
                          "$$participant._id",user_id
                        ]
                      },
                      then: "yes",
                      else: "no"
                    }
                  }
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: "users", // The collection to join
            localField: "conversation.created_by", // Field from the conversations collection
            foreignField: "_id", // Field from the participants collection
            as: "created_by" // Output array field
          }
        },    
        // 5. Lookup the latest ongoing group call (only call id)
        {
          $lookup: {
            from: "calls",
            let: { convId: "$_id" },
            pipeline: [
              { $match: {
                $expr: {
                  $and: [
                    { $eq: ["$conversation_id", "$$convId"] },
                    { $eq: ["$is_group", true] },
                    { $eq: ["$status", "Ongoing"] }
                  ]
                }
              }},
              { $sort: { startedAt: -1, created_at: -1 } },
              { $limit: 1 },
              { $project: { _id: 1 } }
            ],
            as: "ongoing_call"
          }
        },
        { $addFields: { ongoing_call: { $arrayElemAt: ["$ongoing_call._id", 0] } } },
      
        {
          $match: {
            // "conversation.archive_by": { $ne:user_id} 
            "conversation.archive_by": archive_by 
          }
        },
        {
          $addFields: {
            created_by: {
              $arrayElemAt: ["$created_by", 0],
            },
          },
        },
        {
          $addFields: {
            is_archive: {
              $map: {
                input: "$conversation.archive_by",
                as: "archive",
                in: {
                  $cond: {
                    if: {
                      $eq: [
                        "$$archive",
                        user_id
                      ]
                    },
                    then: "yes",
                    else: "no"
                  }
                }
              }
            }
          }
        },{
          $addFields: {
            is_archive: {
              $arrayElemAt: ["$is_archive", 0]
            }
          }
        },
        {
          $addFields: {
            is_liked: {
              $map: {
                input: "$conversation.like_by",
                as: "like",
                in: {
                  $cond: {
                    if: {
                      $eq: [
                        "$$like",
                        user_id
                      ]
                    },
                    then: true,
                    else: false
                  }
                }
              }
            }
          }
        },{
          $addFields: {
            is_liked: {
              $arrayElemAt: ["$is_liked", 0]
            }
          }
        },
        {
          $addFields: {
            is_muted: {
              $map: {
                input: "$conversation.muted_by",
                as: "muted",
                in: {
                  $cond: {
                    if: {
                      $eq: [
                        "$$muted",
                        user_id
                      ]
                    },
                    then: true,
                    else: false
                  }
                }
              }
            }
          }
        },{
          $addFields: {
            is_muted: {
              $arrayElemAt: ["$is_muted", 0]
            }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "latestMessage.from", // Field to join from latest message
            foreignField: "_id", // Matching _id in users collection
            as: "lastMessageUser"
          }
        },
        {
          $addFields: {
            last_msg_row: {
              $mergeObjects: [
                "$latestMessage",
                { fromUser: { $arrayElemAt: ["$lastMessageUser", 0] } } // Merging from user details
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            conv_name: "$conversation.conv_name",
            // participants: "$conversation.participants", // Include conversation participants
            is_group: "$conversation.is_group", // Include conversation is_group
            created_by: {_id:1, profile_pic:1}, // Include conversation created_by
            created_at: "$conversation.created_at", // Include conversation created_at
            updated_date: "$conversation.updated_date", // Include conversation 
            last_message: { $ifNull: ["$latestMessage.message", null] }, // Fallback text if no message
            last_msg_date: { $ifNull: ["$latestMessage.send_datetime", null] }, // Null if no timestamp
            // last_msg_row:"$latestMessage",
            last_msg_row: {
              _id: { $ifNull: ["$last_msg_row._id", null] },
              conversation_id: { $ifNull: ["$last_msg_row.conversation_id", null] },
              chat_type: { $ifNull: ["$last_msg_row.chat_type", null] },
              sticker: { $ifNull: ["$last_msg_row.sticker", []] },
              attachments: { $ifNull: ["$last_msg_row.attachments", []] },
              readBy: { $ifNull: ["$last_msg_row.readBy", []] },
              deliveredTo: { $ifNull: ["$last_msg_row.deliveredTo", []] },
              is_send: { $ifNull: ["$last_msg_row.is_send", false] },
              message: { $ifNull: ["$last_msg_row.message", "No messages yet"] }, // Fallback if message is null
              send_datetime: { $ifNull: ["$last_msg_row.send_datetime", null] },
              from: { $ifNull: ["$last_msg_row.fromUser._id", null] },
              fromUser: {
                _id: { $ifNull: ["$last_msg_row.fromUser._id", null] },
                fullName: { $ifNull: ["$last_msg_row.fromUser.fullName", null] } // Fallback for `fullName`
              },
              forwarded: { $ifNull: ["$last_msg_row.forwarded", false] },
              forward_snapshot: { $ifNull: ["$last_msg_row.forward_snapshot", null] },
              forward_msg_id: { $ifNull: ["$last_msg_row.forward_msg_id", null] }
            },
            participants: 1,
            is_archive: 1,
            is_liked:1,
            ongoing_call:1,
            is_muted:1
          }
        }
      ]
      // for getting conversation by id
      var get_conv_by_id=req.body.conv_id;
      if (get_conv_by_id) {
        let get_conv_by_id_obj=new ObjectId(get_conv_by_id);
        pipeline[0].$match._id = get_conv_by_id_obj;
      }
      // Execute the aggregation
      await Conversation.aggregate(pipeline)
        .then((results) => {
          var data1;
          if (!get_conv_by_id) {
            data1={
              conversation: results,
              user: mysesion_data,
            }
          }else{
            // for get conv by id
            data1={
              conversation: results,
            }
          }
          return res.status(200).json({
            data: data1,
            message: "success",
          });
        })
        .catch((error) => {
          console.error(error);
          return res.status(500).json({ message: "error", error });
        });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "error", err });
    }
  },
  // get conversation end

  // get message by conversation id start
  getMesgByConv: async (req, res) => {
    let authdata = getAuthData(req);
    let user_id=new ObjectId(authdata._id);
    try {
      // Pagination - skip messages that are already loaded
      let skip = req.body.loadedMsg;
      // Fetch messages with a limit of 5
      const messages = await msgModel
        .find({
          conversation_id: req.body.conv_id,
          is_delete: 0,
          deleted_by: { $ne: user_id } 
        })
        .skip(skip)
        .limit(10)
        .sort({ send_datetime: -1 })// Get the newest messages first
        .populate("conversation_id from to")
        .populate("created_by", "_id profile_pic")
        .populate("readBy", "_id fullName profile_pic")
        .populate({
          path: "reply_to",
          populate: {
            path: "from",
          },
        })
        .populate({
          path: "forward_msg_id",
          select: "message attachments from",
          populate: { path: "from", select: "fullName profile_pic" }
        });

      // Map over the messages and replace participant's and creator's ids with their respective user document
      const msgWithUserDetails = messages.map((message) => {
        const msgJSON = message.toJSON();
        msgJSON.from = {
          _id: message.from._id,
          profile_pic: message.from.profile_pic,
          name: message.from.fullName,
          profilePhotoVisibility: message.from.profilePhotoVisibility,
          isme: message.from._id == authdata._id ? "yes" : "no",
        };
        if (message.to) {
          msgJSON.to = {
            _id: message.to._id,
            profile_pic: message.to.profile_pic,
            name: message.to.fullName,
            isme: message.to._id == authdata._id ? "yes" : "no",
          };
        }
        if (message.reply_to) {
          msgJSON.reply_to = {
            _id: message.reply_to._id,
            message: message.reply_to.message,
            send_datetime: message.reply_to.send_datetime,
          };
          if (message.reply_to.from) {
            msgJSON.reply_to.from = {
              _id: message.reply_to.from._id,
              email: message.reply_to.from.email,
              name: message.reply_to.from.fullName,
              profile_pic: message.reply_to.from.profile_pic,
              isme: message.reply_to.from._id == authdata._id ? "yes" : "no",
            };
          }
        }
        return msgJSON;
      });

      // If no messages are found, return an empty array
      if (messages.length === 0) {
        return res.status(200).json({ data: [],event:[], message: "No messages found" });
      }

      // Get the first and last message's send_datetime (for date range)
      const firstMessageDate = messages[messages.length - 1].send_datetime;
      const lastMessageDate = messages[0].send_datetime;

      // Initialize the query object for system event
      // console.log('conversation id='+req.body.conv_id);
      const systemEventQuery = {
        conversation_id: new ObjectId(req.body.conv_id),
      };

      // Conditionally add timestamp range if firstMessageDate and lastMessageDate exist
      if(skip==0){
        systemEventQuery.timestamp = {
          // $gte: firstMessageDate, // Events after or on the first message's date
          $lte: lastMessageDate,  // Events before or on the last message's date
        };
      }else if (skip>0) {
        if (messages.length>=5) {
          systemEventQuery.timestamp = {
            $gte: firstMessageDate, // Events after or on the first message's date
            $lte: lastMessageDate,  // Events before or on the last message's date
          };
        }else{
          systemEventQuery.timestamp = {
            // $gte: req.body.lastMsgDate, // Events after or on the first message's date
            $lte: req.body.lastMsgDate,  // Events before or on the last message's date
          };
        }
      }

      // Fetch system events based on the dynamic query
      // const systemEvents = await SystemEvent.find(systemEventQuery)
      //   .populate("user", "_id fullName")
      //   .populate("affectedUser", "_id fullName")
      //   .sort({ timestamp: -1 }) // Sort system events in ascending order
      //   .exec();
      const systemEvents = await SystemEvent.aggregate([
        {
          $match: systemEventQuery // Filter documents based on your query
        },
        {
          $project: {
            _id: 1,
            send_datetime: "$timestamp", // Alias 'timestamp' as 'send_datetime'
            user: 1,
            affectedUser: 1,
            eventType: 1, // Include other fields you need
            conversation_id:1,
            callDuration:1
          }
        },
        {
          $lookup: {
            from: 'users', // The collection to join with
            localField: 'user', // Field from 'systemEvents'
            foreignField: '_id', // Field from 'users'
            pipeline: [
              { $project: { _id: 1, fullName: 1 } } // Only include '_id' and 'fullName'
            ],
            as: 'user_info' // Output array field to store user details
          }
        },
        {
          $lookup: {
            from: 'users', // The collection to join with
            localField: 'affectedUser', // Field from 'systemEvents'
            foreignField: '_id', // Field from 'users'
            pipeline: [
              { $project: { _id: 1, fullName: 1 } } // Only include '_id' and 'fullName'
            ],
            as: 'affectedUser_info' // Output array field to store affectedUser details
          }
        },
        {
          $sort: { send_datetime: -1 } // Sort by alias 'send_datetime' in descending order
        }
      ]).exec();
      // console.log(systemEvents);
      
      // Return the combined messages and system events
      return res.status(200).json({ data:msgWithUserDetails,event:systemEvents, message: "success" });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "error", err });
    }
  },
  // get message by conversation id end

  // Delete a message start
  DelMsg: async (data) => {
    try {
      try {
        const filter = { _id: data._id };
        const updateDoc = {
          $set: {
            is_delete: 1,
          },
        };
        // const messgModel = new msgModel();
        const response = await msgModel.updateOne(filter, updateDoc);
        if (response.modifiedCount) {
          let data = { status: 200, data: response };
          return data;
        } else {
          return { status: 500, data: response };
        }
      } catch (err) {
        console.log(err);
        return { status: 500, data: err };
      }
      // return authdata;
    } catch (error) {
      console.log("error");
      console.log(error);
      return { status: 500, data: error };
    }
  },
  // Delete a message end

  // upload chat file start
  uploadChatFile: async (req, res) => {
    try {
      upload1.single("file")(req, res, function (err) {
        if (err) {
          return res.status(500).json(err);
        }
        return res
          .status(200)
          .json({ data: req.file, message: "File uploaded successfully" });
      });
    } catch (error) {
      console.log("error");
      console.log(error);
      return { status: 500, data: error };
    }
  },
  // upload chat file end

  // upload profile image start
  uploadProfileImg: async(req,res)=>{
    try {
      // remove exisint file 
      let authdata = getAuthData(req);
      let user_id=new ObjectId(authdata._id);
      let filename=await UserModel.findOne(user_id).select("profile_pic");
      await UserModel.findOne({ _id: user_id })
        .then(oldImage => {
          if (oldImage) {
            const uploadDir = path.join('./uploads/profile/');
            // Old image exists, so delete it
            fs.unlink(uploadDir + oldImage.profile_pic, (err) => {
                if (err) {
                    console.log(err);
                }
            });
            // uplaod image
            upload2.single("file")(req, res, async function(err) {
              if (err) {
                return res.status(500).json(err);
              }
              await UserModel.findByIdAndUpdate(user_id, {
                profile_pic: req.file.filename,
              });
              return res
                .status(200)
                .json({ data: req.file, message: "File uploaded successfully" });
            });
          }
        })
        .catch(error => {
            console.log(error);
        });
    } catch (error) {
      console.log("error");
      console.log(error);
      return { status: 500, data: error };
    }
  },
  // upload profile image end

  // Friend Reqeust Start
  friendReq: async (type, data, io) => {
    try {
      try {
        // console.log(data);
        var from = await UserModel.findById(data.from).select("socket_id _id");
        // console.log(from);
        if (type == "send") {
          // for friend req send
          const to = await UserModel.findById(data.to).select("socket_id");
          try{
            const [userA, userB] = sortUsers(data.from,data.to);
            // create a friend request
            const response = await ConnectionModel.create({
              userA,
              userB,
              initiator:data.from
            });
            // console.log('response');
            // console.log(response);
            if (response._id) {
              let addeData = await ConnectionModel
                .findById(response._id)
                .populate('userA', '_id fullName profile_pic')
                .populate('userB', '_id fullName profile_pic')
                .populate('initiator', '_id fullName profile_pic');
              // emit event request received to recipient
              // console.log('to?.socket_id');
              // console.log(to?.socket_id);
              // add to notificaton
              let not_data={connectionId:response._id,recipientId:to?._id, senderId:from?._id, type:'connection_request'};
              let create=await createNotification(not_data);
              // console.log('create');
              // console.log(create);
              io.to(to?.socket_id).emit("new_friend_request", {
                message: "New friend request received",
                data: addeData,
              });
              io.to(from?.socket_id).emit("request_sent", {
                message: "Request Sent successfully!",
                data: addeData,
              });
            } else {
              io.to(from?.socket_id).emit("request_sent", {
                message: `record not updated: ${response}`,
                data: addeData,
              });
              // console.log(`record not updated: ${response}`);
            }       
          } catch (err) {
            console.log('new catch erro ===err');
            if (err.code === 11000) {
              console.log('Connection already exists');
              io.to(from?.socket_id).emit("request_sent", {
                message: "Requst already send!",
                data: '',
              });
            }else{
              io.to(from?.socket_id).emit("request_sent", {
                message: "Getting error try later!",
                data: err,
              });
              console.log(err);
            }
            return;
            // return res.status(500).json({ message: "error", err });
          }
        } else {
          // for friend req accept
          const request_doc = await ConnectionModel.findById(data.request_id);
          if(!request_doc){
            return ;
          }
          // console.log('data');
          // console.log(data);
          // if(request_doc.initiator.toString()===data.from.toString()){
          //   throw new Error('You cannont accept your own reqeust');
          // }
          if(type=="accept"){
            request_doc.status = "connected";
          }else{
            request_doc.status = "rejected";
          }
          request_doc.updatedAt = new Date();
          const add_req = await request_doc.save();
          console.log('request notification '+type);
          
          // notification seen
          let response=await updateNotificationSeen(data.request_id);
          if (response.modifiedCount) {
            console.log(`request notification update seen after ${type}`);
          } else {
            console.log(`not update request notification seen after ${type}`);
          }
          
          // console.log('add_req');
          // console.log(add_req);
          const sender = await UserModel.findById(request_doc.initiator).populate('socket_id').select('socket_id,_id');
          // let reciever_id= request_doc.initiator== request_doc.userA ? request_doc.userB :request_doc.userA; 
          // const receiver = await UserModel.findById(reciever_id).populate('socket_id').select('socket_id');
          // emit event to both of them

          // emit event request accepted to both\
          let accepted_userdata = await getConnectionById(from?._id,data.request_id);
          // console.log(accepted_userdata);
          // console.log(from?.socket_id);
          // let accepted_userdata= await ConnectionModel.find({
          //     status:'connected',
          //     _id:data.request_id
          //     }).populate('initiator', '_id fullName profile_pic email socket_id').select('initiator');
          
          // add notification
          let not_data={connectionId:data.request_id,recipientId:from?._id, senderId:sender?._id, type:'connection_accepted'};
          let create=await createNotification(not_data);
          // console.log('create');
          // console.log(create);
          io.to(from?.socket_id).emit("request_accepted_self", {
            message: "connection Successfully added",
            data: accepted_userdata.length>0 ? accepted_userdata[0]:'',
            connection_id:data.request_id
          });
          // inform the serder that your connection req is accepted
          let accepted_userdata2 = await getConnectionById(sender?._id,data.request_id);
          io.to(sender?.socket_id).emit("request_accepted", {
            message: "Friend Request Accepted",
            data: accepted_userdata2.length>0 ? accepted_userdata2[0]:'',
            connection_id:data.request_id
          });
        }
      } catch (err) {
        console.log(err);
      }
      // return authdata;
    } catch (error) {
      console.log("error");
      console.log(error);
    }
  },
  // Friend Reqeust End

  // get attachement files by conversation id start
  getAttachByConvId: async (req, res) => {
    let authdata = getAuthData(req);
    try {
      // Find all attachments
      const messages = await msgModel
        .find({
          conversation_id: req.body.conv_id,
          is_delete: 0,
        })
        .sort({ send_datetime: -1 });

      const msgWithUserDetails = messages.map((message) => {return message.attachments.length > 0 ?  message.attachments:null});
      let AllAttached = msgWithUserDetails.filter(
        (attach) => attach !== null && attach !== undefined
      );
      AllAttached=AllAttached.flat(Infinity);

      // group in common
      let commonGroup=[];
      if(req.body.is_group==false){
        let mpdata = req.body.participants.map((e) => e._id);
        commonGroup = await Conversation.find({
          participants: { $all: mpdata },
          is_group: 1,
        });
      }
      return res
        .status(200)
        .json({
          data: { AllAttached: AllAttached, commonGroup: commonGroup },
          message: "success",
        });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "error", err });
    }
  },
  // get attachement files by conversation id end

  // get all attached file start
  getAttachedFile: async(req,res)=>{
    let authdata = getAuthData(req);
    let user_id=new ObjectId(authdata._id);
    
    
    // // Aggregation pipeline
    const pipeline = [
      { $match: { attachments: { $exists: true, $not: { $size: 0 } }, is_delete: 0} },
      { $project: { _id: "$_id", attachments: "$attachments", conversation_id: "$conversation_id" } },
      {
        $lookup: {
          from: "conversations",
          localField: "conversation_id",
          foreignField: "_id",
          as: "conv_detail",
        },
      },
      {
        $addFields: {
          conv_detail: {
            $arrayElemAt: ["$conv_detail.participants", 0],
          },
        },
      },
      {
        $match: {
          conv_detail: {
            $all: [user_id],
          },
        },
      },
      {
        $sort: {
          send_datetime: -1,
        },
      },
    ];

    // Execute the aggregation
    msgModel.aggregate(pipeline)
      .then((results) => {
        const allAttach = results.map((message) => {
          if (message.attachments.length > 0) {
            const data = {};
            data.attachments = message.attachments;
            return data;
          }
        });
        const AllAttached = allAttach.filter(
          (attach) => attach !== null && attach !== undefined
        );
        return res
          .status(200)
          .json({
            data: { all_attached_file: AllAttached },
            message: "success",
          });
      })
      .catch((error) => {
        console.error(error);
        return res
          .status(500)
          .json({
            message: error,
          });
      });
  },
  // get all attached file end


  // count unread message by individual conversation start
  getUnreadMsgCount: async (req, res) => {
    let authdata = getAuthData(req);
    let user_id=new ObjectId(authdata._id);
    // Notification Query
    const notificationCount = await NotificationModel.countDocuments({ for: user_id,isSeen:false });
    // // Aggregation pipeline
    const pipeline = [
      {
        $match: {
          from:{$ne:user_id},
          is_delete: 0,
          deleted_by: { $ne: user_id },
          readBy:{$ne:user_id}
        },
      },
      {
        $lookup: {
          from: "conversations",
          localField: "conversation_id",
          foreignField: "_id",
          as: "conv_detail",
        },
      },
      {
        $addFields: {
          conv_detail: {
            $arrayElemAt: ["$conv_detail", 0],
          },
        },
      },
      {
        $match: {
          "conv_detail.participants": { $all: [user_id] }, // Ensure user is part of participants
          $or: [
            { "conv_detail.muted_by": { $exists: false } }, // If muted_by is not present
            { "conv_detail.muted_by": { $eq: null } },      // If muted_by is null
            {"conv_detail.muted_by": { $ne: user_id }},
            // {
            //   $expr: {
            //     $not: { $in: [user_id, { $ifNull: ["$conv_detail.muted_by", []] }] }, // Ensure user_id is not in muted_by
            //   },
            // },
          ],
        },
      }, 
      {
        $group: {
          _id: "$conversation_id",
          ucount: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          ucount: -1,
        },
      },
    ];

    // Execute the aggregation
    msgModel.aggregate(pipeline)
      .then((results) => {
        return res
          .status(200)
          .json({
            data: { unread_count: results,unread_notificaton:notificationCount },
            message: "success",
          });
      })
      .catch((error) => {
        console.error(error);
        return res
          .status(500)
          .json({
            message: error,
          });
      });
  },
  // count unread message by individual conversation End


  // get all unread message data start
  getUnreadMsg: async (req, res) => {
    try {
      let authdata = getAuthData(req);
      let user_id=new ObjectId(authdata._id);

      const { lastCreatedAt, limit = 20 } = req.query;

      // Notification Query
      const notificationQuery = { for: user_id,isSeen:false };
      if (lastCreatedAt) {
        notificationQuery.createdAt = { $lt: new Date(lastCreatedAt) };
      }

      const notificationPromise = NotificationModel.find(notificationQuery)
        .populate("senderId", "_id profile_pic fullName status")
        .populate("recipientId", "_id profile_pic fullName status")
        .sort({ createdAt: -1 })
        .limit(Number(limit));


      // Message Aggregation Pipeline (copying your logic)
      const unreadMessagePipeline = [
        {
          $match: {
            from:{$ne:user_id},
            is_delete: 0,
            readBy:{$ne:user_id}
          },
        },
        {
          $lookup: {
            from: "conversations",
            localField: "conversation_id",
            foreignField: "_id",
            as: "conv_detail",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "from",
            foreignField: "_id",
            as: "user_detail",
          },
        },
        {
          $addFields: {
            conv_detail: {
              $arrayElemAt: ["$conv_detail", 0],
            },
            conversation_id: {
              $arrayElemAt: ["$conv_detail", 0],
            },
            from: {
              $arrayElemAt: ["$user_detail", 0],
            },
          },
        },
        {
          $match: {
            "conv_detail.participants": { $all: [user_id] }, // Ensure user is part of participants
            $or: [
              { "conv_detail.muted_by": { $exists: false } }, // If muted_by is not present
              { "conv_detail.muted_by": { $eq: null } },      // If muted_by is null
              {"conv_detail.muted_by": { $ne: user_id }},
              // {
              //   $expr: {
              //     $not: { $in: [user_id, { $ifNull: ["$conv_detail.muted_by", []] }] }, // Ensure user_id is not in muted_by
              //   },
              // },
            ],
          },
        },     
        {
          $project:{_id:1,conversation_id:1,from:1,attachments:1,chat_type:1,sticker:1,message:1,send_datetime:1,readBy:1,forwarded:1,forward_msg_id:1},
        },
        // Populate forward_msg_id with the actual message document
        {
          $lookup: {
            from: "messages",
            localField: "forward_msg_id",
            foreignField: "_id",
            as: "forwarded_message"
          }
        },
        {
          $addFields: {
            forward_msg_id: { $arrayElemAt: ["$forwarded_message", 0] }
          }
        }
      ];

      // Execute the aggregation
      // msgModel.aggregate(pipeline)
      //   .then((results) => {
      //     return res
      //       .status(200)
      //       .json({
      //         data: { notifications,unread_count: results.length, unread_msg: results },
      //         message: "success",
      //       });
      //   })
      //   .catch((error) => {
      //     console.error(error);
      //     return res
      //       .status(500)
      //       .json({
      //         message: error,
      //       });
      //   });

      // new end
      //   .select(
      //     "_id conversation_id from attachments chat_type message send_datetime readBy"
      //   )
      //   .populate("conversation_id", "_id conv_name")
      //   .populate("from", "_id profile_pic fullName");\

      const [notifications, unreadMessages] = await Promise.all([
        notificationPromise,
        msgModel.aggregate(unreadMessagePipeline)
      ]);

      return res.status(200).json({
        data: {
          notifications,
          unread_msg: unreadMessages,
          unread_count: unreadMessages.length
        },
        message: 'success'
      });
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return res.status(500).json({ message: 'Internal server error', error });
    }
  },
  // get all unread message data end
  
  // mark as read - function not using
  markAsRead:async(req,res,next)=>{
    let authdata = getAuthData(req);
    const conversationId = req.body.conv_id;
    const userId = authdata._id;
    let user_id=new ObjectId(authdata._id); //object based userid
    let conv_id=new ObjectId(req.body.conv_id); //object based userid


    const filter = {
      conversation_id: conv_id,
      readBy: { $ne:user_id}
    };
    
    const update = {
      $addToSet: { readBy: userId } // Add user ID to the 'readBy' array
    };
    
    // Execute the update
    await msgModel.updateMany(filter, update)
      .then((updatedMessages) => {
        // return res.status(200).json({data: updatedMessages, message: "success"});
      })
      .catch((error) => {
        console.error('Error updating messages:', error);
        // return res.status(500).json({ message: "error", error });
      });
    
    
      //calling unread cunt data
      await getUnreadMsgCount2(req,res,next).then((res_data)=>{
        return res.status(200).json({data: res_data, message: "success"});
      })
      .catch((error) => {
        console.error('Error in count unread messages:', error);
        return res.status(500).json({ message: "error", error });
      });

      
  },

  // Message Mark as unread start
  markAsUnRead: async (req, res) => {
    let conv_id_obj=new ObjectId(req.body.conv_id);
    // let user_id=req.body.user_id;
    // let user_id_obj=new ObjectId(req.body.user_id);
    let authdata = getAuthData(req);
    let user_id=authdata._id;
    let user_id_obj=new ObjectId(authdata._id); //object based userid
    let msg_id = new ObjectId(req.body.msg_id);
    
    const exist_conversations = await Conversation.find({
      _id: conv_id_obj,
    });
    if (exist_conversations.length>0) {  
      if(msg_id){
        const filter = {
          _id:msg_id,
          from:{$ne:user_id},
          conversation_id: conv_id_obj,
          readBy: { $all:[user_id_obj]},
          is_delete: 0,
          deleted_by: { $ne: user_id_obj } 
        };
        
        const update = {
          $pull: { readBy: user_id } // remove user ID to the 'readBy' array
        };
        // Execute the update
        await msgModel.updateOne(filter, update)
        .then((upres) => {
          if(upres.modifiedCount){
            return res.status(200).json({data: upres, message: "msg mark as unread.."});
          }else{
            return res.status(203).json({data: upres, message: "not updated.."});
          }
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }
    }else{
      return res.status(500).json({ message: "conversation not exist.." });
    }
  },
  // Message Mark as unread end

   // mark as delivered
  markAsDelivered:async(data,user_id)=>{
    const toId = data.chat_type==true ? user_id:data.to;
    let to_id=new ObjectId(toId); //object based userid
    let msg_id=new ObjectId(data._id); //object based userid
    const filter = {
      _id: msg_id,
      deliveredTo: { $ne:to_id}
    };
    
    const update = {
      $addToSet: { deliveredTo: toId } // Add user ID to the 'deliveredTo' array
    };
    

    // Execute the update
    let response=await msgModel.updateMany(filter, update)
    if (response.modifiedCount) {
      const deliveredTo = await msgModel.findById(msg_id).select("deliveredTo");
      return { status: 200, data: deliveredTo };
    } else {
      return { status: 500, data: response };
    }
  },

  // mark all conv unread msg as read start
  markConvAsRead:async(data)=>{
    const userId = data.user_id;
    let user_id=new ObjectId(userId); //object based userid
    conv_id=new ObjectId(data.conv_id); //object based userid

    const filter = {
      conversation_id: conv_id,
      readBy: { $ne:user_id}
    };
    
    const update = {
      $addToSet: { readBy: userId } // Add user ID to the 'readBy' array
    };

    // Execute the update
    await msgModel.updateMany(filter, update)
      .then((updatedMessages) => {
        // return res.status(200).json({data: updatedMessages, message: "success"});
      })
      .catch((error) => {
        console.error('Error updating messages:', error);
        // return res.status(500).json({ message: "error", error });
      });
    
    
      //calling unread cunt data
      return await getUnreadMsgCount3(data).then((res_data)=>{
        return { status: 200, data: res_data };
      })
      .catch((error) => {
        console.error('Error in count unread messages:', error);
        return { status: 500, data: error };
      });
  },
  // mark all conv unread msg as read end
  
  // update user status start
  updateUserStatus:async(user_id,status_)=>{
    return await UserModel.findByIdAndUpdate(user_id, {
      status: status_,
    }).then(async(res)=>{
      let data= await UserModel.findById(user_id);
      return { status: 200, data: data };
    }).catch((error)=>{
      console.error('Error in count unread messages:', error);
      return { status: 500, data: error };
    });
  },
  // update user status end

  // Bookmark a message start
  BookmarkMsg: async (data) => {
    try {
      const bookExist= await bookmarkModel.find({ message_id: data._id, user_id: data.user_id });
      if (bookExist.length==0 || bookExist.length<1){
        const bookModel = new bookmarkModel({ message_id: data._id, user_id: data.user_id, created_by: data.user_id });
        return await bookModel.save().then((res)=>{
          if (res) {
            return { status: 200, data: res, message:'bookmark added..' };
          } else {
            return { status: 500, data: res, message:'bookmark not added..' };
          }
        })
      }else {
        const rmred=await bookmarkModel.deleteMany({ message_id: data._id, user_id: data.user_id });
        if(rmred.acknowledged){
          return { status: 200, data: rmred, message:'bookmark removed..' };
        }else{
          return { status: 500, data: [], message:'bookmark not removed..' };
        }
      }
    } catch (err) {
      return { status: 500, data: err, message:'Server error..' };
    }
  },
  // Bookmark a message end
  
  // get bookmark start
  bookmark: async (req, res) => {
    try {
      let authdata = getAuthData(req);
      let user_id=new ObjectId(authdata._id);
      const pipeline= [
        {
          $match: {
            user_id: user_id
          }
        },
        {
          $lookup: {
            from: "messages",
            localField: "message_id",
            foreignField: "_id",
            as: "message_detail"
          }
        },
        {
          $unwind: "$message_detail"
        },
        {
          $lookup: {
            from: "conversations",
            localField:
              "message_detail.conversation_id",
            foreignField: "_id",
            as: "message_detail.conversation_detail"
          }
        },
        {
          $unwind: "$message_detail.conversation_detail"
        },
        // {
        //   $lookup: {
        //     from: "users", // The collection to join
        //     localField:
        //       "message_detail.conversation_detail.participants", // Field from the conversations collection
        //     foreignField: "_id", // Field from the participants collection
        //     as: "message_detail.conversation_detail.participants" // Output array field
        //   }
        // },
        // {
        //   $addFields: {
        //     participants: {
        //       $arrayElemAt: [
        //         "$message_detail.conversation_detail.participants",
        //         0
        //       ]
        //     }
        //   }
        // },
        {
          $lookup: {
            from: "users",
            localField: "message_detail.from",
            foreignField: "_id",
            as: "message_detail.from_udetail"
          }
        },
        {
          $unwind: {
            path: "$message_detail.from_udetail"
          }
        },
        {
          $addFields: {
              bookmark_created_at:'$created_at',
            },
        },
        {
          $project: {
            _id: 1,
            message_id: 1,
            user_id: 1,
            bookmark_created_at: 1,
            message_detail: {
              _id: 1,
              conversation_id: 1,
              message: 1,
              from: 1,
              attachments: 1,
              sticker:1,
              chat_type: 1,
              conversation_detail: {
                _id: 1,
                conv_name: 1,
                // participants: {
                //   _id: 1,
                //   fullName: 1,
                //   profile_pic: 1
                // },
                grp_avatar: 1,
                is_group: 1
              },
              from_udetail: {
                _id: 1,
                fullName: 1,
                profile_pic: 1
              },
              send_datetime: 1
            }
          }
        },
        {
          $sort: {
            bookmark_created_at: -1
          }
        },
      ]
      return await bookmarkModel.aggregate(pipeline).then((result)=>{
        return res.status(200).json({message: "get data",data: result });
      })
    } catch (error) {
      console.log('error--1')
      console.log(error)
      return res.status(500).json({ message: "error", error });
    }
  },
  // get bookmark end

  // delete bookmark start
  del_bookmark: async (req, res) => {
    try{
      let message_id=new ObjectId(req.params.message_id);
      let user_id=new ObjectId(req.params.user_id);
      const bookExist= await bookmarkModel.find({ message_id: message_id, user_id: user_id });
      if (bookExist.length>0){
        const rmred=await bookmarkModel.deleteMany({ message_id: message_id, user_id: user_id });
        if(rmred.acknowledged){
          return res.status(200).json({message: "bookmark removed",data: rmred });
        }else{
          return res.status(500).json({ message: "bookmark not removed" });
        }
      }
    } catch (error) {
      console.log('error--2');
      console.log(error);
      return res.status(500).json({ message: "error", error });
    }
  },
  // delete bookmark end

  
  // archive conversation start
  // archive_by
  archiveConv: async (req, res) => {
    let conv_id=new ObjectId(req.body.conv_id);
    let user_id=req.body.user_id;
    let is_archive=req.body.is_archive;
    let user_id_obj=new ObjectId(req.body.user_id);
    
    const exist_conversations = await Conversation.find({
      _id: conv_id,
      // archive_by: { $eq:user_id_obj}
    });
    if (exist_conversations.length>0) {  
      if(is_archive=="yes"){
        const filter = {
          _id: conv_id,
          archive_by: { $all:[user_id_obj]}
        };
        
        const update = {
          $pull: { archive_by: user_id } // remove user ID to the 'archive_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }else{
        const filter = {
          _id: conv_id,
          archive_by: { $ne:user_id_obj}
        };
        
        const update = {
          $addToSet: { archive_by: user_id } // Add user ID to the 'archive_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }

      
  

    }else{
      return res.status(500).json({ message: "conversation not exist.." });
    }
  },
  // archive conversation end

  // Delete conversation start
  deleteConv: async (req, res) => {
    let conv_id=new ObjectId(req.body.conv_id);
    let user_id=req.body.user_id;
    let is_delete=req.body.is_delete;
    let user_id_obj=new ObjectId(req.body.user_id);
    
    const exist_conversations = await Conversation.find({
      _id: conv_id,
      // archive_by: { $eq:user_id_obj}
    });
    if (exist_conversations.length>0) {
      if(is_delete=="yes"){
        return res.status(500).json({ message: "error", error });
      }else{
        const filter = {
          _id: conv_id,
          delete_by: { $ne:user_id_obj}
        };
        
        const update = {
          $addToSet: { delete_by: user_id } // Add user ID to the 'delete_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          // also delete all msg(reciveved and send messages) for the user in this conversation
          deleteUserMsg_ByConverId(conv_id,user_id_obj,user_id);
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }
    }else{
      return res.status(500).json({ message: "conversation not exist.." });
    }
  },
  // Delete conversation end

  // remove user from conversation start
  remove_user_frm_room: async (req, res) => {
    const conversation_id = req.params.id;
    const type = req.params.type;
    // return;
    // checking conversation exist
    const exist_conversations = await Conversation.findById(conversation_id).select("_id participants");
    if (exist_conversations._id) {
      if(exist_conversations.participants.length>0){
        const participantIds = exist_conversations.participants.map(id => id.toString());
        // remove the participant from array
        let updatedParticipant;
        if(type=="add" && participantIds.length>0){
          const { participants } = req.body;
          // Merge the two arrays and remove duplicates
          updatedParticipant = [...new Set([...participantIds, ...participants])];
        }else if(type=="remove"){
          const { removedUserId } = req.body;
          updatedParticipant=participantIds.filter((e) => { return e != removedUserId});
        }
        let conv_id=new ObjectId(conversation_id)
        const filter = {
          _id: conv_id,
        };
        
        const update = {
          $set: { 
            participants: updatedParticipant
          }
        };
        // Update participant in onv list
        await Conversation.updateOne(filter, update).then(async e=>{
          if(type=="remove"){
            // add log of system event
            const event = new SystemEvent({
              conversation_id,
              eventType: 'remove',
              user: req.body.removerId,
              affectedUser:req.body.removedUserId
            });
            const response = await event.save();
            res.status(200).json({ message: 'Successfully user remove from conversation',data: participantIds});
          }else if(type=="add"){
            let authdata = getAuthData(req);
            let user_id=authdata._id;
            req.body.participants.forEach(async (e) => {

              // add log of system event
              const event = new SystemEvent({
                conversation_id,
                eventType: 'join',
                user: user_id,
                affectedUser:e
              });
              const response = await event.save();
            });
            let all_partipanc=await Conversation.findById(conversation_id).select("participants").populate("participants", "_id name email profile_pic fullName status is_online lastSeen");
            all_partipanc.participants.forEach(e => {
              e.isme=(e._id==user_id) ? isme ="yes":"no";
            });
            res.status(200).json({ message: 'Successfully user added to conversation',data: all_partipanc});
          }
        })
      }
    }
  },
  // remove user from conversation end

  // update profile personal info start
  updatePersonalInfo:async(req,res)=>{
    let authdata = getAuthData(req);
    let user_id=new ObjectId(authdata._id);
    let update;
    if (req.body.statusMsg) {
      update = {statusMsg:req.body.statusMsg};
    }else{
      update = {fullName:req.body.fullName};
    }
    // const { statusMsg } = req.body;
    await UserModel.findByIdAndUpdate(user_id, update, { new: true })
      .then(async(user) => {
          return res.status(201).json({ success: true, user });
        }
      )
      .catch((err) => res.status(500).json({ success: false, message: err.message }));
  },
  // update profile personal info end

  // update profile photo privacy start
  updatePhotoVisibility:async(req,res)=>{
    let authdata = getAuthData(req);
    let user_id=new ObjectId(authdata._id);
    const { visibility } = req.body;
    await UserModel.findByIdAndUpdate(user_id, {profilePhotoVisibility: visibility}, { new: true })
      .then(async(user) => {
          // Notify all contacts of the user about the change
          let user2 = await getAllContact_socket(user_id);
          const contacts = user2;
          // Emit event to each contact
          contacts.forEach(data => { 
            const {socket_id}=data;
            if(socket_id!=''){
              req.io.to(socket_id).emit('profilePhotoUpdated', { 
                user_id, // ID of the user who changed their profile photo privacy
                visibility //// The new privacy setting (e.g., 'Everyone','Contacts', 'Nobody')
               });
            }
          });
          res.json({ success: true, user });
        }
      )
      .catch((err) => res.status(500).json({ success: false, message: err.message }));
  },
  // update profile photo privacy end

  // get map tile start
  mapTile:async(req,res)=>{
    const { z, x, y } = req.params;
    const tileUrl = `http://tiles.stadiamaps.com/tiles/alidade_satellite/${z}/${x}/${y}.jpg?api_key=${STADIA_API_KEY}`;
    try {
      const response = await axios.get(tileUrl, { responseType: 'arraybuffer' });
      res.set('Content-Type', 'image/jpeg');
      res.send(response.data);
    } catch (error) {
      console.error('Error fetching tile:', error);  // Detailed error log
      res.status(500).json({ error: 'Failed to fetch tile', details: error.message });
    }
  },
  // get map tile end

  // favourite conversation start
  favouriteConv: async (req, res) => {
    const {conv_id, user_id,is_liked } =req.body;
    const conv_id_obj=new ObjectId(conv_id);
    const user_id_obj=new ObjectId(req.body.user_id);
    
    const exist_conversations = await Conversation.find({_id: conv_id_obj});
    if (exist_conversations.length>0) {  
      if(is_liked===false){
        const filter = {
          _id: conv_id_obj,
          like_by: { $all:[user_id_obj]}
        };
        
        const update = {
          $pull: { like_by: user_id } // remove user ID to the 'like_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }else{
        const filter = {
          _id: conv_id_obj,
          like_by: { $ne:user_id_obj}
        };
        
        const update = {
          $addToSet: { like_by: user_id } // Add user ID to the 'like_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }
    }else{
      return res.status(500).json({ message: "conversation not exist.." });
    }
  },
  // favourtie conversation end

  // Mute conversation start
  mute_conv:async(req,res)=>{
    const authdata = getAuthData(req);
    const user_id_obj=new ObjectId(authdata._id);
    const {conv_id,is_muted,user_id } =req.body;
    const conv_id_obj=new ObjectId(conv_id);
    
    const exist_conversations = await Conversation.find({_id: conv_id_obj});
    if (exist_conversations.length>0) {  
      if(is_muted===false){
        const filter = {
          _id: conv_id_obj,
          muted_by: { $all:[user_id_obj]}
        };
        
        const update = {
          $pull: { muted_by: user_id } // remove user ID to the 'muted_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }else{
        const filter = {
          _id: conv_id_obj,
          muted_by: { $ne:user_id_obj}
        };
        
        const update = {
          $addToSet: { muted_by: user_id } // Add user ID to the 'muted_by' array
        };
        // Execute the update
        await Conversation.updateOne(filter, update)
        .then((updatedConversation) => {
          return res.status(200).json({data: updatedConversation, message: "success"});
        })
        .catch((error) => {
          return res.status(500).json({ message: "error", error });
        });
      }
    }else{
      return res.status(500).json({ message: "conversation not exist.." });
    }
  },
  // Mute conversation end

  // notification seeen
  notificationSeen:async(notification_id)=>{
    // notification seen
    let response=await updateNotificationSeen(null,notification_id);
    if (response.modifiedCount) {
      return { status: 200, data:response };
    } else {
      return { status: 500, data: response };
    }
  },
  
  // Message Mark as unread start
  checkImageAuthorized: async (req, res) => {
    let authdata = getAuthData(req);
    let user_id=authdata._id;
    let user_id_obj=new ObjectId(authdata._id); //object based userid
    
    const fileName = req.params.filename;

    const hasAccess = await checkUserHasImageAccess(user_id, fileName);
    if (!hasAccess) return res.sendStatus(403); // Not allowed

    const imagePath = path.join(__dirname, 'uploads/chat', fileName);
    if (!fs.existsSync(imagePath)) return res.sendStatus(404);

    res.sendFile(imagePath);
  },
  // Message Mark as unread end

};

// Delete all preview mssage of the user for the conversation after del conversation start
function deleteUserMsg_ByConverId(conv_id,user_id_obj,user_id) {
  if(conv_id && conv_id!='' && user_id_obj && user_id_obj!=''){
    const filter = {
      conversation_id: conv_id,
      is_delete: 0,
      deleted_by: { $ne:user_id_obj}
    };
    
    const update = {
      $addToSet: { deleted_by: user_id } // Add user ID to the 'deleted_by' array
    };
    // Execute the update
    msgModel.updateMany(filter, update)
    .then((res) => {
    }).catch((error) => {
      console.error('Error updating delete messages by conversation:', error);
    });
  }
}
// Delete all preview mssage of the user for the conversation after del conversation end


 // count unread message by individual conversation start -function not using
async function getUnreadMsgCount2 (req, res,next){
  let authdata = getAuthData(req);
  let user_id=new ObjectId(authdata._id);

  // // Aggregation pipeline
  const pipeline = [
    {
      $match: {
        from:{$ne:user_id},
        is_delete: 0,
        readBy:{$ne:user_id}
      },
    },
    {
      $lookup: {
        from: "conversations",
        localField: "conversation_id",
        foreignField: "_id",
        as: "conv_detail",
      },
    },
    {
      $addFields: {
        conv_detail: {
          $arrayElemAt: ["$conv_detail.participants", 0],
        },
      },
    },
    {
      $match: {
        conv_detail: {
          $all: [user_id],
        },
      },
    },
    {
      $group: {
        _id: "$conversation_id",
        ucount: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        ucount: -1,
      },
    },
  ];

  // Execute the aggregation
  return await msgModel.aggregate(pipeline)
    .then((results) => {
      return results;
    })
    .catch((error) => {
      console.error(error);
      return [];
    });
}

async function getUnreadMsgCount3 (data){
  let user_id=new ObjectId(data.user_id);
  // Aggregation pipeline
  const pipeline = [
    {
      $match: {
        from:{$ne:user_id},
        is_delete: 0,
        readBy:{$ne:user_id}
      },
    },
    {
      $lookup: {
        from: "conversations",
        localField: "conversation_id",
        foreignField: "_id",
        as: "conv_detail",
      },
    },
    {
      $addFields: {
        conv_detail: {
          $arrayElemAt: ["$conv_detail.participants", 0],
        },
      },
    },
    {
      $match: {
        conv_detail: {
          $all: [user_id],
        },
      },
    },
    {
      $group: {
        _id: "$conversation_id",
        ucount: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        ucount: -1,
      },
    },
  ];

  // Execute the aggregation
  return await msgModel.aggregate(pipeline)
    .then((results) => {
      return results;
    })
    .catch((error) => {
      console.error(error);
      return [];
    });
}
// count unread message by individual conversation End

// reset deleted converstion if reviceve msg from conversation
function checkConvDeleted(data){
  // Fetching data where delete_by/archive_by is present and not empty
  Conversation.find(
    { 
      _id:new ObjectId(data.conversation_id),
      $or:[
        {delete_by: { $exists: true, $ne: [] }}, 
        {archive_by: { $exists: true, $ne: [] }}
      ] 
    })
  .then(async(res) => {
    if(res.length>0){
      let conv_id=new ObjectId(data.conversation_id)
      const filter = {
        _id: conv_id,
      };
      
      const update = {
        $set: { 
          delete_by: [],
          archive_by: [] 
        }
      };
      // Execute the update
      await Conversation.updateOne(filter, update).then(e=>{
      })
      .catch(err=>{
        console.log('error==1');
        console.log(err);
      })
    }
  })
  .catch(err => {
    console.error(err);
  });
};


// for temp conv messesage send then we check conversation exist if not then create conversation and return conversation id
async function checkAndCreateConversation(data1){
  // console.log('checkAndCreateConversation calling');
  // console.log(data1);
  // checking exist rec for one - one conv
   if (data1.chat_type == false) {
    const exist_conversations = await Conversation.find({
      participants: {
        $all: [data1.from2,data1.to],
      },
      is_group: false,
    });

    if (exist_conversations.length > 0) {
        await Conversation.findByIdAndUpdate(
          exist_conversations[0]._id,
          { $set: { delete_by: [] } },
          { new: true } // returns the updated document
        )
        .then(updatedDoc => {
          if (updatedDoc) {
            // console.log('Updated document:', updatedDoc);
          } else {
            console.log('Document not found.');
          }
        })
      return {
        message: "conversation already exist",
        data: exist_conversations,
      };
    }
    
    let insertData={
      participants: [data1.from2,data1.to],
      created_by: data1.from2,
      is_group: false
    }
    const conModel = new Conversation(insertData);
    try {
      const response = await conModel.save();
      if (response._id) {
        // let authdata = getAuthData(data1)._id;
  
        try {
          let particip=[data1.from2,data1.to];
          let response2 = [];
          for (let i = 0; i < particip.length; i++) {
            const memb_id = particip[i];
            let sd = {
              conversation_id: response._id,
              user_id: memb_id,
              is_leave: false,
              created_by: data1.from2,
            };
            const conGrpModel = new ConversationMem(sd);
            response2.push(await conGrpModel.save());
          }
          return {
            status:201,
            message: "Conversation member created successfully1",
            data: [response]
          };
        } catch (err) {
          return { status:500,message: "error", error };
        }
      }
      return { status:201,message: "Conversation created successfully2", data: [response] };
    } catch (error) {
      return { status:500,message: "error", error };
    }
  }
}
function sortUsers(u1, u2) {
  return u1.toString() < u2.toString() ? [u1, u2] : [u2, u1];
}
  // Simulated DB check
async function checkUserHasImageAccess(userId, fileName) {
  // Replace with DB query using filename to msg_id or conv_id
  // Simulate: user with ID 123 can access 'abc.jpg'
  if (userId && fileName !== 'abc.jpg') {
    return true;
  }
  return false;
}