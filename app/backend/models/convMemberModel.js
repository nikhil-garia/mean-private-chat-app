const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const convgropModel = new Schema({
    conversation_id: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    is_leave: {
        type: Boolean,
        default: false
    },
    leave_date:{
        type:Boolean,
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    updated_date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Conversation_member', convgropModel);
