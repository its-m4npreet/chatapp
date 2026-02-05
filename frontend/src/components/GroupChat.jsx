import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  UserPlus,
  Users,
  Crown,
  Shield,
  Edit,
  LogOut,
  Trash2,
  Calendar,
  User,
} from "lucide-react";

import {
  IoClose,
  IoSend,
  IoImageOutline,
  IoSettingsOutline,
  IoPersonAddOutline,
  IoAddCircleOutline,
  IoCheckmark,
  IoCheckmarkDone,
  IoMicOutline,
  IoStopCircleOutline,
  IoEllipsisHorizontal,
  IoArrowUndo,
  IoArrowRedo,
  IoCopyOutline,
  IoHappy,
  IoSearch,
  IoPlay,
  IoPause,
} from "react-icons/io5";
import { CiMenuKebab } from "react-icons/ci";
import { MdEdit } from "react-icons/md";
import { TiGroup } from "react-icons/ti";
import { FaCircleUser } from "react-icons/fa6";
import axios from "../lib/axios";
import indexedDBService from "../lib/indexedDB";
import { ContentLoading, MessageSkeletonLoader } from "./Loading";
import EditGroupModal from "./EditGroupModal";
import { FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
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
import { IoIosArrowBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";

// Support underline and highlight formatting just like ChatPage
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
      return { type: "underline", raw: match[0], text: match[1] };
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
      return { type: "highlight", raw: match[0], text: match[1] };
    }
  },
  renderer(token) {
    return `<mark>${token.text}</mark>`;
  },
};

marked.use({
  extensions: [underlineExtension, highlightExtension],
  gfm: true,
  breaks: true,
});
marked.setOptions({
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
  langPrefix: "hljs language-",
});

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

// Helper to get message theme colors based on dark mode
const getGroupMessageThemeClasses = (theme, isOwn, isDarkMode) => {
  const themes = {
    default: {
      ownDark: "bg-blue-600 text-white",
      otherDark: "bg-zinc-700 text-white",
      ownLight: "bg-blue-500 text-white",
      otherLight: "bg-gray-400 text-gray-900",
    },
    vibrant: {
      ownDark: "bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-lg",
      otherDark:
        "bg-linear-to-r from-purple-600 to-pink-500 text-white shadow-lg",
      ownLight: "bg-linear-to-r from-blue-500 to-cyan-400 text-white shadow-md",
      otherLight:
        "bg-linear-to-r from-orange-400 to-red-400 text-white shadow-md",
    },
    pastel: {
      ownDark: "bg-blue-400 text-gray-900 shadow-md",
      otherDark: "bg-green-400 text-gray-900 shadow-md",
      ownLight: "bg-blue-300 text-gray-900 shadow-sm",
      otherLight: "bg-green-300 text-gray-900 shadow-sm",
    },
    dark: {
      ownDark: "bg-gray-900 text-white border border-gray-700",
      otherDark: "bg-gray-700 text-white border border-gray-600",
      ownLight: "bg-gray-800 text-white border border-gray-600",
      otherLight: "bg-gray-600 text-white border border-gray-500",
    },
    minimal: {
      ownDark: "bg-gray-700 text-white",
      otherDark: "bg-gray-600 text-white",
      ownLight: "bg-gray-200 text-gray-900",
      otherLight: "bg-gray-100 text-gray-900",
    },
  };

  const selectedTheme = themes[theme] || themes.default;
  if (isDarkMode) {
    return isOwn ? selectedTheme.ownDark : selectedTheme.otherDark;
  } else {
    return isOwn ? selectedTheme.ownLight : selectedTheme.otherLight;
  }
};

const getGroupAudioThemeClasses = (theme, isOwn, isDarkMode) => {
  const themes = {
    default: {
      ownDark: "bg-blue-600",
      otherDark: "bg-zinc-700",
      ownLight: "bg-blue-500",
      otherLight: "bg-gray-400",
    },
    vibrant: {
      ownDark: "bg-linear-to-r from-blue-600 to-blue-500",
      otherDark: "bg-linear-to-r from-purple-600 to-pink-500",
      ownLight: "bg-linear-to-r from-blue-500 to-cyan-400",
      otherLight: "bg-linear-to-r from-orange-400 to-red-400",
    },
    pastel: {
      ownDark: "bg-blue-400",
      otherDark: "bg-green-400",
      ownLight: "bg-blue-300",
      otherLight: "bg-green-300",
    },
    dark: {
      ownDark: "bg-gray-900",
      otherDark: "bg-gray-700",
      ownLight: "bg-gray-800",
      otherLight: "bg-gray-600",
    },
    minimal: {
      ownDark: "bg-gray-700",
      otherDark: "bg-gray-600",
      ownLight: "bg-gray-200",
      otherLight: "bg-gray-100",
    },
  };

  const selectedTheme = themes[theme] || themes.default;
  if (isDarkMode) {
    return isOwn ? selectedTheme.ownDark : selectedTheme.otherDark;
  } else {
    return isOwn ? selectedTheme.ownLight : selectedTheme.otherLight;
  }
};

