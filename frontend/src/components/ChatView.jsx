import React, { useState, useRef, useEffect } from "react";
import { IoMdSend } from "react-icons/io";
import { FaRegSmile } from "react-icons/fa";
import { IoImageOutline, IoClose, IoAddCircleOutline, IoMicOutline, IoStopCircleOutline } from "react-icons/io5";
import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";
import { ButtonLoading } from "./Loading";
import { ContentLoading } from "./Loading";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { useSettings } from "../context/useSettings";
import {
  formatBold,
  formatItalic,
  formatUnderline,
  formatStrikethrough,
  formatInlineCode,
  formatHighlight,
} from "../lib/markdownParser";

// Custom marked extensions for underline and highlight
const underlineExtension = {
  name: "underline",
  level: "inline",
  start(src) {
    return src.match(/__/)?.index;
  },
  tokenizer(src) {
    const rule = /^__([^_]+)__/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "underline",
        raw: match[0],
        text: match[1],
      };
    }
  },
  renderer(token) {
    return `<u>${token.text}</u>`;
  },
};

const highlightExtension = {
  name: "highlight",
  level: "inline",
  start(src) {
    return src.match(/==/)?.index;
  },
  tokenizer(src) {
    const rule = /^==([^=]+)==/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: "highlight",
        raw: match[0],
        text: match[1],
      };
    }
  },
  renderer(token) {
    return `<mark>${token.text}</mark>`;
  },
};

// Configure marked with extensions and highlight.js
marked.use({
  extensions: [underlineExtension, highlightExtension],
  gfm: true,
  breaks: true,
});

marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: "hljs language-",
});

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const getId = (u) => (typeof u === "object" ? u?._id : u);

