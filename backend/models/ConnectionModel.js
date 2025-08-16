// models/Connection.js
const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  userA: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'users' },
  userB: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'users' },
  initiator: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'users' },
  status: { type: String, enum: ['pending', 'connected', 'rejected'], default: 'pending' },
},
{
  timestamps: true, // adds createdAt and updatedAt automatically
});

// Normalize order before saving
connectionSchema.pre('save', function (next) {
  if (this.userA.toString() > this.userB.toString()) {
    const temp = this.userA;
    this.userA = this.userB;
    this.userB = temp;
  }
  next();
});

// Index to ensure uniqueness
connectionSchema.index({ userA: 1, userB: 1 }, { unique: true });

// Indexes for lookups
connectionSchema.index({ status: 1 });
connectionSchema.index({ userA: 1 });
connectionSchema.index({ userB: 1 });
connectionSchema.index({ initiator: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
