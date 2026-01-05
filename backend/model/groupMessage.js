const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        trim: true,
        default: '',
    },
    image: {
        url: { type: String, default: '' },
        public_id: { type: String, default: '' },
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'mixed'],
        default: 'text',
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        readAt: {
            type: Date,
            default: Date.now,
        }
    }],
}, { timestamps: true });

// Index for faster queries
groupMessageSchema.index({ group: 1, createdAt: -1 });

const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

module.exports = GroupMessage;
