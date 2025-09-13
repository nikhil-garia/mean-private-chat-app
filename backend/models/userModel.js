const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    index: true, // useful if you search/sort by name
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  googleId: {
    type: String
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  profile_pic: {
    type: String,
    // default: 'avatar-5.jpg'
  },
  profilePhotoVisibility:{
    type:String,
    enum:['everyone', 'contacts', 'nobody'],
    default: 'everyone'
  },
  socket_id:{
    type:String,
    index: true,
    sparse: true,
  },
  status:{
    type:String,
    enum:['online','away','dnd'],
    default:'online',
  },
  is_online:{
    type:Boolean,
    default:false,
  },
  createdAt: {
    type: Date,
    detault: Date.now,
  },
  lastSeen: {
    type: Date,
    default: '', // ✅ explicitly set null
  },
  color_scheme:{
    type:String,
    enum:['dark','light'],
  },
  theme_color:{
    type:String,
    enum:['pink','voilet','blue','red','gray','green'],
  },
  theme_image:{
    type:String,
    enum:['pattern-01.png','pattern-02.png','pattern-03.png','pattern-04.png','pattern-05.png','pattern-06.png','pattern-07.png','pattern-08.png','pattern-09.png'],
  },
  statusMsg:{
    type:String,
    maxlength: 100, // limit for better performance
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpires: {
    type: Date,
    default: null
  }
});


module.exports = mongoose.model("users", UserSchema);
