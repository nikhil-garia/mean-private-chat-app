const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserLogSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  ip: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const UserLogModel = mongoose.model("userLog", UserLogSchema);
module.exports = UserLogModel;
