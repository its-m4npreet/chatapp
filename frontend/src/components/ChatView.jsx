import React, { useState, useRef } from 'react';
import { IoMdSend } from 'react-icons/io';
import { FaRegSmile } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';

const ChatView = ({ user }) => {
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [inputValue, setInputValue] = useState('');

  // Close emoji picker only when clicking outside, not on search or emoji picker itself
  React.useEffect(() => {
    if (!showEmoji) return;
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        event.target.getAttribute('data-emoji-button') !== 'true'
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  const handleEmojiClick = (emojiData) => {
    setInputValue((prev) => prev + emojiData.emoji);
    if (inputRef.current) inputRef.current.focus();
    // Do not close the picker on emoji select
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-gray-400">
        <span>Select a chat to start messaging</span>
      </div>
    );
  }
  return (
    <div className="chat-view h-full w-full flex flex-col relative">
      <div className="chat-header p-4 border-b border-gray-700 flex items-center gap-4 ">
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
          {user.name[0]}
        </div>
        <div>
          <div className="font-semibold text-white">{user.name}</div>
          <div className="text-xs text-gray-400">{user.bio || 'No bio available.'}</div>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-y-auto text-white">
        <div className="text-center text-gray-500 my-4">No messages yet.</div>
      </div>
      <div className="p-4 border-t border-gray-700 flex items-center gap-2 relative">
        <button
          className="p-2 text-gray-400 hover:text-white relative"
          onClick={() => setShowEmoji((v) => !v)}
          data-emoji-button="true"
        >
          <FaRegSmile size={22} />
        </button>
        {showEmoji && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-12 left-0 z-50 "
            style={{ minWidth: 320 }}
          >
            <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" searchDisabled={false}  />
          </div>
        )}
        <input
          ref={inputRef}
          className="flex-1 p-2 rounded border border-gray-700 text-white outline-none bg-transparent"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button className="p-2 text-gray-400 hover:text-white">
          <IoMdSend size={22} />
        </button>
      </div>
    </div>
  );
};

export default ChatView;
