const Call = require('../models/call');

// Get call details by ID
const getCallDetails = async (req, res) => {
  try {
    const callId = req.params.callId;
    const call = await Call.findById(callId)
      .populate('started_by', '_id fullName profile_pic')
      .populate('created_by', '_id fullName profile_pic');
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    
    res.json({
      _id: call._id,
      started_by: call.started_by?._id,
      started_by_name: call.started_by?.fullName,
      started_by_pic: call.started_by?.profile_pic,
      created_by: call.created_by?._id,
      created_by_name: call.created_by?.fullName,
      created_by_pic: call.created_by?.profile_pic,
      conversation_id: call.conversation_id,
      is_group: call.is_group,
      status: call.status,
      participants: call.participants
    });
  } catch (error) {
    console.error('Error fetching call details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all calls for a user
const getUserCalls = async (req, res) => {
  try {
    const userId = req.params.userId;
    const calls = await Call.find({
      participants: userId
    }).populate('started_by', '_id fullName profile_pic')
      .populate('conversation_id', '_id conv_name is_group')
      .sort({ startedAt: -1 });
    
    res.json(calls);
  } catch (error) {
    console.error('Error fetching user calls:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update call status
const updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status } = req.body;
    
    const call = await Call.findByIdAndUpdate(
      callId,
      { status, endedAt: status === 'Ended' ? new Date() : undefined },
      { new: true }
    );
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    
    res.json(call);
  } catch (error) {
    console.error('Error updating call status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getCallDetails,
  getUserCalls,
  updateCallStatus
};