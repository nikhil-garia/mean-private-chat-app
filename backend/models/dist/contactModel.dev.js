"use strict";

var mongoose = require("mongoose");

var Schema = mongoose.Schema;
var ContactSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    "enum": ['new', 'read', 'replied', 'archived'],
    "default": 'new'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // adds createdAt and updatedAt automatically

}); // Index for better query performance

ContactSchema.index({
  email: 1
});
ContactSchema.index({
  status: 1
});
ContactSchema.index({
  createdAt: -1
});
module.exports = mongoose.model("Contact", ContactSchema);