// Toolbar button icons using text/emoji for simplicity
const ToolbarButton = ({ onClick, title, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-700"
    }`}
  >
    {children}
  </button>
);

const ChatView = ({ user, socket, currentUser, onViewProfile, isUserOnline, isUserTyping, isMobile , onBack }) => {
  const { settings, sendNotification } = useSettings();
  // Join current user's room for real-time updates and handle reconnection
  useEffect(() => {
    if (!socket || !currentUser || !currentUser._id) {
      console.log('ChatView: Cannot join - missing socket or currentUser', { hasSocket: !!socket, hasUser: !!currentUser });
      return;
    }

    const handleConnect = () => {
      console.log('ChatView: Socket connected, joining room:', currentUser._id);
      console.log('ChatView: Socket connected status:', socket.connected);
      socket.emit("join", currentUser._id);
    };

    console.log('ChatView: Setting up join effect', { currentUserId: currentUser._id, socketConnected: socket.connected, socketId: socket.id });

    // Join immediately if already connected
    if (socket.connected) {
      console.log('ChatView: Socket already connected, joining room immediately');
      handleConnect();
    }

    // Re-join on reconnect
    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket, currentUser]);

  // Refs to always have latest user/currentUser in socket listener
  const userRef = useRef(user);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    userRef.current = user;
    currentUserRef.current = currentUser;
  }, [user, currentUser]);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(null); // Track which message's reaction picker is open
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);


  // Listen for incoming messages - FIXED to use refs
  useEffect(() => {
    if (!socket) {
      console.warn('ChatView: Socket not available');
      return;
    }
    
    console.log('ChatView: Setting up socket listeners', { socketId: socket.id, connected: socket.connected });
    
    const handleNewMessage = (msg) => {
      // Use refs to get current values
      const u = userRef.current;
      const cu = currentUserRef.current;
      
      console.log('ChatView: handleNewMessage called', { 
        msgId: msg._id, 
        msgSender: typeof msg.sender === 'object' ? msg.sender._id : msg.sender,
        msgReceiver: typeof msg.receiver === 'object' ? msg.receiver._id : msg.receiver,
        currentChatUser: u?._id,
        currentUser: cu?._id
      });

      if (!u || !cu) {
        console.log('ChatView: User or currentUser not available yet');
        return;
      }

      const senderId = typeof msg.sender === "object" ? msg.sender._id : msg.sender;
      const receiverId = typeof msg.receiver === "object" ? msg.receiver._id : msg.receiver;
      
      console.log('ChatView: Received newMessage event:', {
        messageId: msg._id,
        tempId: msg.tempId,
        senderId,
        receiverId,
        status: msg.status,
        currentChat: u._id,
        currentUser: cu._id,
        isRelevant: (senderId === u._id && receiverId === cu._id) || (senderId === cu._id && receiverId === u._id)
      });
      
      // Check if this message is relevant to the current chat
      const isRelevant = (senderId === u._id && receiverId === cu._id) || (senderId === cu._id && receiverId === u._id);
      
      if (!isRelevant) {
        console.log('ChatView: Message not relevant to current chat, ignoring');
        return;
      }

      setMessages((prev) => {
        // Try to reconcile optimistic message using tempId
        const optimisticIdx = prev.findIndex(
          (m) =>
            m.tempId &&
            m.tempId === msg.tempId &&
            getId(m.sender) === senderId &&
            getId(m.receiver) === receiverId
        );
        
        if (optimisticIdx !== -1) {
          console.log('ChatView: Reconciling message with tempId:', msg.tempId);
          const updated = [...prev];
          updated[optimisticIdx] = { 
            ...msg, 
            tempId: undefined,
            status: msg.status || 'sent'
          };
          return updated;
        }

        // Fallback: reconcile by matching sender/receiver/content when tempId missing
        const fuzzyIdx = prev.findIndex((m) => {
          const prevImage = m.image ? m.image.url || m.image : "";
          const incomingImage = msg.image ? msg.image.url || msg.image : "";
          return (
            m.tempId &&
            m.status === 'sending' &&
            getId(m.sender) === senderId &&
            getId(m.receiver) === receiverId &&
            (m.content || "") === (msg.content || "") &&
            prevImage === incomingImage
          );
        });
        
        if (fuzzyIdx !== -1) {
          console.log('ChatView: Fuzzy reconciling message without tempId match');
          const updated = [...prev];
          updated[fuzzyIdx] = { 
            ...msg, 
            tempId: undefined,
            status: msg.status || 'sent'
          };
          return updated;
        }

        // Check if message already exists to prevent duplicates
        const exists = prev.some((m) => m._id && msg._id && m._id === msg._id);
        if (exists) {
          console.log('ChatView: Message already exists, skipping:', msg._id);
          return prev;
        }
        
        console.log('ChatView: Adding new message to chat:', msg._id);
        return [...prev, msg];
      });

      // Mark message as read if it's from the other user and readReceipts are enabled
      if (cu && senderId === u._id && receiverId === cu._id && settings.readReceipts) {
        socket.emit("markMessageRead", { messageId: msg._id, userId: cu._id });
      }

      // Send notification if a message is received from the other user
      if (cu && senderId === u._id && receiverId === cu._id && settings.notifications) {
        const senderName = typeof msg.sender === "object" ? msg.sender.name : "Someone";
        const messagePreview = msg.content ? msg.content.substring(0, 50) : "sent you a message";
        sendNotification(`New message from ${senderName}`, {
          body: messagePreview,
          tag: `message-${u._id}`,
        });
      }
    };

    const handleMessagesMarkedRead = ({ messageIds }) => {
      console.log('ChatView: Received messagesMarkedRead', { messageIds });
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m._id) ? { ...m, status: "read" } : m
        )
      );
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      console.log('ChatView: Received messageReactionUpdated', { messageId });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        )
      );
    };

    const handleMessageStatusUpdate = ({ messageId, status }) => {
      console.log('ChatView: Received messageStatusUpdate:', { messageId, status });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, status } : m
        )
      );
    };

    const handleConnect = () => {
      console.log('ChatView: Socket reconnected, listeners re-registered');
      if (currentUserRef.current && currentUserRef.current._id) {
        socket.emit("join", currentUserRef.current._id);
      }
    };

    console.log('ChatView: Registering socket event listeners');
    socket.on("newMessage", handleNewMessage);
    socket.on("messagesMarkedRead", handleMessagesMarkedRead);
    socket.on("messageReactionUpdated", handleReactionUpdated);
    socket.on("messageStatusUpdate", handleMessageStatusUpdate);
    socket.on("connect", handleConnect);

    return () => {
      console.log('ChatView: Cleaning up socket listeners');
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesMarkedRead", handleMessagesMarkedRead);
      socket.off("messageReactionUpdated", handleReactionUpdated);
      socket.off("messageStatusUpdate", handleMessageStatusUpdate);
      socket.off("connect", handleConnect);
    };
  }, [socket, settings.readReceipts, settings.notifications, sendNotification]); // Include settings dependencies

  // Cleanup on unmount
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioPreview(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setAudioPreview(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages when user changes
  useEffect(() => {
    if (!user || !user._id) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const { default: axios } = await import("../lib/axios");
        const res = await axios.get(`/messages/${user._id}`);
        // console.log("Fetched messages response:", res.data);
        
        // Handle different response structures
        const fetchedMessages = res.data.messages || res.data.data || res.data || [];
        // console.log("Setting messages:", fetchedMessages);
        setMessages(fetchedMessages);
        
        // Scroll to bottom after messages load
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        console.error("Error details:", error.response?.data);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    // Listen for socket reconnection to refresh messages
    const handleReconnect = () => {
      console.log('ChatView: Socket reconnected, refreshing messages');
      fetchMessages();
    };

    if (socket) {
      socket.on('connect', handleReconnect);
    }

    return () => {
      if (socket) {
        socket.off('connect', handleReconnect);
      }
    };
  }, [user, socket]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length]);

  // Handle emoji click
  const handleEmojiClick = (emojiData) => {
    setInputValue((prev) => prev + emojiData.emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmoji) return;
    const handleClickOutside = (event) => {
      const isEmojiButton = event.target.closest('[data-emoji-button="true"]');
      if (isEmojiButton) return;
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);


  // Handle markdown formatting
  const handleFormat = (formatter) => {
    if (!inputRef.current) return;

    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;

    if (start === end) {
      // No selection, just insert markers
      const marker = getMarker(formatter);
      const newText =
        inputValue.substring(0, start) +
        marker +
        marker +
        inputValue.substring(end);
      setInputValue(newText);
      // Set cursor position between markers
      setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          start + marker.length,
          start + marker.length
        );
      }, 0);
    } else {
      // Wrap selection with markers
      const { newText } = formatter(inputValue, start, end);
      setInputValue(newText);
      // Restore selection
      setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          start,
          end + getMarkerLength(formatter)
        );
      }, 0);
    }
  };

  const getMarker = (formatter) => {
    switch (formatter) {
      case formatBold:
        return "**";
      case formatItalic:
        return "*";
      case formatUnderline:
        return "__";
      case formatStrikethrough:
        return "~~";
      case formatInlineCode:
        return "`";
      case formatHighlight:
        return "==";
      default:
        return "";
    }
  };

  const getMarkerLength = (formatter) => {
    return getMarker(formatter).length * 2;
  };

  // Render markdown content
  const renderMarkdown = (content) => {
    if (!content) return null;

    try {
      // Parse markdown to HTML
      const html = marked.parse(content);
      // Sanitize HTML to prevent XSS
      const sanitized = DOMPurify.sanitize(html);
      return { __html: sanitized };
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return { __html: content };
    }
  };

  // Handle reaction emoji selection
  const handleReactionEmojiClick = async (emojiData, messageId) => {
    const emoji = emojiData.emoji;
    const msg = messages.find((m) => m._id === messageId);
    if (!msg) return;

    const existing = msg.reactions?.find(
      (r) => getId(r.user) === currentUser?._id
    );
    const next = existing?.reaction === emoji ? null : emoji;

    // 1. Optimistically update UI
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        let reactions = m.reactions || [];
        if (next === null) {
          reactions = reactions.filter((r) => getId(r.user) !== currentUser?._id);
        } else if (existing) {
          reactions = reactions.map((r) =>
            getId(r.user) === currentUser?._id ? { ...r, reaction: next } : r
          );
        } else {
          reactions = [...reactions, { user: currentUser._id, reaction: next }];
        }
        return { ...m, reactions };
      })
    );

    // 2. Sync with backend
    const { default: axios } = await import("../lib/axios");
    try {
      const res = await axios.post(`/messages/${messageId}/react`, {
        reaction: next,
      });
      console.log("Reaction response:", res.data);

      if (res.data?.data) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return { ...m, reactions: res.data.data.reactions || m.reactions };
            }
            return m;
          })
        );

        // 3. Broadcast to other user via socket
        if (socket && user) {
          socket.emit("reactionUpdated", {
            messageId,
            userId: currentUser._id,
            reaction: next,
            reactions: res.data.data.reactions || [],
          });
        }
      }
    } catch (e) {
      console.error("React failed", e);
      console.error("Error response:", e.response?.data);
      // Rollback on error
      setMessages((prev) => prev.map((m) => (m._id === messageId ? msg : m)));
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
    if (!inputValue.trim() && !selectedImage && !audioBlob) {
      console.log("No message content, image, or audio");
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
    let audioUrl = null;

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

    // Upload audio if recorded
    if (audioBlob) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        const audioBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioBlob);
        });
        const { default: axios } = await import("../lib/axios");
        const response = await axios.post("/messages/upload-audio", {
          audio: audioBase64,
        });
        audioUrl = response.data.url;
      } catch (error) {
        console.error("Failed to upload audio:", error);
        alert("Failed to upload audio. Please try again.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const msg = {
      content: inputValue,
      image: imageUrl,
      audio: audioUrl,
      receiver: user._id,
      sender: currentUser._id,
      createdAt: new Date().toISOString(),
      tempId,
    };

    // Optimistically add message to UI
    const optimisticMessage = {
      ...msg,
      status: "sending",
      sender: currentUser,
      receiver: user,
      image: imageUrl ? { url: imageUrl } : null,
      audio: audioUrl ? { url: audioUrl } : null,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    console.log("ChatView: Emitting sendMessage:", { 
      tempId, 
      receiver: user._id, 
      sender: currentUser._id,
      hasContent: !!inputValue,
      hasImage: !!imageUrl,
      hasAudio: !!audioUrl
    });
    socket.emit("sendMessage", msg);

    // Stop typing indicator when message is sent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (settings.typingIndicator) {
      socket.emit("stopTyping", {
        senderId: currentUser._id,
        receiverId: user._id,
      });
    }

    setInputValue("");
    handleRemoveImage();
    cancelRecording();
    
    // Scroll to bottom after sending message
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReaction = async (msg, symbol) => {
    const existing = msg.reactions?.find(
      (r) => getId(r.user) === currentUser?._id
    );

    const next = existing?.reaction === symbol ? null : symbol;

    // 1. Optimistically update UI
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== msg._id) return m;

        let reactions = m.reactions || [];

        if (next === null) {
          reactions = reactions.filter(
            (r) => getId(r.user) !== currentUser?._id
          );
        } else if (existing) {
          reactions = reactions.map((r) =>
            getId(r.user) === currentUser?._id ? { ...r, reaction: next } : r
          );
        } else {
          reactions = [...reactions, { user: currentUser._id, reaction: next }];
        }

        return { ...m, reactions };
      })
    );

    // 2. Sync with backend
    try {
      const { default: axios } = await import("../lib/axios");
      const res = await axios.post(`/messages/${msg._id}/react`, {
        reaction: next,
      });

      console.log("Reaction response:", res.data);

      // 3. Replace with server truth
      if (res.data?.data) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id === msg._id) {
              return { ...m, reactions: res.data.data.reactions || m.reactions };
            }
            return m;
          })
        );

        // 4. Broadcast to other user via socket
        if (socket && user) {
          socket.emit("reactionUpdated", {
            messageId: msg._id,
            userId: currentUser._id,
            reaction: next,
            reactions: res.data.data.reactions || [],
          });
        }
      }
    } catch (e) {
      console.error("React failed", e);
      console.error("Error response:", e.response?.data);

      // Rollback on error
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    }
  };

  const splitIntoLines = (text, limit = 30) => {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > limit) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines;
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
      {/* Mobile header with back */}
      {/* {isMobile && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-700">
          <button
            onClick={onBack}
            aria-label="Back to chat list"
            className="text-gray-300 hover:text-white"
            title="Back"
          >
            <span className="inline-block">&larr;</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{user?.name || 'Chat'}</span>
            {isUserOnline && <span className="text-xs text-green-500">● Online</span>}
            {isUserTyping && <span className="text-xs text-blue-400">typing...</span>}
          </div>
        </div>
      )} */}

      {/* {!isMobile && ( */}
        <div className="chat-header p-4 border-b border-gray-700 flex items-center gap-4">
          {isMobile && (
            <button
            onClick={onBack}
            aria-label="Back to chat list"
            className="text-gray-300 hover:text-white"
            title="Back"
          >
            <span className="inline-block">&larr;</span>
          </button>
              )
              }
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
      {/* )} */}

      <div
        className={"flex-1 " + (isMobile ? "p-3" : "p-6") + " overflow-y-auto text-white scrollbar-hide"}
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
            const audioUrl = msg.audio?.url || msg.audio;
            const isImageOnly = imageUrl && !msg.content && !audioUrl;
            const isAudioOnly = audioUrl && !msg.content && !imageUrl;
            const bubbleBase = "max-w-[88vw] sm:max-w-md md:max-w-lg shadow-md";
            const bubbleClass = `${bubbleBase} ${
              isImageOnly || isAudioOnly
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
              msg.reactions.forEach((r) => {
                if (r.reaction) {
                  reactionCounts[r.reaction] =
                    (reactionCounts[r.reaction] || 0) + 1;
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
                    {audioUrl && (
                      <div className={`flex items-center gap-2 ${!isAudioOnly ? "mb-2" : "p-3"} ${isAudioOnly && (isCurrentUser ? "bg-blue-600" : "bg-gray-800")} rounded-2xl`}>
                        <IoMicOutline size={20} className="text-white" />
                        <audio 
                          src={audioUrl} 
                          controls 
                          className="max-w-xs"
                          style={{ 
                            height: '32px',
                            filter: 'invert(1) grayscale(1) contrast(0.9)'
                          }}
                        />
                      </div>
                    )}
                    {msg.content &&
                      splitIntoLines(msg.content).map((chunk, index) => (
                        <div
                          key={index}
                          className="markdown-content prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={renderMarkdown(chunk)}
                        />
                      ))}
                  </div>

                  {/* Quick Reactions Bar - Shows on hover */}
                  <div
                    className={`absolute ${
                      isCurrentUser ? "right-0" : "left-0"
                    } -bottom-8 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 bg-gray-800/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border border-gray-700 cursor-pointer`}
                    style={{
                      transform: "translateX(0)",
                      // animation: "slideInFromRight 0.3s ease-out",
                    }}
                  >
                    <style>{`
                     
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
                        cursor: pointer;
                      }
                    `}</style>
                    {REACTIONS.map((symbol, index) => {
                      const mine = msg.reactions?.some(
                        (r) =>
                          getId(r.user) === currentUser?._id &&
                          r.reaction === symbol
                      );
                      return (
                        <button
                          key={symbol}
                          type="button"
                          className={`reaction-emoji text-base leading-none p-1.5 rounded-full transition-all hover:scale-125 cursor-pointer${
                            mine ? "bg-blue-600" : "hover:bg-gray-700"
                          }`}
                          style={{
                            animationDelay: `${index * 0.05}s`,
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
                      {msg.status === "sending" ? (
                        <span
                          className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"
                          title="Sending"
                        />
                      ) : msg.status === "read" ? (
                        <IoCheckmarkDone
                          size={16}
                          className="text-blue-400"
                          title="Read"
                        />
                      ) : msg.status === "delivered" ? (
                        <IoCheckmarkDone
                          size={16}
                          className="text-gray-400"
                          title="Delivered"
                        />
                      ) : (
                        <IoCheckmark
                          size={16}
                          className="text-gray-400"
                          title="Sent"
                        />
                      )}
                    </span>
                  )}

                  {/* Display reaction counts */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-full border border-gray-700">
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <span key={emoji} className="flex items-center gap-1">
                          <span className="text-sm">{emoji}</span>
                          <span className="text-[10px] text-gray-400">
                            {count}
                          </span>
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
                        maxWidth: "350px",
                      }}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) =>
                          handleReactionEmojiClick(emojiData, msg._id)
                        }
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
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
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

      {/* Audio Preview Section */}
      {audioPreview && !isRecording && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 p-3 bg-zinc-700 rounded-lg border border-gray-600">
            <IoMicOutline size={20} className="text-blue-500" />
            <audio src={audioPreview} controls className="flex-1" />
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition"
            >
              <IoClose size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        className={(isMobile ? "p-2 gap-1" : "p-4 gap-2") + " border-t border-gray-700 flex flex-wrap items-end  sm:gap-3 relative"}
        // style={{ paddingBottom: isMobile ? "env(safe-area-inset-bottom)" : undefined }}
      >
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
        <button
          type="button"
          className={`p-2 transition ${
            isRecording
              ? "text-red-500 animate-pulse"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? "Stop recording" : "Record voice message"}
        >
          {isRecording ? (
            <IoStopCircleOutline size={22} />
          ) : (
            <IoMicOutline size={22} />
          )}
        </button>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-500 text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}
        {showEmoji && (
          <div
            ref={emojiPickerRef}
            className="absolute bottom-12 left-0 z-50 "
            style={{ minWidth: isMobile ? 280 : 320 }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme="dark"
              searchDisabled={false}
            />
          </div>
        )}

        {/* Markdown Toolbar Toggle */}
        {!isMobile && (
          <button
          type="button"
          className={`p-2 transition-colors cursor-pointer ${
            showToolbar ? "text-blue-400" : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setShowToolbar(!showToolbar)}
          title="Formatting options"
        >
          <span className="font-bold text-sm">Aa</span>
        </button>
        )}
        

        {/* Markdown Toolbar */}
        {showToolbar && (
          <div className="absolute bottom-14 left-0 z-50 flex flex-col gap-2">
            {/* Main toolbar */}
            <div className="flex items-center gap-1 bg-gray-800/95 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-700 shadow-lg">
              <ToolbarButton
                onClick={() => handleFormat(formatBold)}
                title="Bold (**text**)"
              >
                <span className="font-bold text-sm">B</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => handleFormat(formatItalic)}
                title="Italic (*text*)"
              >
                <span className="italic text-sm">I</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => handleFormat(formatUnderline)}
                title="Underline (__text__)"
              >
                <span className="underline text-sm">U</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => handleFormat(formatStrikethrough)}
                title="Strikethrough (~~text~~)"
              >
                <span className="line-through text-sm">S</span>
              </ToolbarButton>
              <div className="w-px h-5 bg-gray-600 mx-1"></div>
              <ToolbarButton
                onClick={() => handleFormat(formatInlineCode)}
                title="Inline Code (`code`)"
              >
                <span
                  className="font-mono text-xs"
                  style={{ fontSize: "10px" }}
                >
                  &lt;/&gt;
                </span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => handleFormat(formatHighlight)}
                title="Highlight (==text==)"
              >
                <span className="text-xs bg-yellow-500/30 text-yellow-300 px-1 rounded">
                  H
                </span>
              </ToolbarButton>
            </div>

            {/* Help text */}
            <div className="text-xs text-gray-400 bg-gray-800/90 backdrop-blur-sm rounded px-2 py-1 border border-gray-700">
              Tip: Select text and click a button to format, or click to insert
              markers
            </div>
          </div>
        )}

       <input
          ref={inputRef}
          className="flex-1 min-w-0 p-2 rounded border border-gray-700 text-white outline-none bg-transparent"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => {
            const value = e.target.value;
            setInputValue(value);
            
            // Debounced typing event
            if (socket && currentUser && user && settings.typingIndicator) {
              // Clear previous timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              } else if (value.length === 1) {
                // Only emit typing on first character
                socket.emit("typing", {
                  senderId: currentUser._id,
                  receiverId: user._id,
                });
              }
              
              // Stop typing after 1 seconds of inactivity
              typingTimeoutRef.current = setTimeout(() => {
                socket.emit("stopTyping", {
                  senderId: currentUser._id,
                  receiverId: user._id,
                });
                typingTimeoutRef.current = null;
              }, 1000);
            }
          }}
          onKeyDown={handleKeyPress}
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
