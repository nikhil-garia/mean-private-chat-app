const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  for: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
  connectionId:{type: mongoose.Schema.Types.ObjectId, ref: 'Connection', index: true},
  type: { type: String, enum: ['connection_request', 'connection_accepted'], required: true },
  message: { type: String },
  isSeen: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Optional: Expire notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
