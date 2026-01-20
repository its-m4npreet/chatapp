import React, { memo, useMemo, useCallback } from 'react';
import { FaCircleUser } from 'react-icons/fa6';
import { TiGroup } from 'react-icons/ti';

/**
 * Memoized Chat Item Component
 * Renders a single chat/user in the sidebar with minimal re-renders
 */
export const ChatItem = memo(
  ({
    user,
    isSelected,
    isOnline,
    unreadCount,
    lastMessage,
    lastSeen,
    onClick,
    settings,
  }) => {
    // Memoized message preview
    const messagePreview = useMemo(() => {
      if (!lastMessage) return 'No messages yet';

      let messageText = '';
      if (lastMessage.content) {
        messageText = lastMessage.content;
      } else if (lastMessage.messageType === 'image') {
        messageText = '📷 Image';
      } else if (lastMessage.messageType === 'audio') {
        messageText = '🎙️ Audio';
      } else if (lastMessage.messageType === 'mixed') {
        messageText = lastMessage.content || '📷 Image with message';
      }

      return messageText.length > 40 ? messageText.substring(0, 40) + '...' : messageText;
    }, [lastMessage]);

    const handleClick = useCallback(() => {
      onClick?.(user);
    }, [onClick, user]);

    return (
      <div
        className={`sidebar-chat${isSelected ? ' sidebar-chat-active' : ''}`}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        <div className="chat-avatar" style={{ position: 'relative' }}>
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="avatar-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="avatar-placeholder">
              <FaCircleUser size={24} />
            </div>
          )}
          {/* Online status indicator */}
          {isOnline && settings?.onlineStatus && (
            <span
              style={{
                position: 'absolute',
                bottom: '0px',
                right: '0px',
                width: '12px',
                height: '12px',
                background: '#22c55e',
                borderRadius: '50%',
                border: '2px solid #18181b',
              }}
              title="Online"
            />
          )}
        </div>
        <div className="chat-info">
          <div className="chat-name-row">
            <span className="chat-name">{user.name}</span>

            {unreadCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: '25px',
                  height: '25px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: '2px solid #18181b',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div className="chat-message-row">
            <span className="chat-message">{messagePreview}</span>

            <div className="chat-timestamp">
              <span className="last-seen text-sm text-gray-400">{lastSeen}</span>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if important props change
    return (
      prevProps.user._id === nextProps.user._id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isOnline === nextProps.isOnline &&
      prevProps.unreadCount === nextProps.unreadCount &&
      prevProps.lastMessage?._id === nextProps.lastMessage?._id &&
      prevProps.lastSeen === nextProps.lastSeen
    );
  }
);

ChatItem.displayName = 'ChatItem';

/**
 * Memoized Group Item Component
 * Renders a single group in the sidebar with minimal re-renders
 */
export const GroupItem = memo(
  ({
    group,
    isSelected,
    onClick,
  }) => {
    const handleClick = useCallback(() => {
      onClick?.(group);
    }, [onClick, group]);

    return (
      <div
        className={`sidebar-chat scroll-hide ${isSelected ? ' sidebar-chat-active' : ''}`}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        <div className="chat-avatar">
          {group.avatar ? (
            <img
              src={group.avatar}
              alt={group.name}
              className="avatar-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="avatar-placeholder bg-blue-600">
              <TiGroup size={24} />
            </div>
          )}
        </div>
        <div className="chat-info">
          <div className="chat-name-row">
            <span className="chat-name">{group.name}</span>
          </div>
          <div className="chat-message-row">
            <span className="chat-message text-gray-400">
              {group.members?.length || 0} members
            </span>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.group._id === nextProps.group._id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.group.members?.length === nextProps.group.members?.length
    );
  }
);

GroupItem.displayName = 'GroupItem';

/**
 * Memoized Chat List Container
 * Renders optimized list of chats
 */
export const ChatListContainer = memo(
  ({ children, className }) => (
    <div className={`sidebar-section md:mt-0 ${className || ''}`}>
      {children}
    </div>
  )
);

ChatListContainer.displayName = 'ChatListContainer';

/**
 * Lazy loading skeleton for chat items
 */
export const ChatSkeleton = memo(() => (
  <div className="sidebar-chat animate-pulse">
    <div className="chat-avatar">
      <div className="w-12 h-12 bg-gray-700 rounded-full" />
    </div>
    <div className="chat-info flex-1">
      <div className="w-24 h-4 bg-gray-700 rounded mb-2" />
      <div className="w-32 h-3 bg-gray-700 rounded" />
    </div>
  </div>
));

ChatSkeleton.displayName = 'ChatSkeleton';
