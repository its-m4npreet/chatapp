import React, { memo, useCallback, useMemo } from 'react';
import { IoCheckmark, IoCheckmarkDone } from 'react-icons/io5';
import { IoClose, IoAddCircleOutline } from 'react-icons/io5';
import { shouldShowSenderInfo, getUserId } from '../lib/performance';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/**
 * Memoized Message Bubble Component
 * Renders a single message with minimal re-renders
 */
export const MessageBubble = memo(
  ({
    message,
    previousMessage,
    currentUser,
    isGroupChat,
    onReact,
    onShowReactions,
    onDoubleTap,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    showReactions,
    showLongPressReactions,
    isMobile,
  }) => {
    const senderId = getUserId(message.sender);
    const currentUserId = getUserId(currentUser);
    const isOwnMessage = senderId === currentUserId;
    const showSender = shouldShowSenderInfo(message, previousMessage);

    // Memoized sender info
    const senderInfo = useMemo(() => {
      if (!isGroupChat || isOwnMessage || !showSender) return null;
      const senderName = typeof message.sender === 'object' ? message.sender.name : 'User';
      return senderName;
    }, [isGroupChat, isOwnMessage, showSender, message.sender]);

    // Memoized parsed content
    const parsedContent = useMemo(() => {
      if (!message.content) return null;
      try {
        const html = marked(message.content, { breaks: true });
        return DOMPurify.sanitize(html);
      } catch {
        return message.content;
      }
    }, [message.content]);

    // Memoized reactions display
    const reactionsDisplay = useMemo(() => {
      if (!message.reactions || Object.keys(message.reactions).length === 0) return null;

      return Object.entries(message.reactions).map(([reaction, users]) => (
        <span
          key={reaction}
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-full text-xs cursor-pointer hover:bg-gray-600"
          title={Array.isArray(users) ? users.join(', ') : ''}
          onClick={() => onReact?.(message._id, reaction)}
        >
          {reaction}
          {Array.isArray(users) && users.length > 1 && (
            <span className="text-gray-400">{users.length}</span>
          )}
        </span>
      ));
    }, [message.reactions, onReact, message._id]);

    const handleReact = useCallback(
      (reaction) => {
        onReact?.(message._id, reaction);
      },
      [onReact, message._id]
    );

    return (
      <div
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
        onDoubleClick={() => onDoubleTap?.(message._id)}
        onTouchStart={(e) => onTouchStart?.(e, message._id)}
        onTouchMove={onTouchMove}
        onTouchEnd={(e) => onTouchEnd?.(e, message._id)}
      >
        <div className={`max-w-xs md:max-w-md lg:max-w-lg flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {/* Sender name (group chats only) */}
          {senderInfo && <p className="text-xs text-gray-400 mb-1 px-3">{senderInfo}</p>}

          {/* Message bubble */}
          <div
            className={`px-4 py-2 rounded-lg relative ${
              isOwnMessage
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-gray-700 text-white rounded-bl-none'
            }`}
            onContextMenu={(e) => {
              e.preventDefault();
              onShowReactions?.(message._id);
            }}
          >
            {/* Reply preview */}
            {message.replyTo && (
              <div className="mb-2 pb-2 border-b border-gray-600 text-xs text-gray-300">
                <p className="font-semibold">
                  {message.replyTo.sender?.name || 'User'}:
                </p>
                <p className="truncate">
                  {message.replyTo.content || (
                    message.replyTo.messageType === 'image' ? '📷 Image' : '🎙️ Audio'
                  )}
                </p>
              </div>
            )}

            {/* Content */}
            {message.messageType === 'image' && message.image && (
              <img
                src={message.image.url || message.image}
                alt="Message"
                className="max-w-xs rounded-md mb-2"
                loading="lazy"
              />
            )}

            {message.messageType === 'audio' && message.audio && (
              <audio src={message.audio.url || message.audio} controls className="mb-2" />
            )}

            {parsedContent && (
              <div
                className="text-sm flex-wrap whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: parsedContent }}
              />
            )}

            {/* Status indicators */}
            {isOwnMessage && (
              <div className="flex items-center justify-end gap-1 mt-1 text-xs text-gray-200">
                {message.status === 'sending' && <span>...</span>}
                {message.status === 'sent' && <IoCheckmark size={14} />}
                {message.status === 'delivered' && <IoCheckmarkDone size={14} />}
                {message.status === 'read' && <IoCheckmarkDone size={14} className="text-blue-300" />}
              </div>
            )}

            {/* Reactions popup (long-press menu) */}
            {showLongPressReactions?.messageId === message._id && isMobile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => onShowReactions?.(null)}
                />
                <div
                  className="fixed z-50 bg-gray-800 rounded-lg p-2 shadow-lg flex gap-1"
                  style={{
                    left: `${showLongPressReactions.x}px`,
                    top: `${showLongPressReactions.y}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  {REACTIONS.map((reaction) => (
                    <button
                      key={reaction}
                      type="button"
                      onClick={() => handleReact(reaction)}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                      title={reaction}
                    >
                      {reaction}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Reactions display */}
          {reactionsDisplay && (
            <div className="flex flex-wrap gap-1 mt-1 px-3">
              {reactionsDisplay}
            </div>
          )}

          {/* Quick reaction buttons (desktop) */}
          {showReactions === message._id && !isMobile && (
            <div className="flex gap-1 mt-1 px-3 bg-gray-800 rounded-lg p-2">
              {REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  type="button"
                  onClick={() => handleReact(reaction)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-lg cursor-pointer"
                  title={reaction}
                >
                  {reaction}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onShowReactions?.(message._id)}
                className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                title="More reactions"
              >
                <IoAddCircleOutline size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if these specific props change
    return (
      prevProps.message._id === nextProps.message._id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.reactions === nextProps.message.reactions &&
      prevProps.showReactions === nextProps.showReactions &&
      prevProps.showLongPressReactions === nextProps.showLongPressReactions &&
      prevProps.currentUser._id === nextProps.currentUser._id
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

/**
 * Memoized Input Box Component
 * Prevents re-render on every keystroke
 */
export const InputBox = memo(
  ({
    value,
    onChange,
    onKeyDown,
    onFocus,
    onBlur,
    disabled,
    placeholder,
    forwardedRef,
  }) => (
    <input
      ref={forwardedRef}
      className="flex-1 min-w-0 p-2 rounded border border-gray-700 text-white outline-none bg-transparent"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
    />
  )
);

InputBox.displayName = 'InputBox';

/**
 * Memoized Message List Container
 * Use with virtualization (react-window) for large lists
 */
export const MessageListContainer = memo(
  ({ children, onScroll, containerRef, className }) => (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto p-4 ${className || ''}`}
    >
      {children}
    </div>
  )
);

MessageListContainer.displayName = 'MessageListContainer';

/**
 * Avatar Component with lazy loading
 */
export const Avatar = memo(
  ({ src, alt, size = 32, fallback, className }) => {
    const classes = `inline-block rounded-full object-cover`;
    const sizeClass = `w-${size} h-${size}`;

    return src ? (
      <img
        src={src}
        alt={alt}
        className={`${classes} ${sizeClass} ${className || ''}`}
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div
        className={`${sizeClass} bg-gray-600 rounded-full flex items-center justify-center ${className || ''}`}
      >
        {fallback}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
