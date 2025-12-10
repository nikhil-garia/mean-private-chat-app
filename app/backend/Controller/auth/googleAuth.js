// auth/googleAuth.js
const { OAuth2Client } = require('google-auth-library');

require("dotenv").config();
const CLIENT_ID = process.env.CLIENT_ID; // Replace with your actual client ID
const client = new OAuth2Client(CLIENT_ID);

/**
 * Verifies a Google ID token and returns the user info
 * @param {string} token - The Google ID token
 * @returns {object} - The decoded Google user payload
 */
async function verifyGoogleToken(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID,
  });

  const payload = ticket.getPayload();
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

module.exports = { verifyGoogleToken };
