
const Notification = require('../models/notificationModel');
module.exports = {
  updateNotificationSeen:async(request_id=null,notification_id=null)=>{
    var filter='';
    if(request_id!=''){
      filter = {
        connectionId: request_id,
      };
    }
    if(notification_id){
      filter = {
        _id: notification_id,
      };
    }
    if(filter!=''){
      // console.log(filter);
      const update = { isSeen: true };
      // Execute the update
      return await Notification.updateOne(filter, update);
    }
  },
  createNotification: async (data) => {
    try {
      // console.log(data);
      const { connectionId, recipientId, senderId, type } = data;

      const message = type === 'connection_request'
        ? `sent you a connection request`
        : `accepted your connection request`;
      const notificationfor = (type === 'connection_request') ? recipientId : senderId;
      let checkExist=await Notification.countDocuments({connectionId,type});
        // console.log('checkExist');
        // console.log(checkExist);
      if(checkExist>0){
        // console.log('alredy added');
        return 'alredy added';
      }
      const notification = new Notification({
        for: notificationfor,
        connectionId,
        recipientId,
        senderId,
        type,
        message
      });

      await notification.save();

      // emit to recipient via Socket.IO
      // io.to(recipientId.toString()).emit('new-notification', notification);
      return notification;
      res.status(201).json(notification);
    } catch (err) {
    return err;
    res.status(500).json({ error: 'Failed to create notification' });
  }
},


  getNotifications: async (req, res) => {
    const { userId } = req.user; // assume auth middleware
    const { lastCreatedAt, limit = 20 } = req.query;

    const query = { recipientId: userId };
    if (lastCreatedAt) {
      query.createdAt = { $lt: new Date(lastCreatedAt) };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(notifications);
  }
}
