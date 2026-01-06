import React, { useState, useEffect } from 'react';
import { IoClose, IoCheckmark, IoTrash } from 'react-icons/io5';
import { TiGroup } from 'react-icons/ti';
import { FaCircleUser } from 'react-icons/fa6';
import axios from '../lib/axios';
import { ContentLoading } from './Loading';

const NotificationPopup = ({ isOpen, onClose, socket, onNotificationAction }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/notifications');
      setNotifications(res.data.notifications || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Listen for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on('newNotification', handleNewNotification);
    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket]);

  const handleAcceptGroupInvite = async (notification) => {
    setActionLoading((prev) => ({ ...prev, [notification._id]: true }));
    try {
      await axios.post('/groups/accept-invite', {
        groupId: notification.group._id,
        notificationId: notification._id,
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, status: 'accepted', read: true } : n
        )
      );
      if (onNotificationAction) onNotificationAction('accepted', notification);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept invite');
    }
    setActionLoading((prev) => ({ ...prev, [notification._id]: false }));
  };

  const handleDeclineGroupInvite = async (notification) => {
    setActionLoading((prev) => ({ ...prev, [notification._id]: true }));
    try {
      await axios.post('/groups/decline-invite', {
        groupId: notification.group._id,
        notificationId: notification._id,
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, status: 'declined', read: true } : n
        )
      );
      if (onNotificationAction) onNotificationAction('declined', notification);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to decline invite');
    }
    setActionLoading((prev) => ({ ...prev, [notification._id]: false }));
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await axios.delete('/notifications');
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Popup */}
      <div className="relative w-96 max-h-[calc(100vh-100px)] bg-[#131315] rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold text-lg">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-400 hover:text-red-300 ml-2"
                >
                  Clear all
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition ml-2"
            >
              <IoClose size={20} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <ContentLoading text="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-zinc-700/50 transition ${
                    !notification.read ? 'bg-zinc-700/30' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon/Avatar */}
                    <div className="shrink-0">
                      {notification.type === 'group_invite' ? (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <TiGroup size={20} className="text-white" />
                        </div>
                      ) : notification.sender?.profilePicture ? (
                        <img
                          src={notification.sender.profilePicture}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                          <FaCircleUser size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatTime(notification.createdAt)}
                      </p>

                      {/* Action buttons for group invites */}
                      {notification.type === 'group_invite' && notification.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptGroupInvite(notification)}
                            disabled={actionLoading[notification._id]}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg transition"
                          >
                            <IoCheckmark size={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineGroupInvite(notification)}
                            disabled={actionLoading[notification._id]}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded-lg transition"
                          >
                            <IoClose size={16} />
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Status badge for processed invites */}
                      {notification.type === 'group_invite' && notification.status !== 'pending' && (
                        <span
                          className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${
                            notification.status === 'accepted'
                              ? 'bg-green-600/30 text-green-400'
                              : 'bg-red-600/30 text-red-400'
                          }`}
                        >
                          {notification.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="flex-shrink-0 p-1 hover:bg-zinc-600 rounded text-gray-500 hover:text-red-400 transition"
                    >
                      <IoTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
