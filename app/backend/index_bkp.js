const express = require("express");
const session = require("express-session");
const cors = require('cors');
const route = require("./routes");
const webSocket = require("./Controller/webSocket"); // Import the webSocket function
const app = express();
const fs = require("fs");
require("dotenv").config();

app.use(cors({origin:process.env.origin || 'http://localhost:4200',credentials: true}));
app.use('/uploads', express.static('uploads'));

let server;
if(process.env.environment=="development"){
  const http = require("http");
  server = http.createServer(app);
}else{
  const https = require("https");
  // Load SSL certificate and key
  const options = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${process.env.domain}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${process.env.domain}/fullchain.pem`)
  };
  server = https.createServer(options,app);
}

// Initialize Mediasoup service
const MediasoupService = require('./services/mediasoupService');
const mediasoupService = new MediasoupService();
app.set('mediasoupService', mediasoupService);

// Initialize WebSocket with the server
const io = webSocket(server,app);

// const bodyParser = require("body-parser");

require("./config/db");

// Middleware to parse json body
app.use(express.json());

// Middleware to parse URL-encoded
app.use(express.urlencoded({extended:true}));
// Initialize the session middleware
app.use(
  session({
    secret: process.env.MY_C_KEY,
    resave: true, // Do not save session if unmodified
    saveUninitialized: true, // Do not create session until something is stored
    cookie: { 
      sameSite: true, 
      secure: process.env.environment === "production", // Set to true if using HTTPS
      httpOnly: true // Make cookie inaccessible to JavaScript
    }
  })
);

const PORT = process.env.PORT || 8080;

app.use(function (req, res, next) {
  // res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Origin", process.env.origin || "http://localhost:4200"); 
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Credentials", "true"); // Allow credentials
  next();
});
app.use((req, res, next) => {
  req.io = io; // Attach io instance to req
  next();
});
app.use("/api/v1", route);


server.listen(PORT, () => {
  console.log(`Serever is up and runniong on PORT: ${PORT}`);
});