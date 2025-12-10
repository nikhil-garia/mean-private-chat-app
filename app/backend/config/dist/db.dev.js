"use strict";

var mongoose = require("mongoose");

var url = process.env.MONGO_URL;
mongoose.set('strictQuery', true);
mongoose.connect(url, {
  // useNewUrlParser:true,
  // useUnifiedTopology:true,
  family: 4
}).then(function () {
  console.log('mongo db connected');
})["catch"](function (err) {
  console.log('error while connection', err);
});