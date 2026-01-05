const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = (notificationController) => {
    const router = express.Router();

    router.get('/', authMiddleware, notificationController.getNotifications);
    router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);
    router.put('/:notificationId/read', authMiddleware, notificationController.markAsRead);
    router.put('/read-all', authMiddleware, notificationController.markAllAsRead);
    router.delete('/:notificationId', authMiddleware, notificationController.deleteNotification);
    router.delete('/', authMiddleware, notificationController.clearAll);

    return router;
};
