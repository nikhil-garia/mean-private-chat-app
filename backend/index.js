// =============================================
//               IMPORTS
// =============================================
// Core & Third-party Modules
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require('cors');
const http = require("http");
const https = require("https");
const fs = require("fs");

// Internal Modules & Services
const apiRoutes = require("./routes");
const initializeWebSocket = require("./Controller/webSocket");
const MediasoupService = require('./services/mediasoupService');
require("./config/db"); // Establishes DB connection

// =============================================
//           ENVIRONMENT & CONFIG
// =============================================
const {
  NODE_ENV,
  PORT = 8080,
  ORIGIN,
  DOMAIN,
  MY_C_KEY,
} = process.env;

const isProduction = NODE_ENV === "production";
const appOrigin = ORIGIN || 'http://localhost:4200';

// =============================================
//            APP INITIALIZATION
// =============================================
const app = express();

// =============================================
//               MIDDLEWARE
// =============================================

// 1. CORS Configuration (Consolidated)
// This single block replaces the two separate CORS configurations.
const corsOptions = {
  origin: appOrigin,
  credentials: true,
};
app.use(cors(corsOptions));

// 2. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session Management (Optimized Settings)
// Using resave: false and saveUninitialized: false is recommended for most apps.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false, // Don't save session if unmodified.
    saveUninitialized: false, // Don't create a session until something is stored.
    cookie: {
      sameSite: 'lax', // Good default for security and usability.
      secure: isProduction, // Use secure cookies in production (HTTPS).
      httpOnly: true, // Prevent client-side JS from accessing the cookie.
    }
  })
);

// 4. Serve Static Files
app.use('/uploads', express.static('uploads'));

// =============================================
//          SERVER & SERVICES SETUP
// =============================================
let server;

if (isProduction && DOMAIN) {
  // Production: Create HTTPS server with error handling for certs.
  try {
    const options = {
      key: fs.readFileSync(`/etc/letsencrypt/live/${DOMAIN}/privkey.pem`),
      cert: fs.readFileSync(`/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`)
    };
    server = https.createServer(options, app);
    console.log("HTTPS server configured for production.");
  } catch (error) {
    console.error("Error: Could not read SSL certificate files. Check paths in .env file.", error);
    process.exit(1); // Exit if certs are missing in production.
  }
} else {
  // Development: Create HTTP server.
  server = http.createServer(app);
  console.log("HTTP server configured for development.");
}

// Initialize and attach custom services
const mediasoupService = new MediasoupService();
app.set('mediasoupService', mediasoupService); // Make service available via app.get('mediasoupService')

// Initialize WebSocket and attach its instance to requests
const io = initializeWebSocket(server, app);
app.use((req, res, next) => {
  req.io = io; // Make io instance available in all route handlers
  next();
});

// =============================================
//                   ROUTES
// =============================================
// All API routes are prefixed with /api/v1
app.use("/api/v1", apiRoutes); // Changed 'route' to 'apiRoutes' for clarity

// =============================================
//                SERVER START
// =============================================
server.listen(PORT, () => {
  console.log(`Server is up and running on PORT: ${PORT}`);
});
