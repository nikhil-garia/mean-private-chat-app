const mongoose = require("mongoose");

const CallSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.ObjectId,
    ref: "Conversation",
  },
  is_group: {
    type: Boolean,
  },
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "users",
    },
  ],
  from: {
    type: mongoose.Schema.ObjectId,
    ref: "users",
  },
  to: {
    type: mongoose.Schema.ObjectId,
    ref: "users",
  },
  verdict: {
    type: String,
    enum: ["Accepted", "Denied", "Missed", "Busy"],
  },
  call_type:{
    type: String,
    enum: ["video", "audio"],
  },
  status: {
    type: String,
    enum: ["Ongoing", "Ended"],
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  groupName: {
    type: String,
  },
  denied: [{
    type: mongoose.Schema.ObjectId,
    ref: "users"
  }],
});

const Call = new mongoose.model("call", CallSchema);
module.exports = Call;