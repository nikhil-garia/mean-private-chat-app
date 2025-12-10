const jwt = require('jsonwebtoken');

const ensureAuthenticated = (req,res,next)=>{
    const bearerHeader = req.headers['authorization'];
    if(!bearerHeader){
        return res.status(403).json({msessage:'Token is required'});
    }
    try {
        const bearer= bearerHeader.split(' ');
        const bearerToken = bearer[1] ? bearer[1]: bearer[0];
        const decoded = jwt.verify(bearerToken,process.env.SECRET);
        return next();
    } catch (error) {
        return res.status(403).json({message:"Token is not valid, or it's expired"});
    }
}
const getAuthData = (req,res,next)=>{
    const bearerHeader = req.headers['authorization'];
    if(!bearerHeader){
        return res.status(403).json({msessage:'Token is required'});
    }
    try {
        const bearer= bearerHeader.split(' ');
        const bearerToken = bearer[1] ? bearer[1]: bearer[0];
        const decoded = jwt.verify(bearerToken,process.env.SECRET);
        return decoded;
    } catch (error) {
        return res.status(403).json({message:"Token is not valid, or it's expired"});
    }
}

const socketTokeVerify = (authToken)=>{
    try{
        jwt.verify(authToken, process.env.SECRET, function(err, decoded) {
            if (err) return next(new Error('Authentication error'));
            console.log('socket jwt authorized successfully');
            // socket.decoded = decoded;
            // console.log(socket.decoded);
            return next();
        });
    } catch (error) {
        return ({status:500,message:"Token is not valid, or it's expired"});
    }
}
// for verify token
const verifyTokenMiddleware = (socket, next) => {
    const token = socket.handshake.auth?.token;
    // console.log('verify token middleware:',token);
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      // Attach decoded data to the socket
      socket.user = decoded;
      next();
    });
};
module.exports = {ensureAuthenticated,getAuthData,socketTokeVerify,verifyTokenMiddleware};