const Notification = require('../model/notification');

const createNotificationController = (io) => {
    // Get all notifications for user
    const getNotifications = async (req, res) => {
        try {
            const userId = req.userId;
            const { page = 1, limit = 20 } = req.query;

            const notifications = await Notification.find({ recipient: userId })
                .populate('sender', 'name profilePicture')
                .populate('group', 'name avatar')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const unreadCount = await Notification.countDocuments({ 
                recipient: userId, 
                read: false 
            });

            res.status(200).json({ notifications, unreadCount });
        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Get unread notification count
    const getUnreadCount = async (req, res) => {
        try {
            const userId = req.userId;

            const unreadCount = await Notification.countDocuments({ 
                recipient: userId, 
                read: false 
            });

            res.status(200).json({ unreadCount });
        } catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Mark notification as read
    const markAsRead = async (req, res) => {
        try {
            const { notificationId } = req.params;
            const userId = req.userId;

            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, recipient: userId },
                { read: true },
                { new: true }
            );

            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }

            res.status(200).json({ notification });
        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async (req, res) => {
        try {
            const userId = req.userId;

            await Notification.updateMany(
                { recipient: userId, read: false },
                { read: true }
            );

            res.status(200).json({ message: 'All notifications marked as read' });
        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Delete notification
    const deleteNotification = async (req, res) => {
        try {
            const { notificationId } = req.params;
            const userId = req.userId;

            const notification = await Notification.findOneAndDelete({
                _id: notificationId,
                recipient: userId,
            });

            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }

            res.status(200).json({ message: 'Notification deleted' });
        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    // Clear all notifications
    const clearAll = async (req, res) => {
        try {
            const userId = req.userId;

            await Notification.deleteMany({ recipient: userId });

            res.status(200).json({ message: 'All notifications cleared' });
        } catch (error) {
            console.error('Clear all error:', error);
            res.status(500).json({ message: error.message || 'Server error' });
        }
    };

    return {
        getNotifications,
        getUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
    };
};

module.exports = createNotificationController;
