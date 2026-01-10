import React, { useState, useRef, useEffect } from "react";
import { IoMdSend } from "react-icons/io";
import { FaRegSmile } from "react-icons/fa";
import { IoImageOutline, IoClose, IoAddCircleOutline } from "react-icons/io5";
import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";
import { ButtonLoading } from "./Loading";
import { ContentLoading } from "./Loading";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const getId = (u) => (typeof u === "object" ? u?._id : u);

const ChatView = ({
  user,
  socket,
  currentUser,
  onViewProfile,
  isUserOnline,
  isUserTyping,
}) => {
  // Join current user's room for real-time updates
  useEffect(() => {
    if (socket && currentUser && currentUser._id) {
      socket.emit("join", currentUser._id);
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
  const [showReactionPicker, setShowReactionPicker] = useState(null); // Track which message's reaction picker is open
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      const u = userRef.current;
      const cu = currentUserRef.current;
      const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
      const receiverId = typeof msg.receiver === "object" ? msg.receiver._id : msg.receiver;
      setMessages((prev) => {
        if (
          u &&
          cu &&
          ((senderId === u._id && receiverId === cu._id) || (senderId === cu._id && receiverId === u._id))
        ) {
          // Try to reconcile optimistic message
          const optimisticIdx = prev.findIndex((m) =>
            m.tempId && m.tempId === msg.tempId && getId(m.sender) === senderId && getId(m.receiver) === receiverId
          );
          if (optimisticIdx !== -1) {
            const updated = [...prev];
            updated[optimisticIdx] = { ...msg, tempId: undefined };
            return updated;
          }

          // Fallback: reconcile by matching sender/receiver/content when tempId missing
          const fuzzyIdx = prev.findIndex((m) => {
            const prevImage = m.image ? m.image.url || m.image : '';
            const incomingImage = msg.image ? msg.image.url || msg.image : '';
            return (
              m.tempId &&
              getId(m.sender) === senderId &&
              getId(m.receiver) === receiverId &&
              (m.content || '') === (msg.content || '') &&
              prevImage === incomingImage
            );
          });
          if (fuzzyIdx !== -1) {
            const updated = [...prev];
            updated[fuzzyIdx] = { ...msg, tempId: undefined };
            return updated;
          }

          const exists = prev.some((m) => (m._id && msg._id && m._id === msg._id));
          if (exists) return prev;
          return [...prev, msg];
        }
        return prev;
      });
      
      // Mark message as read if it's from the other user
      if (cu && senderId === u._id && receiverId === cu._id) {
        socket.emit('markMessageRead', { messageId: msg._id, userId: cu._id });
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket]);

  // Listen for reaction updates
  useEffect(() => {
    if (!socket) return;
    const handleReactionUpdate = (payload) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === payload.messageId ? { ...m, reactions: payload.reactions } : m))
      );
    };
    socket.on("messageReactionUpdated", handleReactionUpdate);
    return () => socket.off("messageReactionUpdated", handleReactionUpdate);
  }, [socket]);

  // Listen for message status updates
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status } : m))
      );
    };
    const handleMessagesMarkedRead = ({ receiverId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.receiver === receiverId || (typeof m.receiver === 'object' && m.receiver._id === receiverId)) {
            return { ...m, status: 'read' };
          }
          return m;
        })
      );
    };
    socket.on("messageStatusUpdate", handleStatusUpdate);
    socket.on("messagesMarkedRead", handleMessagesMarkedRead);
    return () => {
      socket.off("messageStatusUpdate", handleStatusUpdate);
      socket.off("messagesMarkedRead", handleMessagesMarkedRead);
    };
  }, [socket]);

  // Fetch previous messages when user changes
  useEffect(() => {
    if (!user || !currentUser) {
      setMessages([]);
      return;
    }
    setMessages([]);
    setIsLoadingMessages(true);
    import("../lib/axios").then(({ default: axios }) => {
      axios
        .get(`/messages/${user._id}`)
        .then((res) => {
          if (res.data && res.data.data) {
            setMessages(res.data.data);
            setIsLoadingMessages(false);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch messages:", err);
          setIsLoadingMessages(false);
        });
    });
  }, [user, currentUser]);
  
  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmoji) return;
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        event.target.getAttribute("data-emoji-button") !== "true"
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClickOutside = (event) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target) &&
        !event.target.closest('[data-reaction-button]')
      ) {
        setShowReactionPicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReactionPicker]);

  const handleEmojiClick = (emojiData) => {
    setInputValue((prev) => prev + emojiData.emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  // Handle reaction emoji selection
  const handleReactionEmojiClick = async (emojiData, messageId) => {
    const emoji = emojiData.emoji;
    const msg = messages.find(m => m._id === messageId);
    if (!msg) return;

    const existing = msg.reactions?.find((r) => getId(r.user) === currentUser?._id);
    const next = existing?.reaction === emoji ? null : emoji;
    
    const { default: axios } = await import("../lib/axios");
    try {
      const res = await axios.post(`/messages/${messageId}/react`, { reaction: next });
      if (res.data?.data) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? res.data.data : m)));
      }
    } catch (e) {
      console.error("React failed", e);
    }
    
    setShowReactionPicker(null);
  };

  // Compress image before upload
  const compressImage = (file, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
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
        alert("Image size should be less than 10MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
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
      fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() && !selectedImage) {
      console.log("No message content or image");
      return;
    }
    if (!user) {
      console.log("No selected user");
      return;
    }
    if (!currentUser) {
      console.log("No current user");
      return;
    }

    let imageUrl = null;

    // Upload image if selected
    if (imagePreview) {
      setIsUploading(true);
      try {
        const { default: axios } = await import("../lib/axios");
        const response = await axios.post("/messages/upload", {
          image: imagePreview,
        });
        imageUrl = response.data.url;
      } catch (error) {
        console.error("Failed to upload image:", error);
        alert("Failed to upload image. Please try again.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const msg = {
      content: inputValue,
      image: imageUrl,
      receiver: user._id,
      sender: currentUser._id,
      createdAt: new Date().toISOString(),
      tempId,
    };

    // Optimistically add message to UI
    const optimisticMessage = {
      ...msg,
      status: 'sending',
      sender: currentUser,
      receiver: user,
      image: imageUrl ? { url: imageUrl } : null,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    console.log("Sending message:", msg);
    socket.emit("sendMessage", msg);
    
    // Stop typing indicator when message is sent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("stopTyping", {
      senderId: currentUser._id,
      receiverId: user._id,
    });
    
    setInputValue("");
    handleRemoveImage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = async (msg, symbol) => {
    const existing = msg.reactions?.find((r) => getId(r.user) === currentUser?._id);
    const next = existing?.reaction === symbol ? null : symbol;
    const { default: axios } = await import("../lib/axios");
    try {
      const res = await axios.post(`/messages/${msg._id}/react`, { reaction: next });
      if (res.data?.data) {
        setMessages((prev) => prev.map((m) => (m._id === msg._id ? res.data.data : m)));
      }
    } catch (e) {
      console.error("React failed", e);
    }
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
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: "0s" }}
          ></div>
          <div
            className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-purple-400 animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="absolute top-1/2 -right-4 w-3 h-3 rounded-full bg-pink-400 animate-bounce"
            style={{ animationDelay: "0.4s" }}
          ></div>
        </div>

        {/* Welcome text */}
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to ChatApp
        </h2>
        <p className="text-gray-400 text-center max-w-sm mb-6 px-4">
          Select a conversation from the sidebar to start chatting with your
          friends
        </p>
      </div>
    );
  }

  return (
    <div className="chat-view h-full w-full flex flex-col relative">
      <div className="chat-header p-4 border-b border-gray-700 flex items-center gap-4 ">
        <div
          className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onViewProfile && onViewProfile(user)}
        >
          <div className="relative w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
            />
            {isUserOnline && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
                title="Online"
              />
            )}
          </div>
          <div>
            <div className="font-semibold text-white">{user.name}</div>
            <div className="text-xs text-gray-400">
              {isUserTyping ? (
                <span className="text-green-400 flex items-end gap-1">
                  typing
                  <span className="flex gap-0.5">
                    <span
                      className="w-1 h-1 bg-green-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-green-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-1 h-1 bg-green-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </span>
                </span>
              ) : isUserOnline ? (
                <span className="text-green-400">Online</span>
              ) : (
                user.bio || "Offline"
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div
        className="flex-1 p-6 overflow-y-auto text-white scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {isLoadingMessages ? (
          <ContentLoading />
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 my-4">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => {
            const senderId =
              typeof msg.sender === "object" ? msg.sender._id : msg.sender;
            const isCurrentUser = currentUser && senderId === currentUser._id;
            const imageUrl = msg.image?.url || msg.image;
            const isImageOnly = imageUrl && !msg.content;
            const bubbleClass = `max-w-xs shadow-md ${
              isImageOnly
                ? "p-0 bg-transparent rounded-2xl " +
                  (isCurrentUser ? "rounded-br-md" : "rounded-bl-md")
                : "p-3 rounded-2xl " +
                  (isCurrentUser
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-gray-800 text-white rounded-bl-md")
            }`;
            
            // Get unique reactions with counts
            const reactionCounts = {};
            if (Array.isArray(msg.reactions)) {
              msg.reactions.forEach(r => {
                if (r.reaction) {
                  reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
                }
              });
            }
            
            return (
              <div
                key={msg._id || idx}
                className={`reletive my-3 flex flex-col group ${
                  isCurrentUser ? "items-end" : "items-start"
                }`}
              >
                <div className="relative">
                  <div className={bubbleClass}>
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="Shared"
                        className={`${
                          isImageOnly ? "rounded-2xl" : "rounded-lg mb-2"
                        } max-w-full cursor-pointer hover:opacity-90`}
                        onClick={() => window.open(imageUrl, "_blank")}
                      />
                    )}
                    {msg.content && <span>{msg.content}</span>}
                  </div>
                  
                  {/* Quick Reactions Bar - Shows on hover */}
                  <div className={`absolute ${isCurrentUser ? 'right-0' : 'left-0'} -bottom-8 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 bg-gray-800/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border border-gray-700`}
                    style={{
                      transform: 'translateX(0)',
                      animation: 'slideInFromRight 0.3s ease-out'
                    }}
                  >
                    <style>{`
                      @keyframes slideInFromRight {
                        from {
                          transform: translateX(20px);
                          opacity: 0;
                        }
                        to {
                          transform: translateX(0);
                          opacity: 1;
                        }
                      }
                      @keyframes popIn {
                        0% {
                          transform: scale(0) translateX(10px);
                          opacity: 0;
                        }
                        50% {
                          transform: scale(1.2) translateX(0);
                        }
                        100% {
                          transform: scale(1) translateX(0);
                          opacity: 1;
                        }
                      }
                      .group:hover .reaction-emoji {
                        animation: popIn 0.3s ease-out forwards;
                      }
                    `}</style>
                    {REACTIONS.map((symbol, index) => {
                      const mine = msg.reactions?.some(
                        (r) => getId(r.user) === currentUser?._id && r.reaction === symbol
                      );
                      return (
                        <button
                          key={symbol}
                          type="button"
                          className={`reaction-emoji text-base leading-none p-1.5 rounded-full transition-all hover:scale-125 ${
                            mine ? "bg-blue-600" : "hover:bg-gray-700"
                          }`}
                          style={{
                            animationDelay: `${index * 0.05}s`
                          }}
                          onClick={() => handleReaction(msg, symbol)}
                          title={mine ? "Remove reaction" : "Add reaction"}
                        >
                          {symbol}
                        </button>
                      );
                    })}
                    <div className="w-px h-4 bg-gray-600 mx-1"></div>
                    <button
                      type="button"
                      data-reaction-button="true"
                      className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-all"
                      onClick={() => setShowReactionPicker(msg._id)}
                      title="More reactions"
                    >
                      <IoAddCircleOutline size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Reaction Summary and Timestamp */}
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  
                  {/* Message status indicator (only for current user's messages) */}
                  {isCurrentUser && (
                    <span className="flex items-center">
                      {msg.status === 'sending' ? (
                        <span className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" title="Sending" />
                      ) : msg.status === 'read' ? (
                        <IoCheckmarkDone size={16} className="text-blue-400" title="Read" />
                      ) : msg.status === 'delivered' ? (
                        <IoCheckmarkDone size={16} className="text-gray-400" title="Delivered" />
                      ) : (
                        <IoCheckmark size={16} className="text-gray-400" title="Sent" />
                      )}
                    </span>
                  )}
                  
                  {/* Display reaction counts */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-full border border-gray-700">
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <span key={emoji} className="flex items-center gap-1">
                          <span className="text-sm">{emoji}</span>
                          <span className="text-[10px] text-gray-400">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Custom Emoji Picker for Reactions */}
                {showReactionPicker === msg._id && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/50 z-9998"
                      onClick={() => setShowReactionPicker(null)}
                    />
                    {/* Emoji Picker */}
                    <div
                      ref={reactionPickerRef}
                      className="fixed z-9999 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ 
                        maxWidth: '350px'
                      }}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) => handleReactionEmojiClick(emojiData, msg._id)}
                        theme="dark"
                        searchDisabled={false}
                        height={400}
                        width={320}
                      />
                    </div>
                  </>
                )}
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
              className="max-h-32 rounded-2xl"
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
      
      <div className="p-4 border-t border-gray-700 flex items-center gap-2 relative">
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
          className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
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
          <FaRegSmile size={22} className="cursor-pointer" />
        </button>
        {showEmoji && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-12 left-0 z-50 "
            style={{ minWidth: 320 }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="dark"
              searchDisabled={false}
            />
          </div>
        )}
        <input
          ref={inputRef}
          className="flex-1 p-2 rounded border border-gray-700 text-white outline-none bg-transparent"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            // Emit typing event
            if (socket && currentUser && user) {
              socket.emit("typing", {
                senderId: currentUser._id,
                receiverId: user._id,
              });
              // Clear previous timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              // Stop typing after 2 seconds of inactivity
              typingTimeoutRef.current = setTimeout(() => {
                socket.emit("stopTyping", {
                  senderId: currentUser._id,
                  receiverId: user._id,
                });
              }, 2000);
            }
          }}
          onKeyPress={handleKeyPress}
        />
        <button
          type="button"
          onClick={handleSend}
          className="p-2 text-gray-400 hover:text-white disabled:opacity-50 cursor-pointer"
          disabled={isUploading}
        >
          {isUploading ? (
            <ButtonLoading color="#9ca3af" />
          ) : (
            <IoMdSend size={22} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatView;