const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 200,
    },
    avatar: {
        type: String,
        default: '',
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    pendingInvites: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        invitedAt: {
            type: Date,
            default: Date.now,
        }
    }],
}, { timestamps: true });

// Creator is automatically an admin and member
groupSchema.pre('save', function() {
    if (this.isNew) {
        if (!this.admins.includes(this.creator)) {
            this.admins.push(this.creator);
        }
        if (!this.members.includes(this.creator)) {
            this.members.push(this.creator);
        }
    }
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
