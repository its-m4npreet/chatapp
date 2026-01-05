import React, { useState, useEffect, useRef } from 'react';
import { IoClose, IoSend, IoImageOutline, IoSettingsOutline, IoPersonAddOutline } from 'react-icons/io5';
import { TiGroup } from 'react-icons/ti';
import { FaCircleUser } from 'react-icons/fa6';
import axios from '../lib/axios';
import { ContentLoading } from './Loading';

const GroupChat = ({ 
  group, 
  socket, 
  currentUser, 
  onClose,
  onOpenInvite,
  onGroupUpdated 
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        console.error('Failed to fetch group messages:', error);
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

    socket.on('newGroupMessage', handleNewGroupMessage);
    return () => {
      socket.off('newGroupMessage', handleNewGroupMessage);
    };
  }, [socket, group?._id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await axios.post('/groups/message', {
        groupId: group._id,
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    setSending(false);
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      await axios.post(`/groups/${group._id}/leave`);
      if (onGroupUpdated) onGroupUpdated();
      if (onClose) onClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to leave group');
    }
  };

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-900 text-gray-400">
        <div className="text-center">
          <TiGroup size={64} className="mx-auto mb-4 text-gray-600" />
          <p>Select a group to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            {group.avatar ? (
              <img src={group.avatar} alt={group.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <TiGroup size={24} className="text-white" />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">{group.name}</h3>
            <p className="text-gray-400 text-sm">{group.members?.length || 0} members</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <ContentLoading text="Loading messages..." />
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.sender?._id === currentUser?._id;
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          {msg.sender?.profilePicture ? (
                            <img src={msg.sender.profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                              <FaCircleUser size={16} />
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        {!isOwn && (
                          <p className="text-xs text-gray-400 mb-1">{msg.sender?.name}</p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-zinc-700 text-white rounded-bl-md'
                          }`}
                        >
                          {msg.image?.url && (
                            <img src={msg.image.url} alt="" className="max-w-full rounded-lg mb-2" />
                          )}
                          {msg.content && <p>{msg.content}</p>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
              >
                <IoImageOutline size={22} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded-lg outline-none border border-gray-700 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition"
              >
                <IoSend size={20} />
              </button>
            </div>
          </form>
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-700 bg-zinc-800 overflow-y-auto">
            <div className="p-4">
              <h4 className="text-white font-semibold mb-4">Members ({group.members?.length})</h4>
              <div className="space-y-2">
                {group.members?.map((member) => (
                  <div key={member._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-700">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {member.profilePicture ? (
                        <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <FaCircleUser size={16} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{member.name}</p>
                      {group.creator?._id === member._id && (
                        <span className="text-xs text-blue-400">Creator</span>
                      )}
                      {group.admins?.some(a => a._id === member._id) && group.creator?._id !== member._id && (
                        <span className="text-xs text-green-400">Admin</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {group.creator?._id !== currentUser?._id && (
                <button
                  onClick={handleLeaveGroup}
                  className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Leave Group
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChat;
