const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookmarkModel = new Schema({
  message_id: {
    type: Schema.Types.ObjectId,
    ref: "messages",
    required: true,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
});
bookmarkModel.index({location: '2dsphere'});

module.exports = mongoose.model("bookmark", bookmarkModel);
