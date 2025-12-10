// helpers/sessionHelper.js

/**
 * Function to create a session and set session data
 * @param {Object} req - The request object.
 * @param {object} user - The user to store in session.
 */
const createSession = (req, tokenObject) => {
  if (!req.session.user || req.session.user.filter((e) => { return e._id != tokenObject._id }).length == 0) {
    req.session.user = tokenObject; // Store user in session
  }
};

/**
 * Function to get the session data
 * @param {Object} req - The request object.
 * @returns {Object} - The session data or an error message.
 */
const getSession = (req) => {
  if (req.session.user) {
    console.log('Session data retrieved:', req.session);
    return req.session; // Return the session data
  } else {
    return { message: 'No session found' }; // Return error message if no session
  }
};

module.exports = { createSession, getSession };
