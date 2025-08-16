const UserModel = require("../models/userModel");
const Call = require("../models/call");
const ConnectionModel = require("../models/ConnectionModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getAuthData } = require("../utils/auth");
require("dotenv").config();
const catchAsync=require('../utils/catchAsync');
const mongoose = require('mongoose');
const UserLogModel = require("../models/userLogModel");
const SystemEvent = require("../models/systemEventModel");
const ObjectId = mongoose.Types.ObjectId;
const { createSession, getSession } = require('../helpers/sessionHelper');
const { verifyGoogleToken } = require('./auth/googleAuth');
const { getAllContact } = require('../helpers/commonHelper');
const Conversation = require("../models/convModel");
module.exports = {
  // validate req.body
  // ceate mongo db user model
  // do pass encryp
  // save data to monogo
  // return res to client
  registerUser: async (req, res) => {
    // req.body.profile_pic = "avatar-5.jpg"; //set def profie pic
    const userModel = new UserModel(req.body);
    userModel.password = await bcrypt.hash(req.body.password, 10);
    try {
      const response = await userModel.save();
      response.password = undefined;
      return res.status(200).json({ message: "succes", data: response });
    } catch (error) {
      return res.status(500).json({ message: "error", error });
    }
  },

  // check user using email
  // compare pwd
  // create jwt token
  // send to the client
  loginUser: async (req, res) => {
    try {
      const user = await UserModel.findOne({ email: req.body.email }).select(
        "+password"
      );
      if (!user) {
        return res
          .status(401)
          .json({ message: "Auth failed, Invalid email/password" });
      }

      const isPassEql = await bcrypt.compare(req.body.password, user.password);
      if (!isPassEql) {
        return res
          .status(401)
          .json({ message: "Auth failed, Invalid email/password" });
      }
      const tokenObject = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profile_pic: user.profile_pic ? user.profile_pic : "",
      };
      const jwtToken = jwt.sign(tokenObject, process.env.SECRET, {
        expiresIn: "4h",
      });
      if(req.session){ 
        // Create the session using the helper function
        createSession(req, tokenObject);
      } else {
        return res.status(500).send("Failed to create session");
      }
      
      // save userlog
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const user_log = new UserLogModel({ user_id:user._id, ip:ip });
      user_log.save();

      return res.status(200).json({ jwtToken, tokenObject });
    } catch (err) {
      return res.status(500).json({ message: "error", err });
    }
  },

  logOut: async (req, res) => {
    req.session.destroy();
    return res.status(200).json({ msg: "successfully logout" });
  },

  // get user after authenticate
  getUsers: async (req, res) => {
    try {
      const users = await UserModel.find({}, { password: 0 });
      return res.status(200).json({ data: users, message: "success" });
    } catch (error) {
      return res.status(500).json({ message: "error", error });
    }
  },
  // checking user session exist
  isLoggedinUser: (req, res) => {
    let sess=getSession(req);
    if (
      sess.user &&
      req.body.user_id == sess.user._id &&
      req.body.email == sess.user.email
    ) {
      return res.status(200).json({ data: "1", message: "session exist" });
    } else {
      return res.status(401).json({ data: "0", message: "session not exist" });
    }
  },
  getContacts: async (req, res) => {
    try {
      const user = await UserModel.findById(req.data._id).populate(
        "contact",
        "_id fullName profile_pic"
      );
      return res.status(200).json({ data: user.contact, message: "get data" });
    } catch (error) {
      return res.status(500).json({ message: "error", error });
    }
  },
  getContactRequest: async (req, res) => {
    try {
      const friend_req = await ConnectionModel.find({
        status: 'pending',
        initiator: { $ne: req.data._id },
        $or: [
          { userA: req.data._id },
          { userB: req.data._id }
        ]
      }).populate('initiator', '_id fullName profile_pic email'); // optional: show sender info
      return res.status(200).json({ data: friend_req, message: "get data" });
    } catch (error) {
      return res.status(500).json({ message: "error", error });
    }
  },
  getAllContactDetail: async (req, res) => {
    try {
      let authdata = getAuthData(req);
      let user_id=authdata._id;
      const contact_req = await ConnectionModel.find({
        status: 'pending',
        initiator: { $ne: user_id },
        $or: [
          { userA: user_id },
          { userB: user_id }
        ]
      }).populate('initiator', '_id fullName profile_pic email').select('_id, initiator, status, createdAt'); // optional: show sender info
      const all_user = await UserModel.find().limit(10);
      // const all_contacts = await UserModel.findById(user_id).populate("contacts");
      
      const all_contacts = await getAllContact(user_id);
      let data={
        contact_req:contact_req,
        all_user:all_user,
        all_contacts:all_contacts,
      }
      return res.status(200).json({ data: data, message: "get data" });
    } catch (error) {
      console.log('error--1')
      console.log(error)
      return res.status(500).json({ message: "error", error });
    }
  },
  // all contact/connection only start
  getAllContacts: async (req, res) => {
    try {
      let authdata = getAuthData(req);
      let user_id=authdata._id;
      // const all_contacts = await UserModel.findById(user_id).populate("contacts");
      
      const all_contacts = await getAllContact(user_id);
      return res.status(200).json({ data: all_contacts, message: "get data" });
    } catch (error) {
      console.log('error--1')
      console.log(error)
      return res.status(500).json({ message: "error", error });
    }
  },
  getAllFilteredUser: async (req, res) => {
    try {
      const search = req.query.search;
      const skip = parseInt(req.query.skip) || 0;
      const limit = parseInt(req.query.limit) || 20;
      if (!search || typeof search !== 'string' || !search.trim()) {
        return res.status(400).json({ message: 'Missing or invalid search parameter' });
      }
      const users = await UserModel.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }, {
        _id: 1,
        fullName: 1,
        email: 1,
        profile_pic: 1
      }).skip(skip).limit(limit);
      return res.status(200).json({ data: { all_user: users }, message: 'success' });
    } catch (error) {
      return res.status(500).json({ message: 'error', error });
    }
  },
  // all contact/connection only end

  // for audio call start entry on db start here
  startCall: async (data) => {
    try{
      const {conversation_id,is_group,from_user_id,to_user_id,type,conv_participant, groupName} = data;
      const from = from_user_id;
      const to = to_user_id;
      const call_type = type;
      
      const from_user = await UserModel.findById(from);
      let to_user='';
      let group_name = groupName;
      if(is_group && !group_name){
        // Fetch group name from Conversation model
        const conv = await Conversation.findById(conversation_id);
        group_name = conv?.conv_name || '';
      }
      if(!is_group){
        to_user = await UserModel.findById(to);
      }
  
      // create a new call call Doc and send required data to client
      const insert_data={
        from,
        status: "Ongoing",
        call_type:call_type,
        conversation_id,
        is_group
      }
      if(is_group){
        insert_data.groupName = group_name;
      }
      if(!is_group){
        insert_data.to=to;
        insert_data.participants= [from, to];
      }else{
        insert_data.participants= [from];
      }
      const new_audio_call = await Call.create(insert_data);

      if(new_audio_call._id){
        // add log of system event
        let inserData={
          conversation_id,
          eventType: 'call',
          user: from_user_id,
        }
        if(!is_group){
          inserData.affectedUser=to_user_id;
        }
        const event = new SystemEvent(inserData);
        const response = await event.save();
        // console.log('system event log',response);
      }

      return { status: 200, data: {
          from: to_user,
          call_id: new_audio_call._id,
          streamID: !is_group ? to:"",
          userID: from,
          userName: from_user.fullName,
          conversation_id,
          is_group,
          conv_participant,
          groupName: group_name
        }, msg:"created successfully" 
      };
    } catch (err) {
      console.log(err);
      return { status: 500, data: err };
    }
  },
  // for audio call start entry on db end here

  // get all call list start
  getCallList:async (req,res)=>{
    let authdata = getAuthData(req);
    let user_id=new ObjectId(authdata._id);
    console.log('user_id');
    console.log(user_id);
    // new

    // // Aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: "conversations",
          localField: "conversation_id",
          foreignField: "_id",
          as: "conv_detail",
          pipeline: [
            {
              $match: {
                participants: { $all: [user_id] },
              },
            },
            {
              $match: {
                delete_by: { $ne: user_id }, // Ensure the document is not deleted by the current user
              },
            },
            { $project: { conv_name: 1,grp_avatar:1,participants: 1,} }, // Include only fullName and profile_pic
          ],
        },
      },
      {
        $addFields: {
          conv_detail: {$arrayElemAt: ["$conv_detail", 0],},
        },
      },
      {
        $match: {
          $and: [
            // { participants: { $all: [user_id] } }, // Match call participants with user_id
            { "conv_detail.participants": { $all: [user_id] } }, // Match conversation participants with user_id
          ],
        }
      },
      {
        $sort: {
          created_at: -1
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "from_detail",
          pipeline: [
            // { $project: { password: 0 } }, // Exclude password field
            { $project: { fullName: 1, profile_pic: 1 } }, // Include only fullName and profile_pic
          ],
        },
      },
      {
        $addFields: {
          from_id: {$arrayElemAt: ["$from_detail", 0],},
        },
      },
      {
        $addFields: {
          to_lookup:{
            $cond:{if:{$eq:["$is_group",true]}, then: null, else:"$to"},
          }
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "to_lookup",
          foreignField: "_id",
          as: "to_detail",
          pipeline: [
            // { $project: { password: 0 } }, // Exclude password field
            { $project: { fullName: 1, profile_pic: 1 } }, // Include only fullName and profile_pic
          ],
        },
      },
      {
        $addFields: {
          to_id: {$arrayElemAt: ["$to_detail", 0],},
        },
      },
      {
        $project:{_id:1,conversation_id:1,is_group:1,participants:1,call_type:1,status:1,startedAt:1,endedAt:1,verdict:1,to_id:1,from_id:1,created_at:1,conv_detail:1},
      }
    ];

    // Execute the aggregation
    Call.aggregate(pipeline)
      .then((results) => {
        // console.log(results);
        return res
          .status(200)
          .json({
            data: results,
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
  // get all call list end

  // get theme start
  get_theme: async(req,res)=>{
    try {
      let authdata = getAuthData(req);
      let user_id=authdata._id;
      const theme_data = await UserModel.findById(user_id).select("_id color_scheme theme_color theme_image");
      return res.status(200).json({ data: theme_data, message: "get data" });
    } catch (error) {
      console.log('error--1')
      console.log(error)
      return res.status(500).json({ message: "error", error });
    }
  },
  // get theme end
  
  // Update theme start
  update_theme: async (req, res) => {
    // console.log('inside update_theme=== ');
    // console.log(req.body);
    let theme_color=req.body.theme;
    let color_scheme=req.body.scheme;
    let theme_image=req.body.themeImage;
    let authdata = getAuthData(req);
    let user_id=authdata._id;
    let user_id_obj=new ObjectId(user_id);
    
    const exist_user = await UserModel.findById(user_id);
    // console.log('exist_user');
    // console.log(exist_user);
    if (exist_user && exist_user._id) {
      // console.log('user exist');
      // console.log("user_id="+user_id);
  
      const filter = {
        _id: user_id_obj,
      };
      let update;
      if(theme_image && theme_image!=''){
        update = {
          theme_image:theme_image
        };
      }else{
        update = {
          color_scheme:color_scheme,
          theme_color:theme_color
        };
      }
      // Execute the update
      await UserModel.updateOne(filter, update)
      .then((updatedUser) => {
        // console.log('theme updated:', updatedUser);
        // also delete all msg(reciveved and send messages) for the user in this UserModel
        return res.status(200).json({data: updatedUser, message: "success"});
      })
      .catch((error) => {
        // console.error('Error updating messages:', error);
        return res.status(500).json({ message: "error", error });
      });
      
    }else{
      return res.status(500).json({ message: "user not exist.." });
    }
  },
  // Update theme end

  auth_with_google: async (req, res) => {
    const { token } = req.body;
    // console.log(token);
    try {
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }
      const user = await verifyGoogleToken(token);

      // You can now handle login, registration, session token, etc.
      // console.log("Verified Google user:", user);

       const { email, name, id, picture } = user;

      let userExist = await UserModel.findOne({ email }).select(
          "+password"
        );
      // console.log('userExist');
      // console.log(userExist);
      if (!userExist) {
        // Create new user
        const userModel = new UserModel({
          email,
          fullName:name,
          googleId: id,
          profile_pic:picture,
        });
        let hasPass='"'+getRandomInt(100, 999999)+'"';
        userModel.password = await bcrypt.hash(hasPass, 10);
        const response = await userModel.save();
        // console.log('response');
        // console.log(response);
        userExist=response;
      }
      // console.log('final userExist');
      // console.log(userExist);
      const tokenObject = {
        _id: userExist._id,
        fullName: userExist.fullName,
        email: userExist.email,
        profile_pic: userExist.profile_pic ? userExist.profile_pic : "",
      };
      const jwtToken = jwt.sign(tokenObject, process.env.SECRET, {
        expiresIn: "4h",
      });
      if (req.session) {
        // Create the session using the helper function
        createSession(req, tokenObject);
      } else {
        return res.status(500).send("Failed to create session");
      }

      // save userlog
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const user_log = new UserLogModel({ user_id: userExist._id, ip: ip });
      user_log.save();

      return res.status(200).json({ jwtToken, tokenObject });
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  },
  getTurnCred : (req, res) => {
    const crypto = require('crypto');
    const secret = process.env.TURN_SECRET; // set in .env
    const realm = process.env.TURN_REALM || 'yourdomain.com';
    const username = Math.floor(Date.now() / 1000) + 3600; // valid for 1 hour
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(username + ':' + realm);
    const password = hmac.digest('base64');
    res.json({
      username: username.toString(),
      credential: password,
      urls: [
        `turn:${process.env.TURN_HOST}:3478`
      ]
    });
  },

};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}