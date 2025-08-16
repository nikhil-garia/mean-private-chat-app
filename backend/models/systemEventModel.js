const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const systemEventSchema = new Schema({
  conversation_id: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  eventType: {
    type: String,
    enum: ['join', 'leave', 'call', 'remove'],
    required: true
  },
  user: { type: Schema.Types.ObjectId, ref: 'users', default: null }, // User who triggered the event
  affectedUser: { type: Schema.Types.ObjectId, ref: 'users', default: null }, // User who was removed, joined, etc.
  timestamp: { type: Date, default: Date.now },
  // Optional fields for specific event types
  callDuration: { type: Number, default: null } // For calls
});

module.exports = mongoose.model("SystemEvent", systemEventSchema);
