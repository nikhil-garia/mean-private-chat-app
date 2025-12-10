const ConnectionModel = require("../models/ConnectionModel");

/**
 * Get all contacts for a user
 * @param {String} user_id - ID of the user
 * @returns {Promise<Array>} - List of contacts
 */
const getAllContact = async (user_id) => {
  try {
    // const contacts = await Contact.find({ userId });
    // return contacts;
    let connectedUsers= await ConnectionModel.find({
    status:'connected',
    $or: [
        { userA: user_id },
        { userB: user_id }
    ]
    }).populate('userA', '_id fullName profile_pic email socket_id')
    .populate('userB', '_id fullName profile_pic email socket_id');
    let all_contacts= connectedUsers.map(conn=>{
    return conn.userA._id.toString()==user_id.toString() ? conn.userB : conn.userA;
    });
    return all_contacts;
  } catch (error) {
    throw new Error('Failed to fetch contacts: ' + error.message);
  }
};
// for fetch socket in user contact list
const getAllContact_socket = async (user_id) => {
  try {
    // const contacts = await Contact.find({ userId });
    // return contacts;
    let connectedUsers= await ConnectionModel.find({
    status:'connected',
    $or: [
        { userA: user_id },
        { userB: user_id }
    ]
    }).populate('userA', '_id socket_id')
    .populate('userB', '_id socket_id');
    let all_contacts= connectedUsers.map(conn=>{
    return conn.userA._id.toString()==user_id.toString() ? conn.userB : conn.userA;
    });
    return all_contacts;
  } catch (error) {
    throw new Error('Failed to fetch contacts: ' + error.message);
  }
};


const getConnectionById = async (user_id,connect_id) => {
  try {
    // const contacts = await Contact.find({ userId });
    // return contacts;
    let connectedUsers= await ConnectionModel.find({
    status:'connected',
    _id:connect_id,
    $or: [
        { userA: user_id },
        { userB: user_id }
    ]
    }).populate('userA', '_id fullName profile_pic email socket_id')
    .populate('userB', '_id fullName profile_pic email socket_id');
    let all_contacts= connectedUsers.map(conn=>{
    return conn.userA._id.toString()==user_id.toString() ? conn.userB : conn.userA;
    });
    return all_contacts;
  } catch (error) {
    throw new Error('Failed to fetch contacts: ' + error.message);
  }
};

module.exports = {
  getAllContact,getAllContact_socket,getConnectionById
};
