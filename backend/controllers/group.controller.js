const Group = require('../model/group');
const GroupMessage = require('../model/groupMessage');
const Notification = require('../model/notification');
const User = require('../model/user');

const createGroupController = (io) => {
    // Create a new group
    const createGroup = async (req, res) => {
        try {
            const { name, description, avatar } = req.body;
            const userId = req.userId;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Group name is required' });
            }

            const group = new Group({
                name: name.trim(),
                description: description?.trim() || '',
                avatar: avatar || '',
                creator: userId,
            });

            await group.save();
            await group.populate('creator', 'name profilePicture');
            await group.populate('members', 'name profilePicture');

            res.status(201).json({ message: 'Group created successfully', group });
        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Get all groups for the current user
    const getMyGroups = async (req, res) => {
        try {
            const userId = req.userId;

            const groups = await Group.find({ members: userId })
                .populate('creator', 'name profilePicture')
                .populate('members', 'name profilePicture')
                .populate('admins', 'name profilePicture')
                .sort({ updatedAt: -1 });

            res.status(200).json({ groups });
        } catch (error) {
            console.error('Get groups error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Get single group details
    const getGroupById = async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.userId;

            const group = await Group.findById(groupId)
                .populate('creator', 'name profilePicture')
                .populate('members', 'name profilePicture email')
                .populate('admins', 'name profilePicture')
                .populate('pendingInvites.user', 'name profilePicture')
                .populate('pendingInvites.invitedBy', 'name profilePicture');

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Check if user is a member
            if (!group.members.some(m => m._id.toString() === userId)) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }

            res.status(200).json({ group });
        } catch (error) {
            console.error('Get group error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Invite user to group
    const inviteToGroup = async (req, res) => {
        try {
            const { groupId, userIds } = req.body;
            const inviterId = req.userId;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Check if inviter is a member/admin
            if (!group.members.some(m => m.toString() === inviterId)) {
                return res.status(403).json({ message: 'You must be a member to invite others' });
            }

            const inviter = await User.findById(inviterId).select('name profilePicture');
            const invitedUsers = [];

            for (const userId of userIds) {
                // Check if already a member
                if (group.members.some(m => m.toString() === userId)) {
                    continue;
                }

                // Check if already invited
                if (group.pendingInvites.some(i => i.user.toString() === userId)) {
                    continue;
                }

                // Add to pending invites
                group.pendingInvites.push({
                    user: userId,
                    invitedBy: inviterId,
                });

                // Create notification
                const notification = new Notification({
                    recipient: userId,
                    sender: inviterId,
                    type: 'group_invite',
                    group: groupId,
                    message: `${inviter.name} invited you to join "${group.name}"`,
                });
                await notification.save();
                await notification.populate('sender', 'name profilePicture');
                await notification.populate('group', 'name avatar');

                // Emit real-time notification
                io.to(userId).emit('newNotification', notification);

                invitedUsers.push(userId);
            }

            await group.save();

            res.status(200).json({ 
                message: `Invited ${invitedUsers.length} user(s) to the group`,
                invitedUsers 
            });
        } catch (error) {
            console.error('Invite to group error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Accept group invite
    const acceptGroupInvite = async (req, res) => {
        try {
            const { groupId, notificationId } = req.body;
            const userId = req.userId;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Find and remove from pending invites
            const inviteIndex = group.pendingInvites.findIndex(
                i => i.user.toString() === userId
            );

            if (inviteIndex === -1) {
                return res.status(400).json({ message: 'No pending invite found' });
            }

            group.pendingInvites.splice(inviteIndex, 1);
            group.members.push(userId);
            await group.save();

            // Update notification status
            if (notificationId) {
                await Notification.findByIdAndUpdate(notificationId, { 
                    status: 'accepted',
                    read: true 
                });
            }

            await group.populate('members', 'name profilePicture');
            await group.populate('creator', 'name profilePicture');

            // Notify group members about new member
            const user = await User.findById(userId).select('name profilePicture');
            group.members.forEach(member => {
                if (member._id.toString() !== userId) {
                    io.to(member._id.toString()).emit('groupMemberJoined', {
                        group: { _id: group._id, name: group.name },
                        user: { _id: userId, name: user.name, profilePicture: user.profilePicture }
                    });
                }
            });

            res.status(200).json({ message: 'Joined group successfully', group });
        } catch (error) {
            console.error('Accept invite error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Decline group invite
    const declineGroupInvite = async (req, res) => {
        try {
            const { groupId, notificationId } = req.body;
            const userId = req.userId;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Remove from pending invites
            const inviteIndex = group.pendingInvites.findIndex(
                i => i.user.toString() === userId
            );

            if (inviteIndex !== -1) {
                group.pendingInvites.splice(inviteIndex, 1);
                await group.save();
            }

            // Update notification status
            if (notificationId) {
                await Notification.findByIdAndUpdate(notificationId, { 
                    status: 'declined',
                    read: true 
                });
            }

            res.status(200).json({ message: 'Invite declined' });
        } catch (error) {
            console.error('Decline invite error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Leave group
    const leaveGroup = async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.userId;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Creator cannot leave, must delete
            if (group.creator.toString() === userId) {
                return res.status(400).json({ message: 'Creator cannot leave. Delete the group instead.' });
            }

            // Remove from members and admins
            group.members = group.members.filter(m => m.toString() !== userId);
            group.admins = group.admins.filter(a => a.toString() !== userId);
            await group.save();

            res.status(200).json({ message: 'Left group successfully' });
        } catch (error) {
            console.error('Leave group error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Delete group (creator only)
    const deleteGroup = async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.userId;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (group.creator.toString() !== userId) {
                return res.status(403).json({ message: 'Only the creator can delete this group' });
            }

            // Delete all group messages
            await GroupMessage.deleteMany({ group: groupId });

            // Delete related notifications
            await Notification.deleteMany({ group: groupId });

            // Delete the group
            await Group.findByIdAndDelete(groupId);

            // Notify all members
            group.members.forEach(member => {
                io.to(member.toString()).emit('groupDeleted', { groupId });
            });

            res.status(200).json({ message: 'Group deleted successfully' });
        } catch (error) {
            console.error('Delete group error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Get group messages
    const getGroupMessages = async (req, res) => {
        try {
            const { groupId } = req.params;
            const userId = req.userId;
            const { page = 1, limit = 50 } = req.query;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (!group.members.some(m => m.toString() === userId)) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }

            const messages = await GroupMessage.find({ group: groupId })
                .populate('sender', 'name profilePicture')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            res.status(200).json({ messages: messages.reverse() });
        } catch (error) {
            console.error('Get group messages error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Send group message
    const sendGroupMessage = async (req, res) => {
        try {
            const { groupId, content, image } = req.body;
            const userId = req.userId;

            const group = await Group.findById(groupId);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            if (!group.members.some(m => m.toString() === userId)) {
                return res.status(403).json({ message: 'You are not a member of this group' });
            }

            let messageType = 'text';
            if (content?.trim() && image) messageType = 'mixed';
            else if (image) messageType = 'image';

            const message = new GroupMessage({
                group: groupId,
                sender: userId,
                content: content?.trim() || '',
                image: image ? { url: image, public_id: '' } : { url: '', public_id: '' },
                messageType,
            });

            await message.save();
            await message.populate('sender', 'name profilePicture');

            // Emit to all group members
            group.members.forEach(member => {
                io.to(member.toString()).emit('newGroupMessage', {
                    groupId,
                    message,
                });
            });

            res.status(201).json({ message });
        } catch (error) {
            console.error('Send group message error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    return {
        createGroup,
        getMyGroups,
        getGroupById,
        inviteToGroup,
        acceptGroupInvite,
        declineGroupInvite,
        leaveGroup,
        deleteGroup,
        getGroupMessages,
        sendGroupMessage,
    };
};

module.exports = createGroupController;