// WhatsApp-style Audio Message Player Component
const AudioMessage = ({ src, isCurrentUser, isDarkMode }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate waveform bars (static visual representation)
  const waveformBars = Array.from({ length: 28 }, (_, i) => {
    const height = 20 + Math.sin(i * 0.8) * 15 + Math.cos(i * 1.2) * 10;
    return Math.max(8, Math.min(35, height));
  });

  return (
    <div className="flex items-center gap-3 min-w-50 max-w-70">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button
        onClick={togglePlay}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isCurrentUser
            ? "bg-white/20 hover:bg-white/30 text-white"
            : isDarkMode
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-black/10 hover:bg-black/20 text-gray-700"
        }`}
      >
        {isPlaying ? (
          <IoPause size={20} />
        ) : (
          <IoPlay size={20} className="ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div 
          className="flex items-center gap-0.5 h-8 cursor-pointer"
          onClick={handleSeek}
        >
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isActive = barProgress <= progress;
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isActive
                    ? isCurrentUser
                      ? "bg-white"
                      : isDarkMode
                        ? "bg-white"
                        : "bg-gray-700"
                    : isCurrentUser
                      ? "bg-white/40"
                      : isDarkMode
                        ? "bg-white/40"
                        : "bg-gray-400"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <div className={`flex justify-between text-xs ${
          isCurrentUser
            ? "text-white/80"
            : isDarkMode
              ? "text-white/80"
              : "text-gray-600"
        }`}>
          <span>{formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}</span>
        </div>
      </div>
    </div>
  );
};

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Add global styles for reaction animations
const reactionStyles = `
  @keyframes popIn {
    0% { transform: scale(0) translateX(10px); opacity: 0; }
    50% { transform: scale(1.2) translateX(0); }
    100% { transform: scale(1) translateX(0); opacity: 1; }
  }
  .group:hover .reaction-emoji { animation: popIn 0.3s ease-out forwards; }
`;

const GroupChat = ({
  group,
  socket,
  currentUser,
  // onClose,
  onOpenInvite,
  onGroupUpdated,
  isMobile,
  onBack,
}) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDesktopMenu, setShowDesktopMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showQuickReactions, setShowQuickReactions] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [forwardRecipients, setForwardRecipients] = useState({ friends: [], groups: [] });
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");
  const [isForwarding, setIsForwarding] = useState(false);
  const [isLoadingForward, setIsLoadingForward] = useState(false);
  const [forwardTab, setForwardTab] = useState("friends"); // "friends" or "groups"
  // Mention states
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentions, setSelectedMentions] = useState([]); // Array of {userId, name}
  const [showLongPressReactions, setShowLongPressReactions] = useState(null); // {messageId, x, y}
  const mentionSuggestionsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const timestampRef = useRef(null);

  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const desktopMenuRef = useRef(null);
  const getId = (val) =>
    typeof val === "object" && val !== null ? val._id : val;

  const isCreator = group?.creator?._id === currentUser?._id;
  const isAdmin = group?.admins?.some((a) => a._id === currentUser?._id);

  // Initialize timestamp on component mount
  useEffect(() => {
    if (!timestampRef.current) {
      timestampRef.current = Date.now();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClickOutside = (event) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileMenu]);

  // Close desktop menu when clicking outside
  useEffect(() => {
    if (!showDesktopMenu) return;
    const handleClickOutside = (event) => {
      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(event.target)
      ) {
        setShowDesktopMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDesktopMenu]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Memoize helper functions to prevent recreation on every render
  const getMarker = useCallback((formatter) => {
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
  }, []);

  const getMarkerLength = useCallback(
    (formatter) => {
      return getMarker(formatter).length * 2;
    },
    [getMarker],
  );

  // Memoize renderMarkdown to prevent recreation - now highlights @mentions
  const renderMarkdown = useCallback((content, mentions = []) => {
    if (!content) return null;
    try {
      let processedContent = content;
      
      // Highlight @mentions - replace @username with styled span
      if (mentions && mentions.length > 0) {
        mentions.forEach((mention) => {
          const mentionName = mention.name || mention;
          const mentionRegex = new RegExp(`@${mentionName}\\b`, 'g');
          processedContent = processedContent.replace(
            mentionRegex,
            `<span class="mention-highlight text-blue-400 font-semibold">@${mentionName}</span>`
          );
        });
      }
      
      // Also highlight any @word pattern that might be a mention
      processedContent = processedContent.replace(
        /@(\w+)/g,
        (match) => {
          // Check if already processed
          if (match.includes('mention-highlight')) return match;
          return `<span class="text-blue-400 font-semibold">${match}</span>`;
        }
      );
      
      const html = marked.parse(processedContent);
      const sanitized = DOMPurify.sanitize(html, {
        ADD_ATTR: ['class'], // Allow class attribute for mention styling
      });
      return { __html: sanitized };
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return { __html: content };
    }
  }, []);

  const splitIntoLines = useCallback((text, limit = 30) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      if (word.length > limit) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
        for (let i = 0; i < word.length; i += limit) {
          lines.push(word.substring(i, i + limit));
        }
      } else if ((currentLine + word).length > limit) {
        lines.push(currentLine.trim());
        currentLine = word + " ";
      } else {
        currentLine += word + " ";
      }
    }

    if (currentLine) lines.push(currentLine.trim());
    return lines;
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!group?._id) return;
    
    // Reset state for new group
    setMessages([]);
    setLoading(true);

    const fetchMessages = async () => {
      // TIER 1: Load from IndexedDB first (instant display)
      try {
        const cachedMessages = await indexedDBService.getGroupMessages(group._id, 50);
        if (cachedMessages.length > 0) {
          console.log(`GroupChat: Loaded ${cachedMessages.length} messages from IndexedDB`);
          setMessages(cachedMessages);
          setLoading(false); // Show cached data immediately
          setTimeout(scrollToBottom, 50);
        }
      } catch (idbError) {
        console.warn('IndexedDB group messages load failed:', idbError);
      }

      // TIER 2: Fetch from server (source of truth) in background
      try {
        const res = await axios.get(`/groups/${group._id}/messages`);
        const fetchedMessages = res.data.messages || [];
        setMessages(fetchedMessages);
        setLoading(false);
        
        // Cache to IndexedDB for next load
        if (fetchedMessages.length > 0) {
          indexedDBService.saveGroupMessages(fetchedMessages, group._id).catch(console.error);
        }
        
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Failed to fetch group messages:", error);
        setLoading(false);
        // If server fails, IndexedDB data is still displayed (offline support)
      }
    };

    fetchMessages();
  }, [group?._id]);

  // Listen for new group messages
  useEffect(() => {
    if (!socket || !group?._id) return;

    const handleNewGroupMessage = ({ groupId, message }) => {
      if (groupId === group._id) {
        // Cache new message to IndexedDB
        indexedDBService.saveGroupMessage(message, groupId).catch(console.error);
        
        setMessages((prev) => {
          // Reconcile optimistic message first
          const optimisticIdx = prev.findIndex(
            (m) => m.tempId && m.tempId === message.tempId,
          );
          if (optimisticIdx !== -1) {
            const updated = [...prev];
            updated[optimisticIdx] = { ...message, tempId: undefined };
            return updated;
          }

          // Fallback: fuzzy match by content, image, and replyTo
          const fuzzyIdx = prev.findIndex((m) => {
            const prevImage = m.image ? m.image.url || m.image : "";
            const incomingImage = message.image
              ? message.image.url || message.image
              : "";
            const prevReplyId = m.replyTo
              ? typeof m.replyTo === "object"
                ? m.replyTo._id
                : m.replyTo
              : null;
            const incomingReplyId = message.replyTo
              ? typeof message.replyTo === "object"
                ? message.replyTo._id
                : message.replyTo
              : null;

            return (
              m.tempId &&
              m.status === "sending" &&
              getId(m.sender) === getId(message.sender) &&
              (m.content || "") === (message.content || "") &&
              prevImage === incomingImage &&
              prevReplyId === incomingReplyId
            );
          });

          if (fuzzyIdx !== -1) {
            const updated = [...prev];
            updated[fuzzyIdx] = { ...message, tempId: undefined };
            return updated;
          }

          // Fallback to id check
          const exists = prev.some(
            (m) => m._id && message._id && m._id === message._id,
          );
          if (exists) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    socket.on("newGroupMessage", handleNewGroupMessage);
    return () => {
      socket.off("newGroupMessage", handleNewGroupMessage);
    };
  }, [socket, group?._id]);

  // Listen for group reaction updates
  useEffect(() => {
    if (!socket || !group?._id) return;
    const handleReactionUpdate = (payload) => {
      if (payload.groupId !== group._id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === payload.messageId
            ? { ...m, reactions: payload.reactions }
            : m,
        ),
      );
    };
    socket.on("groupMessageReactionUpdated", handleReactionUpdate);
    return () =>
      socket.off("groupMessageReactionUpdated", handleReactionUpdate);
  }, [socket, group?._id]);

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

  // Handle markdown formatting - FIXED
  const handleFormat = useCallback(
    (formatter) => {
      if (!inputRef.current) return;

      const start = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;

      if (start === end) {
        const marker = getMarker(formatter);
        setNewMessage(
          (prev) =>
            prev.substring(0, start) + marker + marker + prev.substring(end),
        );
        setTimeout(() => {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(
            start + marker.length,
            start + marker.length,
          );
        }, 0);
      } else {
        setNewMessage((prev) => {
          const { newText } = formatter(prev, start, end);
          return newText;
        });
        setTimeout(() => {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(
            start,
            end + getMarkerLength(formatter),
          );
        }, 0);
      }
    },
    [getMarker, getMarkerLength],
  );

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage && !audioBlob) || sending) return;

    setSending(true);
    setIsUploading(!!(imagePreview || audioBlob));

    try {
      let imageUrl = null;
      let audioUrl = null;

      // Upload image if selected
      if (imagePreview) {
        try {
          const response = await axios.post("/messages/upload", {
            image: imagePreview,
          });
          imageUrl = response.data.url;
        } catch (error) {
          console.error("Failed to upload image:", error);
          alert("Failed to upload image. Please try again.");
          setIsUploading(false);
          setSending(false);
          return;
        }
      }

      // Upload audio if recorded
      if (audioBlob) {
        try {
          const reader = new FileReader();
          const audioBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(audioBlob);
          });
          const response = await axios.post("/messages/upload-audio", {
            audio: audioBase64,
          });
          audioUrl = response.data.url;
        } catch (error) {
          console.error("Failed to upload audio:", error);
          alert("Failed to upload audio. Please try again.");
          setIsUploading(false);
          setSending(false);
          return;
        }
      }
      const randomStr = crypto
        .getRandomValues(new Uint8Array(6))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "");
      const tempId = `temp_${timestampRef.current}_${randomStr}`;

      // Optimistically add message to UI
      const optimisticMessage = {
        tempId,
        group: group._id,
        sender: currentUser,
        content: newMessage.trim(),
        image: imageUrl ? { url: imageUrl } : null,
        audio: audioUrl ? { url: audioUrl } : null,
        createdAt: new Date().toISOString(),
        status: "sending",
        reactions: [],
        readBy: [],
        replyTo: replyingTo || null,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(scrollToBottom, 100);

      setNewMessage("");
      handleRemoveImage();
      cancelRecording();
      setReplyingTo(null);
      setSelectedMentions([]); // Clear mentions after sending

      // Extract mention user IDs from selectedMentions
      const mentionUserIds = selectedMentions.map((m) => m.userId);

      await axios.post("/groups/message", {
        groupId: group._id,
        content: newMessage.trim(),
        image: imageUrl,
        audio: audioUrl,
        tempId,
        replyToId: replyingTo?._id || null,
        mentions: mentionUserIds,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.tempId));
    }
    setIsUploading(false);
    setSending(false);
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      await axios.post(`/groups/${group._id}/leave`);
      if (onGroupUpdated) onGroupUpdated();
      if (onBack) onBack();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to leave group");
    }
  };

  // const handleDeleteGroup = async () => {
  //   if (
  //     !window.confirm(
  //       "Are you sure you want to permanently delete this group? This action cannot be undone."
  //     )
  //   )
  //     return;

  //   try {
  //     await axios.delete(`/groups/${group._id}`);
  //     if (onGroupUpdated) onGroupUpdated();
  //     if (onClose) onClose();
  //   } catch (error) {
  //     alert(error.response?.data?.message || "Failed to delete group");
  //   }
  // };
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

  const handleEmojiClick = useCallback((emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Close reaction picker when clicking outside
  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClickOutside = (event) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target) &&
        !event.target.closest("[data-reaction-button]")
      ) {
        setShowReactionPicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReactionPicker]);

  // Close mention suggestions when clicking outside
  useEffect(() => {
    if (!showMentionSuggestions) return;
    const handleClickOutside = (event) => {
      if (
        mentionSuggestionsRef.current &&
        !mentionSuggestionsRef.current.contains(event.target) &&
        inputRef.current !== event.target
      ) {
        setShowMentionSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMentionSuggestions]);

  // Handle double-tap on message for reply (web)
  const _touchTimeoutRef = useRef(null);
  const touchStartRef = useRef({ x: 0, messageId: null, timestamp: 0 });

  const handleMessageDoubleTap = useCallback(
    (messageId) => {
      const msg = messages.find((m) => m._id === messageId);
      if (msg) {
        setReplyingTo(msg);
      }
    },
    [messages],
  );

  // Handle message menu actions
  const handleMenuReply = useCallback((message) => {
    setReplyingTo(message);
    setShowMessageMenu(null);
    inputRef.current?.focus();
  }, []);

  const handleMenuForward = useCallback(async (message) => {
    setShowMessageMenu(null);
    setMessageToForward(message);
    setForwardSearchQuery("");
    setForwardTab("friends");
    setShowForwardModal(true);
    setIsLoadingForward(true);
    
    // Fetch friends and groups for forwarding
    try {
      const [friendsRes, groupsRes] = await Promise.all([
        axios.get('/friends'),
        axios.get('/groups/my-groups')
      ]);
      
      const friendsList = friendsRes.data.friends || [];
      const groupsList = groupsRes.data.groups || [];
      
      // Filter out the current group from the groups list
      const filteredGroups = groupsList.filter(g => g._id !== group._id);
      
      setForwardRecipients({
        friends: friendsList,
        groups: filteredGroups
      });
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
      alert('Failed to load contacts. Please try again.');
      setShowForwardModal(false);
    } finally {
      setIsLoadingForward(false);
    }
  }, [group?._id]);

  const handleMenuCopy = useCallback((message) => {
    setShowMessageMenu(null);
    const textToCopy = message.content || message.image?.url || "[Image]";
    navigator.clipboard.writeText(textToCopy).catch((err) => {
      console.error("Failed to copy message:", err);
    });
  }, []);

  // Forward message to a friend (DM)
  const handleForwardToFriend = async (recipient) => {
    if (!messageToForward || isForwarding) return;
    
    setIsForwarding(true);
    
    try {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Extract image URL properly - group messages have image as { url, public_id }
      let imageUrl = null;
      if (messageToForward.image) {
        if (typeof messageToForward.image === 'string') {
          imageUrl = messageToForward.image;
        } else if (messageToForward.image.url && messageToForward.image.url.trim() !== '') {
          imageUrl = messageToForward.image.url;
        }
      }
      
      // Extract audio URL properly - group messages have audio as { url, public_id }
      let audioUrl = null;
      if (messageToForward.audio) {
        if (typeof messageToForward.audio === 'string') {
          audioUrl = messageToForward.audio;
        } else if (messageToForward.audio.url && messageToForward.audio.url.trim() !== '') {
          audioUrl = messageToForward.audio.url;
        }
      }
      
      const forwardedMsg = {
        content: messageToForward.content || "",
        image: imageUrl,
        audio: audioUrl,
        receiver: recipient._id,
        sender: currentUser._id,
        createdAt: new Date().toISOString(),
        tempId,
        isForwarded: true,
      };

      // Send the forwarded message via socket
      socket.emit("sendMessage", forwardedMsg);
      
      setShowForwardModal(false);
      setMessageToForward(null);
      setForwardRecipients({ friends: [], groups: [] });
    } catch (err) {
      console.error('Failed to forward message:', err);
      alert('Failed to forward message. Please try again.');
    } finally {
      setIsForwarding(false);
    }
  };

  // Forward message to a group
  const handleForwardToGroup = async (targetGroup) => {
    if (!messageToForward || isForwarding) return;
    
    setIsForwarding(true);
    
    try {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Extract image URL properly
      let imageUrl = null;
      if (messageToForward.image) {
        if (typeof messageToForward.image === 'string' && messageToForward.image.trim() !== '') {
          imageUrl = messageToForward.image;
        } else if (messageToForward.image.url && messageToForward.image.url.trim() !== '') {
          imageUrl = messageToForward.image.url;
        }
      }
      
      // Extract audio URL properly
      let audioUrl = null;
      if (messageToForward.audio) {
        if (typeof messageToForward.audio === 'string' && messageToForward.audio.trim() !== '') {
          audioUrl = messageToForward.audio;
        } else if (messageToForward.audio.url && messageToForward.audio.url.trim() !== '') {
          audioUrl = messageToForward.audio.url;
        }
      }
      
      await axios.post("/groups/forward", {
        groupId: targetGroup._id,
        content: messageToForward.content || "",
        image: imageUrl,
        audio: audioUrl,
        tempId,
      });
      
      setShowForwardModal(false);
      setMessageToForward(null);
      setForwardRecipients({ friends: [], groups: [] });
    } catch (err) {
      console.error('Failed to forward message to group:', err);
      alert('Failed to forward message. Please try again.');
    } finally {
      setIsForwarding(false);
    }
  };

  // Close forward modal
  const closeForwardModal = () => {
    setShowForwardModal(false);
    setMessageToForward(null);
    setForwardSearchQuery("");
    setForwardRecipients({ friends: [], groups: [] });
  };

  // Filter recipients based on search query
  const filteredFriends = forwardRecipients.friends.filter(friend =>
    friend.name?.toLowerCase().includes(forwardSearchQuery.toLowerCase()) ||
    friend.email?.toLowerCase().includes(forwardSearchQuery.toLowerCase())
  );

  const filteredGroups = forwardRecipients.groups.filter(g =>
    g.name?.toLowerCase().includes(forwardSearchQuery.toLowerCase())
  );

  // Handle touch start for swipe detection and long press (Mobile)
  const handleTouchStart = useCallback(
    (e, messageId) => {
      if (!isMobile) return;
      const now = Date.now();
      const touchPoint = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      
      touchStartRef.current = {
        x: touchPoint.x,
        messageId: messageId,
        timestamp: now,
      };
      
      // Long press detection
      longPressStartRef.current = touchPoint;
      longPressTimerRef.current = setTimeout(() => {
        if (longPressStartRef.current) {
          setShowLongPressReactions({
            messageId,
            x: longPressStartRef.current.x,
            y: longPressStartRef.current.y
          });
          longPressStartRef.current = null;
        }
      }, 500);
    },
    [isMobile],
  );

  // Handle touch move to cancel long press if moved
  const handleTouchMove = useCallback(
    (e) => {
      if (!isMobile || !longPressStartRef.current || !longPressTimerRef.current) return;
      
      const currentTouch = e.touches[0];
      const diffX = Math.abs(currentTouch.clientX - longPressStartRef.current.x);
      const diffY = Math.abs(currentTouch.clientY - longPressStartRef.current.y);
      
      // If moved more than 10px, cancel long press
      if (diffX > 10 || diffY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        longPressStartRef.current = null;
      }
    },
    [isMobile],
  );

  // Handle touch end for swipe detection (Mobile)
  const handleTouchEnd = useCallback(
    (e, messageId) => {
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressStartRef.current = null;
      
      if (!isMobile || !touchStartRef.current) return;

      const now = Date.now();
      const touchEnd = {
        x: e.changedTouches[0].clientX,
        timestamp: now,
      };

      const diffX = touchEnd.x - touchStartRef.current.x;
      const diffTime = touchEnd.timestamp - touchStartRef.current.timestamp;

      if (diffX > 50 && diffTime < 300) {
        handleMessageDoubleTap(messageId);
        touchStartRef.current = { x: 0, messageId: null, timestamp: 0 };
      }
    },
    [isMobile, handleMessageDoubleTap],
  );

  // Handle reaction selection from quick bar
  const handleReaction = async (msg, symbol) => {
    const existing = msg.reactions?.find(
      (r) => getId(r.user) === currentUser?._id,
    );

    const next = existing?.reaction === symbol ? null : symbol;

    // 🔥 1. Optimistic UI update (instant)
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== msg._id) return m;

        let reactions = m.reactions || [];

        if (next === null) {
          // remove reaction
          reactions = reactions.filter(
            (r) => getId(r.user) !== currentUser?._id,
          );
        } else if (existing) {
          // update existing reaction
          reactions = reactions.map((r) =>
            getId(r.user) === currentUser?._id ? { ...r, reaction: next } : r,
          );
        } else {
          // add new reaction
          reactions = [...reactions, { user: currentUser._id, reaction: next }];
        }

        return { ...m, reactions };
      }),
    );

    // 🔁 2. Sync with backend
    try {
      const res = await axios.post(
        `/groups/${group._id}/messages/${msg._id}/react`,
        { reaction: next },
      );

      // 🔄 3. Replace with server response (source of truth)
      if (res.data?.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msg._id ? res.data.data : m)),
        );
      }
    } catch (e) {
      console.error("React failed", e);

      //  Optional rollback if API fails
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    }
  };

  // Handle reaction from emoji picker
  const handleReactionEmojiClick = async (emojiData, messageId) => {
    const emoji = emojiData.emoji;
    const msg = messages.find((m) => m._id === messageId);
    if (!msg) return;

    const existing = msg.reactions?.find(
      (r) => getId(r.user) === currentUser?._id,
    );
    const next = existing?.reaction === emoji ? null : emoji;
    try {
      const res = await axios.post(
        `/groups/${group._id}/messages/${messageId}/react`,
        { reaction: next },
      );
      if (res.data?.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? res.data.data : m)),
        );
      }
    } catch (e) {
      console.error("React failed", e);
    }
    setShowReactionPicker(null);
  };

  // Get filtered members for mention suggestions
  const filteredMentionMembers = useMemo(() => {
    if (!group?.members || !mentionQuery) return group?.members || [];
    return group.members.filter(
      (member) =>
        member._id !== currentUser?._id &&
        member.name?.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [group?.members, mentionQuery, currentUser?._id]);

  // Handle mention selection
  const handleMentionSelect = useCallback((member) => {
    if (!inputRef.current) return;
    
    const beforeMention = newMessage.substring(0, mentionStartIndex);
    const afterMention = newMessage.substring(inputRef.current.selectionStart);
    const mentionText = `@${member.name} `;
    
    setNewMessage(beforeMention + mentionText + afterMention);
    setSelectedMentions((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.userId === member._id)) return prev;
      return [...prev, { userId: member._id, name: member.name }];
    });
    setShowMentionSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [newMessage, mentionStartIndex]);

  // Optimize input change handler with mention detection
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewMessage(value);
    
    // Detect @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Check if there's no space between @ and cursor (active mention)
      if (!textAfterAt.includes(" ")) {
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionSuggestions(true);
        return;
      }
    }
    
    setShowMentionSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  }, []);

  const handleKeyDownGroup = (e) => {
    if (isMobile) {
      // On mobile: Enter creates a new line, Send button sends the message
      // Do nothing - let Enter create new line naturally
      if (e.key === "Enter" && e.shiftKey) {
        // Allow normal behavior for Shift+Enter on mobile too
      }
    } else {
      // On desktop: Enter sends, Shift+Enter creates new line
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const form = e.target.closest("form");
        if (form) {
          form.dispatchEvent(new Event("submit", { bubbles: true }));
        }
      }
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(scrollHeight, 150); // Max 150px height
      textarea.style.height = `${newHeight}px`;
    }
  }, [newMessage]);

  // Voice recording functions
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
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioPreview(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Microphone access denied. Please enable microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <TiGroup size={64} className="mx-auto mb-4 text-gray-600" />
          <p>Select a group to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{reactionStyles}</style>
      <div className="flex-1 flex flex-col h-full ">
        {/* Desktop header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 ">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition "
            onClick={() => navigate(`/group/${group._id}`)}
          >
            <IoIosArrowBack
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
            />
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              {group.avatar ? (
                <img
                  src={group.avatar}
                  alt={group.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <TiGroup size={24} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">{group.name}</h3>
              <p className="text-gray-400 text-sm">
                {group.members?.length || 0} members
              </p>
            </div>
          </div>
          {isMobile ? (
            <div className="relative" ref={mobileMenuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`p-2 rounded-lg transition ${
                  settings.darkMode 
                    ? "hover:bg-zinc-700 text-gray-400 hover:text-white" 
                    : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                }`}
                title="More options"
              >
                {showMobileMenu ? (
                  <IoClose size={20} />
                ) : (
                  <CiMenuKebab size={20} />
                )}
              </button>
              {showMobileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMobileMenu(false)}
                  />
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 border ${
                    settings.darkMode 
                      ? "bg-zinc-800 border-gray-700" 
                      : "bg-white border-gray-200"
                  }`}>
                    {(isCreator || isAdmin) && (
                      <button
                        onClick={() => {
                          setShowEditGroup(true);
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 transition flex items-center gap-2 rounded-t-lg ${
                          settings.darkMode 
                            ? "text-gray-300 hover:bg-zinc-700 hover:text-white" 
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <MdEdit size={18} />
                        Edit Group
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onOpenInvite && onOpenInvite(group);
                        setShowMobileMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 transition flex items-center gap-2 ${
                        settings.darkMode 
                          ? "text-gray-300 hover:bg-zinc-700 hover:text-white" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <IoPersonAddOutline size={18} />
                      Add Members
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/group/${group._id}`);
                        setShowMobileMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 transition flex items-center gap-2 ${
                        settings.darkMode 
                          ? "text-gray-300 hover:bg-zinc-700 hover:text-white" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Users size={18} />
                      View Group Info
                    </button>
                    <button
                      onClick={() => {
                        handleLeaveGroup();
                        setShowMobileMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 transition flex items-center gap-2 rounded-b-lg ${
                        settings.darkMode 
                          ? "text-red-400 hover:bg-zinc-700 hover:text-red-300" 
                          : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                      }`}
                    >
                      <LogOut size={18} />
                      Leave Group
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative" ref={desktopMenuRef}>
              <button
                onClick={() => setShowDesktopMenu(!showDesktopMenu)}
                className={`p-2 rounded-lg transition ${
                  settings.darkMode 
                    ? "hover:bg-zinc-700 text-gray-400 hover:text-white" 
                    : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
                }`}
                title="More options"
              >
                {showDesktopMenu ? (
                  <IoClose size={20} />
                ) : (
                  <CiMenuKebab size={20} />
                )}
              </button>
              {showDesktopMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDesktopMenu(false)}
                  />
                  <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 border ${
                    settings.darkMode 
                      ? "bg-zinc-800 border-gray-700" 
                      : "bg-white border-gray-200"
                  }`}>
                    {(isCreator || isAdmin) && (
                      <button
                        onClick={() => {
                          setShowEditGroup(true);
                          setShowDesktopMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 transition flex items-center gap-2 rounded-t-lg ${
                          settings.darkMode 
                            ? "text-gray-300 hover:bg-zinc-700 hover:text-white" 
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <MdEdit size={18} />
                        Edit Group
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onOpenInvite && onOpenInvite(group);
                        setShowDesktopMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 transition flex items-center gap-2 ${
                        settings.darkMode 
                          ? "text-gray-300 hover:bg-zinc-700 hover:text-white" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <IoPersonAddOutline size={18} />
                      Add Members
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/group/${group._id}`);
                        setShowDesktopMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 transition flex items-center gap-2 ${
                        settings.darkMode 
                          ? "text-gray-300 hover:bg-zinc-700 hover:text-white" 
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Users size={18} />
                      View Group Info
                    </button>
                    <button
                      onClick={() => {
                        handleLeaveGroup();
                        setShowDesktopMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 transition flex items-center gap-2 rounded-b-lg ${
                        settings.darkMode 
                          ? "text-red-400 hover:bg-zinc-700 hover:text-red-300" 
                          : "text-red-600 hover:bg-gray-100 hover:text-red-700"
                      }`}
                    >
                      <LogOut size={18} />
                      Leave Group
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className={
                (isMobile ? "p-3" : "p-4") +
                " flex-1 overflow-y-auto space-y-3 scrollbar-hide"
              }
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {loading ? (
                <MessageSkeletonLoader count={4} />
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender?._id === currentUser?._id;
                  const hasImage = !!msg.image?.url;
                  const hasAudio = !!msg.audio?.url;
                  const hasContent = !!msg.content;
                  const messageTheme = settings.messageTheme || "default";
                  let messageClass = `rounded-2xl max-w-[88vw] sm:max-w-md md:max-w-xl ${
                    isOwn ? "rounded-br-md" : "rounded-bl-md"
                  }`;
                  if (hasContent || (hasContent && (hasImage || hasAudio))) {
                    messageClass += ` px-4 py-2 ${getGroupMessageThemeClasses(
                      messageTheme,
                      isOwn,
                      settings.darkMode,
                    )}`;
                  } else if (hasImage || hasAudio) {
                    messageClass += " p-0 bg-transparent";
                  }

                  // Gather reaction counts
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
                      key={msg._id || msg.tempId}
                      className={`my-3 flex flex-col group ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="relative">
                        <div
                          className={`flex gap-2 max-w-[90vw] sm:max-w-[72vw] ${
                            isOwn ? "flex-row-reverse" : ""
                          }`}
                        >
                          {!isOwn && (
                            <div className="flex flex-col items-center shrink-0">
                              <div className="w-9 h-9 rounded-full overflow-hidden mt-1">
                                {msg.sender?.profilePicture ? (
                                  <img
                                    src={msg.sender.profilePicture}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-600 flex items-center justify-center m-1">
                                    <FaCircleUser size={16} />
                                  </div>
                                )}
                              </div>
                              {/* <p className="text-xs text-gray-400 mt-1 text-center">
                              {msg.sender?.name}
                            </p> */}
                            </div>
                          )}
                          <div
                            className={`${isOwn ? "text-right" : "text-left"}`}
                          >
                            <div
                              className={`${messageClass} relative`}
                              onDoubleClick={() =>
                                handleMessageDoubleTap(msg._id)
                              }
                              onTouchStart={(e) => handleTouchStart(e, msg._id)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={(e) => handleTouchEnd(e, msg._id)}
                            >
                              {/* Forwarded Label */}
                              {msg.isForwarded && (
                                <div className={`flex items-center gap-1 text-xs mb-1 ${isOwn ? "text-blue-200" : "text-gray-400"}`}>
                                  <IoArrowRedo size={12} />
                                  <span className="italic">Forwarded</span>
                                </div>
                              )}
                              {msg.replyTo && (
                                <div
                                  className={`mb-2 pb-2 border-l-2 ${isOwn ? "border-blue-400" : "border-gray-500"} pl-2 text-xs`}
                                >
                                  <div
                                    className={`font-semibold ${isOwn ? "text-blue-200" : "text-gray-300"}`}
                                  >
                                    Replying to{" "}
                                    {typeof msg.replyTo?.sender === "object"
                                      ? msg.replyTo.sender.name
                                      : "user"}
                                  </div>
                                  <div
                                    className={`${isOwn ? "text-blue-100" : "text-gray-400"}`}
                                  >
                                    {msg.replyTo?.messageType === "image"
                                      ? "📷 Sent an image"
                                      : msg.replyTo?.messageType === "audio"
                                        ? "🎙️ Sent a voice message"
                                        : msg.replyTo?.content
                                          ? (msg.replyTo.content.length > 50
                                              ? msg.replyTo.content.substring(0, 50) + "..."
                                              : msg.replyTo.content)
                                          : "Message"}
                                  </div>
                                </div>
                              )}
                              {hasImage && (
                                <img
                                  src={msg.image.url}
                                  alt=""
                                  className={`max-w-full max-h-96 object-contain rounded-2xl ${
                                    hasContent ? "mb-2" : ""
                                  }`}
                                />
                              )}
                              {hasAudio && (
                                <div
                                  className={`${hasContent ? "mb-2" : "p-3"} ${!hasContent && getGroupAudioThemeClasses(messageTheme, isOwn, settings.darkMode)} rounded-2xl`}
                                >
                                  <AudioMessage
                                    src={msg.audio.url}
                                    isCurrentUser={isOwn}
                                    isDarkMode={settings.darkMode}
                                  />
                                </div>
                              )}
                              {hasContent &&
                                splitIntoLines(msg.content).map(
                                  (chunk, index) => (
                                    <div
                                      key={`${msg._id || msg.tempId}-chunk-${index}`}
                                      className="markdown-content prose prose-invert max-w-none"
                                      dangerouslySetInnerHTML={renderMarkdown(
                                        chunk,
                                        msg.mentions,
                                      )}
                                    />
                                  ),
                                )}

                                  {/* Three-dot menu and React button - Shows on hover */}
                            <div
                              className={`absolute ${
                                isOwn ? "-left-20" : "-right-20"
                              } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-100 flex items-center gap-1`}
                            >
                              {/* React button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowQuickReactions(
                                    showQuickReactions === msg._id
                                      ? null
                                      : msg._id,
                                  );
                                }}
                                className={`p-1.5 rounded-full transition-colors ${
                                  settings.darkMode
                                    ? "hover:bg-gray-700 text-gray-400 hover:text-white"
                                    : "hover:bg-gray-200 text-gray-500 hover:text-gray-800"
                                }`}
                                title="Add reaction"
                              >
                                <IoHappy size={18} />
                              </button>

                              {/* Quick Reactions Popup */}
                              {showQuickReactions === msg._id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowQuickReactions(null)}
                                  />
                                  <div
                                    className={`absolute z-50 ${
                                      isOwn ? "right-0" : "left-0"
                                    } bottom-full mb-2 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-lg flex items-center gap-1 ${
                                      settings.darkMode
                                        ? "bg-gray-800/95 border border-gray-700"
                                        : "bg-white/95 border border-gray-200"
                                    }`}
                                  >
                                    {REACTIONS.map((symbol) => {
                                      const mine = msg.reactions?.some(
                                        (r) =>
                                          getId(r.user) === currentUser?._id &&
                                          r.reaction === symbol,
                                      );
                                      return (
                                        <button
                                          key={symbol}
                                          type="button"
                                          className={`text-lg p-1.5 rounded-full transition-all hover:scale-125 cursor-pointer ${
                                            mine
                                              ? "bg-blue-600"
                                              : settings.darkMode
                                                ? "hover:bg-gray-700"
                                                : "hover:bg-gray-200"
                                          }`}
                                          onClick={() => {
                                            handleReaction(msg, symbol);
                                            setShowQuickReactions(null);
                                          }}
                                          title={
                                            mine
                                              ? "Remove reaction"
                                              : "Add reaction"
                                          }
                                        >
                                          {symbol}
                                        </button>
                                      );
                                    })}
                                    <div className={`w-px h-4 mx-1 ${settings.darkMode ? "bg-gray-600" : "bg-gray-300"}`}></div>
                                    <button
                                      type="button"
                                      data-reaction-button="true"
                                      className={`p-1 rounded-full transition-all ${
                                        settings.darkMode
                                          ? "text-gray-400 hover:text-white hover:bg-gray-700"
                                          : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
                                      }`}
                                      onClick={() =>
                                        setShowReactionPicker(msg._id)
                                      }
                                      title="More reactions"
                                    >
                                      <IoAddCircleOutline size={18} />
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* More options button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMessageMenu(
                                    showMessageMenu === msg._id
                                      ? null
                                      : msg._id,
                                  );
                                }}
                                className={`p-1.5 rounded-full transition-colors ${
                                  settings.darkMode
                                    ? "hover:bg-gray-700 text-gray-400 hover:text-white"
                                    : "hover:bg-gray-200 text-gray-500 hover:text-gray-800"
                                }`}
                                title="More options"
                              >
                                <IoEllipsisHorizontal size={18} />
                              </button>

                              {/* Dropdown Menu */}
                              {showMessageMenu === msg._id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-100"
                                    onClick={() => setShowMessageMenu(null)}
                                  />
                                  <div
                                    className={`absolute z-50 ${
                                      isOwn ? "left-0" : "right-0"
                                    } top-full mt-1 rounded-lg shadow-lg py-1 min-w-30 ${
                                      settings.darkMode
                                        ? "bg-gray-800 border border-gray-700"
                                        : "bg-white border border-gray-200"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleMenuReply(msg)}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                        settings.darkMode
                                          ? "text-white hover:bg-gray-700"
                                          : "text-gray-800 hover:bg-gray-100"
                                      }`}
                                    >
                                      <IoArrowUndo size={16} />
                                      Reply
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMenuForward(msg)}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                        settings.darkMode
                                          ? "text-white hover:bg-gray-700"
                                          : "text-gray-800 hover:bg-gray-100"
                                      }`}
                                    >
                                      <IoArrowRedo size={16} />
                                      Forward
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMenuCopy(msg)}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                        settings.darkMode
                                          ? "text-white hover:bg-gray-700"
                                          : "text-gray-800 hover:bg-gray-100"
                                      }`}
                                    >
                                      <IoCopyOutline size={16} />
                                      Copy
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Long Press Reaction Popup (Mobile Only) */}
                              {isMobile && showLongPressReactions?.messageId === msg._id && (
                                <>
                                  {/* Backdrop */}
                                  <div
                                    className="fixed inset-0 z-9998 bg-black/30"
                                    onClick={() => setShowLongPressReactions(null)}
                                  />
                                  {/* Reaction Popup */}
                                  <div
                                    data-reaction-popup="true"
                                    className={`fixed z-9999 flex flex-col items-center backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden ${
                                      settings.darkMode
                                        ? "bg-gray-900/95 border border-gray-700"
                                        : "bg-white/95 border border-gray-200"
                                    }`}
                                    style={{
                                      left: `${showLongPressReactions?.x ?? 0}px`,
                                      top: `${(showLongPressReactions?.y ?? 0) - 120}px`,
                                      transform: 'translateX(-50%)',
                                      minWidth: '220px'
                                    }}
                                  >
                                    {/* Reactions Row */}
                                    <div className="flex items-center gap-1 px-3 py-2">
                                      {REACTIONS.map((symbol) => {
                                        const mine = msg.reactions?.some(
                                          (r) =>
                                            getId(r.user) === currentUser?._id &&
                                            r.reaction === symbol
                                        );
                                        return (
                                          <button
                                            key={symbol}
                                            type="button"
                                            data-reaction-popup="true"
                                            className={`text-xl leading-none p-2 rounded-full transition-all active:scale-90 ${
                                              mine
                                                ? "bg-blue-600"
                                                : settings.darkMode
                                                  ? "hover:bg-gray-700"
                                                  : "hover:bg-gray-200"
                                            }`}
                                            onClick={() => {
                                              handleReaction(msg, symbol);
                                              setShowLongPressReactions(null);
                                            }}
                                          >
                                            {symbol}
                                          </button>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        data-reaction-popup="true"
                                        className={`p-2 rounded-full transition-all ${
                                          settings.darkMode
                                            ? "text-gray-400 active:text-white active:bg-gray-700"
                                            : "text-gray-500 active:text-gray-800 active:bg-gray-200"
                                        }`}
                                        onClick={() => {
                                          setShowReactionPicker(msg._id);
                                          setShowLongPressReactions(null);
                                        }}
                                        title="More reactions"
                                      >
                                        <IoAddCircleOutline size={20} />
                                      </button>
                                    </div>
                                    
                                    {/* Divider */}
                                    <div className={`w-full h-px ${settings.darkMode ? "bg-gray-700" : "bg-gray-200"}`}></div>
                                    
                                    {/* Action Buttons Row */}
                                    <div className="flex items-center justify-around w-full px-2 py-2">
                                      <button
                                        type="button"
                                        data-reaction-popup="true"
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-16 ${
                                          settings.darkMode
                                            ? "active:bg-gray-700"
                                            : "active:bg-gray-200"
                                        }`}
                                        onClick={() => {
                                          handleMenuReply(msg);
                                          setShowLongPressReactions(null);
                                        }}
                                      >
                                        <IoArrowUndo size={20} className={settings.darkMode ? "text-gray-300" : "text-gray-600"} />
                                        <span className={`text-xs ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}>Reply</span>
                                      </button>
                                      <button
                                        type="button"
                                        data-reaction-popup="true"
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-16 ${
                                          settings.darkMode
                                            ? "active:bg-gray-700"
                                            : "active:bg-gray-200"
                                        }`}
                                        onClick={() => {
                                          handleMenuForward(msg);
                                          setShowLongPressReactions(null);
                                        }}
                                      >
                                        <IoArrowRedo size={20} className={settings.darkMode ? "text-gray-300" : "text-gray-600"} />
                                        <span className={`text-xs ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}>Forward</span>
                                      </button>
                                      <button
                                        type="button"
                                        data-reaction-popup="true"
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all min-w-16 ${
                                          settings.darkMode
                                            ? "active:bg-gray-700"
                                            : "active:bg-gray-200"
                                        }`}
                                        onClick={() => {
                                          handleMenuCopy(msg);
                                          setShowLongPressReactions(null);
                                        }}
                                      >
                                        <IoCopyOutline size={20} className={settings.darkMode ? "text-gray-300" : "text-gray-600"} />
                                        <span className={`text-xs ${settings.darkMode ? "text-gray-400" : "text-gray-500"}`}>Copy</span>
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            </div>

                          
                            
                            {/* Reaction Counts */}
                            {Object.keys(reactionCounts).length > 0 && (
                              <div className={`-mt-3 flex ${isOwn ? "justify-end" : "justify-start"}`}>
                                <div className="z-10 flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-full">
                                  {Object.entries(reactionCounts).map(
                                    ([emoji, count]) => (
                                      <span
                                        key={`${msg._id || msg.tempId}-reaction-${emoji}`}
                                        className={`flex items-center ${count > 1 ? "mr-1" : ""}`}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-[10px]">
                                          {count>1 ? count : null}
                                        </span>
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            <div
                              className={`${
                                isOwn ? "text-right justify-end" : "text-left"
                              } mt-1 flex items-center gap-2 text-xs text-gray-500`}
                            >
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>

                              {/* Message status indicator (only for own messages) */}
                              {isOwn && settings.readReceipts && (
                                <span className="flex items-center">
                                  {msg.status === "sending" ? (
                                    <span
                                      className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"
                                      title="Sending"
                                    />
                                  ) : msg.status === "read" ||
                                    (msg.readBy && msg.readBy.length > 0) ? (
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
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Custom Emoji Picker for Reactions */}
                      {showReactionPicker === msg._id && (
                        <>
                          <div
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setShowReactionPicker(null)}
                          />
                          <div
                            ref={reactionPickerRef}
                            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            style={{ maxWidth: "350px" }}
                          >
                            <EmojiPicker
                              onEmojiClick={(emojiData) =>
                                handleReactionEmojiClick(emojiData, msg._id)
                              }
                              theme="dark"
                              searchDisabled={false}
                              height={isMobile ? 360 : 400}
                              width={isMobile ? 300 : 320}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className={
                (isMobile ? "p-2" : "p-4") + " border-t border-gray-700"
              }
            >
              {/* Reply Preview Panel */}
              {replyingTo && (
                <div className="mb-3 p-2 bg-gray-800 border-l-4 border-blue-500 rounded flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">
                      Replying to{" "}
                      {typeof replyingTo.sender === "object"
                        ? replyingTo.sender.name
                        : "user"}
                    </p>
                    <p className="text-sm text-gray-200 truncate">
                      {replyingTo.messageType === "image"
                        ? "📷 Sent an image"
                        : replyingTo.messageType === "audio"
                          ? "🎙️ Sent a voice message"
                          : replyingTo.content || "..."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="ml-2 text-gray-400 hover:text-white p-1"
                  >
                    <IoClose size={18} />
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-96 max-h-32 object-contain rounded-lg border border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition"
                  >
                    <IoClose size={16} />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              )}

              {/* Audio Preview */}
              {audioPreview && !isRecording && (
                <div className="mb-3 flex items-center gap-2 p-3 bg-zinc-700 rounded-lg border border-gray-600">
                  <AudioMessage
                    src={audioPreview}
                    isCurrentUser={true}
                    isDarkMode={true}
                  />
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition"
                  >
                    <IoClose size={16} />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 relative">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
                  title="Attach image"
                >
                  <IoImageOutline size={22} />
                </button>

                {!isMobile && (
                  <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-white transition"
                    onClick={() => setShowEmoji((v) => !v)}
                    data-emoji-button="true"
                    title="Add emoji"
                  >
                    <FaRegSmile size={22} className="cursor-pointer" />
                  </button>
                )}

                <button
                  type="button"
                  className={`p-2 transition ${
                    isRecording
                      ? "text-red-500 animate-pulse"
                      : "text-gray-400 hover:text-white"
                  }`}
                  onClick={isRecording ? stopRecording : startRecording}
                  title={
                    isRecording ? "Stop recording" : "Record voice message"
                  }
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
                    className="absolute bottom-14 left-0 z-50"
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
                      showToolbar
                        ? "text-blue-400"
                        : "text-gray-400 hover:text-white"
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
                      Tip: Select text and click a button to format, or click to
                      insert markers
                    </div>
                  </div>
                )}

                {/* Mention Suggestions Dropdown */}
                {showMentionSuggestions && filteredMentionMembers.length > 0 && (
                  <div
                    ref={mentionSuggestionsRef}
                    className="absolute bottom-14 left-0 z-50 w-64 max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg shadow-lg"
                  >
                    <div className="p-2 border-b border-gray-700 text-xs text-gray-400">
                      Tag a member
                    </div>
                    {filteredMentionMembers.slice(0, 6).map((member) => (
                      <button
                        key={member._id}
                        type="button"
                        onClick={() => handleMentionSelect(member)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center shrink-0">
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-medium">
                              {member.name?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <span className="text-white text-sm truncate">{member.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDownGroup}
                  placeholder="Type @ to mention..."
                  className="flex-1 min-w-0 text-white px-4 py-2 rounded-lg outline-none border border-gray-700 focus:border-blue-500 bg-transparent resize-none scroll-hide"
                  rows="1"
                  style={{
                    maxHeight: "40px",
                    overflowY: "auto",
                    minHeight: "40px",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedImage) || sending}
                  className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition flex items-center justify-center min-w-10"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <IoSend size={20} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Edit Group Modal */}
        <EditGroupModal
          isOpen={showEditGroup}
          group={group}
          currentUser={currentUser}
          onClose={() => setShowEditGroup(false)}
          onGroupUpdated={() => {
            if (onGroupUpdated) onGroupUpdated();
            setShowEditGroup(false);
          }}
          className="z-50"
        />

        {/* Forward Message Modal */}
        {showForwardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col shadow-2xl border border-gray-700">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Forward Message</h3>
                <button
                  type="button"
                  onClick={closeForwardModal}
                  className="p-1 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <IoClose size={24} />
                </button>
              </div>

              {/* Message Preview */}
              {messageToForward && (
                <div className="p-3 mx-4 mt-3 bg-gray-700/50 rounded-lg border border-gray-600">
                  <p className="text-xs text-gray-400 mb-1">Message to forward:</p>
                  <p className="text-sm text-white truncate">
                    {messageToForward.content || 
                     (messageToForward.image?.url ? '📷 Image' : 
                      messageToForward.audio?.url ? '🎙️ Voice message' : '')}
                  </p>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-gray-700 mx-4 mt-3">
                <button
                  type="button"
                  onClick={() => setForwardTab("friends")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    forwardTab === "friends"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Friends ({forwardRecipients.friends.length})
                </button>
                <button
                  type="button"
                  onClick={() => setForwardTab("groups")}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    forwardTab === "groups"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Groups ({forwardRecipients.groups.length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4">
                <div className="relative">
                  <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder={forwardTab === "friends" ? "Search contacts..." : "Search groups..."}
                    value={forwardSearchQuery}
                    onChange={(e) => setForwardSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Recipients List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoadingForward ? (
                  // Loading state
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 text-sm">Loading contacts...</p>
                  </div>
                ) : forwardTab === "friends" ? (
                  // Friends List
                  filteredFriends.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      {forwardSearchQuery ? 'No contacts found' : 'No contacts available'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFriends.map((friend) => (
                        <button
                          key={friend._id}
                          type="button"
                          onClick={() => handleForwardToFriend(friend)}
                          disabled={isForwarding}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                            {friend.profilePicture ? (
                              <img 
                                src={friend.profilePicture} 
                                alt={friend.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-lg font-medium">
                                {friend.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            )}
                          </div>
                          {/* Name and Email */}
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium truncate">{friend.name}</p>
                            <p className="text-gray-400 text-sm truncate">{friend.email}</p>
                          </div>
                          {/* Forward Arrow */}
                          <IoArrowRedo size={20} className="text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  // Groups List
                  filteredGroups.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      {forwardSearchQuery ? 'No groups found' : 'No other groups available'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredGroups.map((g) => (
                        <button
                          key={g._id}
                          type="button"
                          onClick={() => handleForwardToGroup(g)}
                          disabled={isForwarding}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {/* Group Avatar */}
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                            {g.avatar ? (
                              <img 
                                src={g.avatar} 
                                alt={g.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <TiGroup size={20} className="text-white" />
                            )}
                          </div>
                          {/* Group Name and Member Count */}
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium truncate">{g.name}</p>
                            <p className="text-gray-400 text-sm">{g.members?.length || 0} members</p>
                          </div>
                          {/* Forward Arrow */}
                          <IoArrowRedo size={20} className="text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Loading Indicator */}
              {isForwarding && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* </div> */}
    </>
  );
};

export default GroupChat;
