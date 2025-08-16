const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const convModel = new Schema({
    conv_name: {
        type: String,
        // required: true
    },
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    }],
    grp_avatar: {
        type: String,
        // default: 'avatar-3.jpg'
    },
    is_group: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    archive_by: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    like_by: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    muted_by: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    delete_by: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
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
// Add indexes
convModel.index({ participants: 1 });
convModel.index({ created_by: 1 });
convModel.index({ is_group: 1 });
convModel.index({ updated_date: -1 });

module.exports = mongoose.model('Conversation', convModel);
