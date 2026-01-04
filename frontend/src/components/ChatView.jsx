
import React, { useState, useRef, useEffect } from 'react';
import { IoMdSend } from 'react-icons/io';
import { FaRegSmile } from 'react-icons/fa';
import { IoImageOutline, IoClose } from 'react-icons/io5';
import EmojiPicker from 'emoji-picker-react';

const ChatView = ({ user, socket, currentUser }) => {
      // Join current user's room for real-time updates
      useEffect(() => {
        if (socket && currentUser && currentUser._id) {
          socket.emit('join', currentUser._id);
        }
      }, [socket, currentUser]);
    // Refs to always have latest user/currentUser in socket listener
    const userRef = useRef(user);
    const currentUserRef = useRef(currentUser);

    useEffect(() => {
      userRef.current = user;
      currentUserRef.current = currentUser;
    }, [user, currentUser]);
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      console.log('Received newMessage:', msg);
      // Use refs to always get latest user/currentUser
      const u = userRef.current;
      const cu = currentUserRef.current;
      // Extract sender/receiver IDs (handle both object and string)
      const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      const receiverId = typeof msg.receiver === 'object' ? msg.receiver._id : msg.receiver;
      setMessages((prev) => {
        if (
          u && cu &&
          ((senderId === u._id && receiverId === cu._id) ||
           (senderId === cu._id && receiverId === u._id))
        ) {
          // Avoid duplicates by checking if message already exists
          const exists = prev.some(m => m._id && msg._id && m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        }
        return prev;
      });
    };
    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
    // Only set up once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Fetch previous messages when user changes
  useEffect(() => {
    if (!user || !currentUser) {
      setMessages([]);
      return;
    }
    setMessages([]);
    // Fetch previous messages from backend
    import('../lib/axios').then(({ default: axios }) => {
      axios.get(`/messages/${user._id}`)
        .then(res => {
          if (res.data && res.data.data) {
            setMessages(res.data.data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch messages:', err);
        });
    });
  }, [user, currentUser]);

  // Close emoji picker only when clicking outside, not on search or emoji picker itself
  useEffect(() => {
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

  // Compress image before upload
  const compressImage = (file, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle image selection
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      setSelectedImage(file);
      
      // Compress image for preview and upload
      const compressedImage = await compressImage(file);
      setImagePreview(compressedImage);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedImage) {
      console.log('No message content or image');
      return;
    }
    if (!user) {
      console.log('No selected user');
      return;
    }
    if (!currentUser) {
      console.log('No current user');
      return;
    }

    let imageUrl = null;

    // Upload image if selected
    if (imagePreview) {
      setIsUploading(true);
      try {
        const { default: axios } = await import('../lib/axios');
        const response = await axios.post('/messages/upload', {
          image: imagePreview
        });
        imageUrl = response.data.url;
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const msg = {
      content: inputValue,
      image: imageUrl,
      receiver: user._id,
      sender: currentUser._id,
      createdAt: new Date().toISOString(),
    };
    console.log('Sending message:', msg);
    socket.emit('sendMessage', msg);
    // Do NOT update messages here; rely on socket event for real-time update
    setInputValue('');
    handleRemoveImage();
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full ">
        {/* Animated chat illustration */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg 
              className="w-16 h-16 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </div>
          {/* Floating bubbles animation */}
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute top-1/2 -right-4 w-3 h-3 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Welcome text */}
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to ChatApp</h2>
        <p className="text-gray-400 text-center max-w-sm mb-6 px-4">
          Select a conversation from the sidebar to start chatting with your friends
        </p>

        {/* Features list */}
        {/* <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400">🔒</span>
            </div>
            <span>End-to-end encrypted messages</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400">⚡</span>
            </div>
            <span>Real-time message delivery</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-400">😊</span>
            </div>
            <span>Express yourself with emojis</span>
          </div>
        </div> */}

        {/* Keyboard shortcut hint */}
        {/* <div className="mt-8 text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-800 rounded text-gray-400 mr-1">Ctrl</span>
          +
          <span className="px-2 py-1 bg-gray-800 rounded text-gray-400 mx-1">K</span>
          to search users
        </div> */}
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
      <div className="flex-1 p-6 overflow-y-auto text-white scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-4">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => {
            const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
            const isCurrentUser = currentUser && senderId === currentUser._id;
            const imageUrl = msg.image?.url || msg.image;
            return (
              <div key={msg._id || idx} className={`my-2 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs `}>
                  {imageUrl && (
                    <img 
                      src={imageUrl} 
                      alt="Shared" 
                      className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90"
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                  )}
                  {msg.content && <span>{msg.content}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Image Preview Section */}
      {imagePreview && (
        <div className="px-4 py-2 ">
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-32 rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors cursor-pointer"
            >
              <IoClose size={16} />
            </button>
          </div>
        </div>
      )}
      <form className="p-4 border-t border-gray-700 flex items-center gap-2 relative" onSubmit={handleSend}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />
        {/* Image upload button */}
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-white transition-colors"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image"
        >
          <IoImageOutline size={22} />
        </button>
        <button
          type="button"
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
            <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" searchDisabled={false} />
          </div>
        )}
        <input
          ref={inputRef}
          className="flex-1 p-2 rounded border border-gray-700 text-white outline-none bg-transparent"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="p-2 text-gray-400 hover:text-white disabled:opacity-50" disabled={isUploading}>
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <IoMdSend size={22} />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatView;
