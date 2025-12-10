// middleware/sessionMiddleware.js

// const createSession = (req, res, next) => {
//     console.log('creating session:');
//     if (!req.session.username) {
//         req.session.username = 'user1'; // Set session data (username)
//         console.log('Session created:', req.session);
//     }
//     next(); // Pass control to the next middleware
// };

const getSession = (req, res, next) => {
    console.log('Session data retrieved:', req.session);
    if (req.session.user) {
        // return res.send(`Session user: `,req.session.user);
        next(); // Pass control to the next middleware
        return res.status(200).json({ data: req.session.user, message: "session found" });
    } else {
        // return res.status(400).send('No session found');
        // return false;
        return res.status(401).json({ data: "0", message: "No session found" });
    }
};

module.exports = { getSession };
