const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const msgModel = new Schema({
  conversation_id: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  from: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  message: {
    type: String,
  },
  sticker: {
    type: String,
  },
  attachments: [
    {
      type: Object,
    },
  ],
  chat_type: {
    type: Number,
    enum: [0, 1],
    default: 0,
    required: true,
  },
  reply_to: {
    type: Schema.Types.ObjectId,
    ref: "messages",
  },
  location:[{
    type: Number,
  }],//[lat,lang]
  readBy: [{ type: Schema.Types.ObjectId, ref: 'users' }], // Array of user IDs who have read the message
  deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'users' }], // Array of user IDs who received the message
  is_edit: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  is_delete: {
    type: Number,
    enum: [0, 1],
    default: 0,
  },
  deleted_by: [{
    type: Schema.Types.ObjectId,
    ref: "users",
  }],
  send_datetime: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  updated_date: {
    type: Date,
    default: Date.now,
  },
  forward_msg_id: {
    type: Schema.Types.ObjectId,
    ref: "messages",
  },
  forward_snapshot: {
    text: { type: String },
    attachments: [{ type: Object }],
    sender: {
      _id: { type: Schema.Types.ObjectId, ref: "users" },
      name: { type: String },
    },
    // You can add more fields as needed (e.g., timestamp)
  },
  forwarded: {
    type: Boolean,
    default: false,
  },
});

// 🧠 Geo index for location-based queries
msgModel.index({ location: '2dsphere' });

// ✅ Compound index for unread message query performance
msgModel.index({ from: 1, is_delete: 1, readBy: 1 });

// ✅ Index for conversation lookups
msgModel.index({ conversation_id: 1 });

// ✅ Index for sorting messages by time
msgModel.index({ send_datetime: -1 });

// ✅ Optional: index on readBy for direct queries
msgModel.index({ readBy: 1 });

module.exports = mongoose.model("messages", msgModel);
