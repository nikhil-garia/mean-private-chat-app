const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const frSchema = new Schema({
  sender:{
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  recipient:{
    type: Schema.Types.ObjectId,
    ref: "users",
  },
  status: {
    type: String,
    enum: ['pending', 'accept','reject'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    detault: Date.now,
  },
});

const fr = mongoose.model("FrientRequest", frSchema);
module.exports = fr;
