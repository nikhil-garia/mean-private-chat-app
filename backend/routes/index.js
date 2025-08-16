const express= require('express');
const routes = express.Router();
const userCon = require('../Controller/userCon');
const populateCon = require('../Controller/populateCon');
const chatCon = require('../Controller/chatCon');
const {userRegValidate,userLoginValidate} = require('../utils/userValidation');
const {ensureAuthenticated} = require('../utils/auth');

// Import mediasoup routes
const mediasoupRoutes = require('./mediasoupRoutes');
// Import call controller
const callCon = require('../Controller/callCon');

// auth
routes.post('/register',userRegValidate,userCon.registerUser);
routes.post('/login',userLoginValidate,userCon.loginUser);
routes.post('/auth/google',userCon.auth_with_google);
routes.post('/logout',userCon.logOut);
routes.post('/users',ensureAuthenticated,userCon.getUsers);
routes.post('/isLoggedinUser',userCon.isLoggedinUser);

// friend/Contacts
routes.post('/get-contacts',ensureAuthenticated,userCon.getContacts);
routes.post('/get-contacts-req',ensureAuthenticated,userCon.getContactRequest);
routes.post('/get-all-contact-detail',ensureAuthenticated,userCon.getAllContactDetail);
routes.get('/get-all-contacts',ensureAuthenticated,userCon.getAllContacts);

// chat
routes.post('/createConv',ensureAuthenticated,chatCon.createConv);
routes.post('/get-conv',ensureAuthenticated,chatCon.getConv);
routes.post('/get-msg-by-conv',ensureAuthenticated,chatCon.getMesgByConv);
routes.post('/upload_chat_file',ensureAuthenticated,chatCon.uploadChatFile);
routes.post('/upload_profile_img',ensureAuthenticated,chatCon.uploadProfileImg);
routes.post('/get-attachment-by-convId',ensureAuthenticated,chatCon.getAttachByConvId);
routes.get('/get-attached-file',ensureAuthenticated,chatCon.getAttachedFile); // for all attach file from all conv for the user
routes.post('/get-unread-message',ensureAuthenticated,chatCon.getUnreadMsg);
routes.post('/get-unread-message-count',ensureAuthenticated,chatCon.getUnreadMsgCount);
routes.get('/bookmark',ensureAuthenticated,chatCon.bookmark);
routes.delete('/bookmark/:message_id/:user_id',ensureAuthenticated,chatCon.del_bookmark);
// call list
routes.get("/get-call-list", ensureAuthenticated, userCon.getCallList);
// archive
routes.post("/archive_conversation", ensureAuthenticated, chatCon.archiveConv);
routes.post("/favourite_conversation", ensureAuthenticated, chatCon.favouriteConv);
routes.post("/delete_conversation", ensureAuthenticated, chatCon.deleteConv);
routes.post('/conversation/mute',ensureAuthenticated, chatCon.mute_conv);
// for theme 
routes.post("/update_theme", ensureAuthenticated, userCon.update_theme);
routes.get("/get_theme", ensureAuthenticated, userCon.get_theme);
// system event
routes.post("/conversation/:id/:type", ensureAuthenticated, chatCon.remove_user_frm_room);
// setting->privacy
routes.post("/updatePhotoVisibility", ensureAuthenticated, chatCon.updatePhotoVisibility);
// setting->Intro
routes.post("/updatePersonalInfo", ensureAuthenticated, chatCon.updatePersonalInfo);
// location tile
routes.get("/tiles/:z/:x/:y", chatCon.mapTile);
// mark unread msg
routes.put("/conversation/markUnread", ensureAuthenticated, chatCon.markAsUnRead);
routes.get("/file/:filename", ensureAuthenticated, chatCon.checkImageAuthorized);

// populate data
routes.get('/reg_bulk',populateCon.registerBulk);
routes.get('/conn_bulk',populateCon.populateConnections);
// contact
routes.get('/get-filtered-user',ensureAuthenticated,userCon.getAllFilteredUser);
routes.get('/turn-credentials', userCon.getTurnCred);

// =========== MEDIASOUP ROUTES =============
// Mount mediasoup routes under /mediasoup prefix
routes.use('/mediasoup', mediasoupRoutes);

// =========== CALL ROUTES =============
// Get call details by ID
routes.get('/call/:callId', ensureAuthenticated, callCon.getCallDetails);
// Get all calls for a user
routes.get('/call/user/:userId', ensureAuthenticated, callCon.getUserCalls);
// Update call status
routes.patch('/call/:callId/status', ensureAuthenticated, callCon.updateCallStatus);

module.exports= routes;