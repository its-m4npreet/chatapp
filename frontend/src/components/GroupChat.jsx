import React, { useState, useEffect, useRef } from "react";
import {
  IoClose,
  IoSend,
  IoImageOutline,
  IoSettingsOutline,
  IoPersonAddOutline,
} from "react-icons/io5";
import { MdEdit } from "react-icons/md";
import { TiGroup } from "react-icons/ti";
import { FaCircleUser } from "react-icons/fa6";
import axios from "../lib/axios";
import { ContentLoading, ButtonLoading } from "./Loading";
import EditGroupModal from "./EditGroupModal";
import { FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

const GroupChat = ({
  group,
  socket,
  currentUser,
  onClose,
  onOpenInvite,
  onGroupUpdated,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isCreator = group?.creator?._id === currentUser?._id;
  const isAdmin = group?.admins?.some((a) => a._id === currentUser?._id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages
  useEffect(() => {
    if (!group?._id) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/groups/${group._id}/messages`);
        setMessages(res.data.messages || []);
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Failed to fetch group messages:", error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [group?._id]);

  // Listen for new group messages
  useEffect(() => {
    if (!socket || !group?._id) return;

    const handleNewGroupMessage = ({ groupId, message }) => {
      if (groupId === group._id) {
        setMessages((prev) => [...prev, message]);
        setTimeout(scrollToBottom, 100);
      }
    };

    socket.on("newGroupMessage", handleNewGroupMessage);
    return () => {
      socket.off("newGroupMessage", handleNewGroupMessage);
    };
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
    if ((!newMessage.trim() && !selectedImage) || sending) return;

    setSending(true);
    setIsUploading(!!imagePreview);

    try {
      let imageUrl = null;

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

      await axios.post("/groups/message", {
        groupId: group._id,
        content: newMessage.trim(),
        image: imageUrl,
      });

      setNewMessage("");
      handleRemoveImage();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
    setIsUploading(false);
    setSending(false);
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      await axios.post(`/groups/${group._id}/leave`);
      if (onGroupUpdated) onGroupUpdated();
      if (onClose) onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this group? This action cannot be undone."
      )
    )
      return;

    try {
      await axios.delete(`/groups/${group._id}`);
      if (onGroupUpdated) onGroupUpdated();
      if (onClose) onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete group");
    }
  };
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

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    if (inputRef.current) inputRef.current.focus();
    // Do not close the picker on emoji select
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
    <div className="flex-1 flex flex-col h-full ">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 ">
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-3">
          {(isCreator || isAdmin) && (
            <button
              onClick={() => setShowEditGroup(true)}
              className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
              title="Edit group"
            >
              <MdEdit size={20} />
            </button>
          )}
          <button
            onClick={() => onOpenInvite && onOpenInvite(group)}
            className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
            title="Invite members"
          >
            <IoPersonAddOutline size={20} />
          </button>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
            title="View members"
          >
            <IoSettingsOutline size={20} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
            >
              <IoClose size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {loading ? (
              <ContentLoading text="Loading messages..." />
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender?._id === currentUser?._id;
                const hasImage = !!msg.image?.url;
                const hasContent = !!msg.content;
                let messageClass = `rounded-2xl ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`;
                if (hasContent || (hasContent && hasImage)) {
                  messageClass += ` px-4 py-2 ${isOwn ? "bg-blue-600 text-white" : "bg-zinc-700 text-white"}`;
                } else if (hasImage) {
                  messageClass += " p-0 bg-transparent";
                }
                return (
                  <div
                    key={msg._id}
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-2 max-w-[70%] ${
                        isOwn ? "flex-row-reverse" : ""
                      }`}
                    >
                      {!isOwn && (
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden mt-1">
                            {msg.sender?.profilePicture ? (
                              <img
                                src={msg.sender.profilePicture}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                <FaCircleUser size={16} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 text-center">
                            {msg.sender?.name}
                          </p>
                        </div>
                      )}
                      <div className={`${isOwn ? "text-right" : "text-left"}`}>
                        <div className={messageClass}>
                          {hasImage && (
                            <img
                              src={msg.image.url}
                              alt=""
                              className={`max-w-full max-h-96 object-contain rounded-2xl ${hasContent ? "mb-2" : ""}`}
                            />
                          )}
                          {hasContent && <p>{msg.content}</p>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 "
          >
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

            <div className="flex items-center gap-3 relative">
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

              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white transition"
                onClick={() => setShowEmoji((v) => !v)}
                data-emoji-button="true"
                title="Add emoji"
              >
                <FaRegSmile size={22} className="cursor-pointer" />
              </button>

              {showEmoji && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-14 left-0 z-50"
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
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-white px-4 py-2 rounded-lg outline-none border border-gray-700 focus:border-blue-500 bg-transparent"
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

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-700 bg-zinc-800 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-white font-semibold mb-4">
                Members ({group.members?.length})
              </h4>
              <div className="space-y-2">
                {group.members?.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-700"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {member.profilePicture ? (
                        <img
                          src={member.profilePicture}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <FaCircleUser size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {member.name}
                      </p>
                      {group.creator?._id === member._id && (
                        <span className="text-xs text-blue-400">Creator</span>
                      )}
                      {group.admins?.some((a) => a._id === member._id) &&
                        group.creator?._id !== member._id && (
                          <span className="text-xs text-green-400">Admin</span>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Group Actions */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                {group.creator?._id === currentUser?._id ? (
                  <button
                    onClick={handleDeleteGroup}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Delete Group
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveGroup}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Leave Group
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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
      />
    </div>
  );
};

export default GroupChat;