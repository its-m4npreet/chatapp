const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = (groupController) => {
    const router = express.Router();

    // Group CRUD
    router.post('/create', authMiddleware, groupController.createGroup);
    router.get('/my-groups', authMiddleware, groupController.getMyGroups);
    router.get('/:groupId', authMiddleware, groupController.getGroupById);
    router.put('/:groupId', authMiddleware, groupController.updateGroup);
    router.delete('/:groupId', authMiddleware, groupController.deleteGroup);

    // Group invitations
    router.post('/invite', authMiddleware, groupController.inviteToGroup);
    router.post('/accept-invite', authMiddleware, groupController.acceptGroupInvite);
    router.post('/decline-invite', authMiddleware, groupController.declineGroupInvite);

    // Group membership
    router.post('/:groupId/leave', authMiddleware, groupController.leaveGroup);
    router.post('/:groupId/remove-member', authMiddleware, groupController.removeMember);
    router.post('/:groupId/toggle-admin', authMiddleware, groupController.toggleAdmin);

    // Group messages
    router.get('/:groupId/messages', authMiddleware, groupController.getGroupMessages);
    router.post('/message', authMiddleware, groupController.sendGroupMessage);

    return router;
};
