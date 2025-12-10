const mongoose = require("mongoose");
const url = process.env.MONGO_URL;

mongoose.set('strictQuery',true);
mongoose.connect(url,{
    // useNewUrlParser:true,
    // useUnifiedTopology:true,
    family:4
}).then(() => {
    console.log('mongo db connected');
}).catch((err)=>{
    console.log('error while connection',err);
});
