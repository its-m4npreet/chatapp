import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Sidebar.css';
import { FaCircleUser } from "react-icons/fa6";
import { MdOutlineSettings,MdPersonAddAlt1  } from "react-icons/md";
import { IoChatboxEllipses, IoNotifications } from "react-icons/io5";
import { TiGroup } from "react-icons/ti";
import axios from '../lib/axios';
import socket from '../lib/socket';
import { ContentLoading, FriendsSkeletonLoader, GroupsSkeletonLoader } from './Loading';
import { useSettings } from '../context/useSettings';

const Sidebar = ({ onSelectUser, selectedUser, unreadCounts = {}, onProfileClick, showProfile, onSettingsClick, showSettings, onTabChange, viewingUserProfile, onlineUsers = [], refreshFriends, onNotificationClick, unreadNotifications = 0, groups = [], selectedGroup, onSelectGroup, onCreateGroup, externalActiveTab, isMobile, mobileSearchQuery = '' }) => {
  const { settings } = useSettings();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastMessages, setLastMessages] = useState({}); // Store last message for each user
  const [internalActiveTab, setInternalActiveTab] = useState('chats'); // 'chats' or 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const prevRefreshFriends = useRef(refreshFriends);

  // Use mobile search query if on mobile, otherwise use internal search
  const effectiveSearchQuery = isMobile ? mobileSearchQuery : searchQuery;

  // Use externalActiveTab if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = (tab) => {
    setInternalActiveTab(tab);
  };

  // Function to format last seen time
  const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "";

  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) return "Just now";
  if (diffMinutes < 1) return "Active recently";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return lastSeenDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};


  // Check if viewing another user's profile (from chat)
  const isViewingOtherUserProfile = showProfile && viewingUserProfile;

  // Function to fetch last message for a user
  const fetchLastMessageForUser = async (userId) => {
    try {
      const res = await axios.get(`/messages/last/${userId}`);
      if (res.data.lastMessage) {
        setLastMessages(prev => ({
          ...prev,
          [userId]: res.data.lastMessage
        }));
      }
    } catch {
      console.log(`No messages found for user ${userId}`);
    }
  };

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/friends');
      const friendsList = res.data.friends || [];
      setUsers(friendsList);
      
      // Fetch last message for each friend
      friendsList.forEach(friend => {
        fetchLastMessageForUser(friend._id);
      });
      
      setLoading(false);
    } catch {
      setError("Failed to load friends");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFriends = async () => {
      try {
        // Check if token exists before making request
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          console.log('No token available, skipping friend load');
          return;
        }
        
        setLoading(true);
        const res = await axios.get('/friends');
        if (isMounted) {
          const friendsList = res.data.friends || [];
          setUsers(friendsList);
          setError("");
          
          // Fetch last message for each friend
          friendsList.forEach(friend => {
            fetchLastMessageForUser(friend._id);
          });
        }
      } catch {
        if (isMounted) {
          setError("Failed to load friends");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFriends();

    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh friends list when refreshFriends prop changes (not on initial render)
  useEffect(() => {
    if (prevRefreshFriends.current !== refreshFriends && refreshFriends > 0) {
      fetchFriends();
    }
    prevRefreshFriends.current = refreshFriends;
  }, [refreshFriends, fetchFriends]);

  // Listen for new messages and update last message in sidebar
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Update the last message for the sender or receiver
      const otherUserId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      
      setLastMessages(prev => ({
        ...prev,
        [otherUserId]: {
          content: msg.content || '',
          messageType: msg.messageType,
          createdAt: msg.createdAt || new Date().toISOString(),
          sender: msg.sender,
          receiver: msg.receiver,
          _id: msg._id
        }
      }));
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, []);

  // Filter users based on search query and sort by unread messages first, then by most recent message
  const filteredUsers = users
    .filter((user) =>
      user.name.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(effectiveSearchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const unreadA = unreadCounts[a._id] || 0;
      const unreadB = unreadCounts[b._id] || 0;
      
      // Sort by unread count (descending) - users with unread messages first
      if (unreadA !== unreadB) {
        return unreadB - unreadA;
      }
      
      // If same unread count, sort by most recent message timestamp
      const lastMessageA = lastMessages[a._id];
      const lastMessageB = lastMessages[b._id];
      
      const timestampA = lastMessageA?.createdAt ? new Date(lastMessageA.createdAt).getTime() : 0;
      const timestampB = lastMessageB?.createdAt ? new Date(lastMessageB.createdAt).getTime() : 0;
      
      // Sort by most recent message first (descending)
      if (timestampA !== timestampB) {
        return timestampB - timestampA;
      }
      
      // If no messages or same timestamp, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

  const handleChatClick = (user) => {
    if (onSelectUser) onSelectUser(user);
  };

  const renderChat = (user) => {
    const unreadCount = unreadCounts[user._id] || 0;
    const isOnline = onlineUsers.includes(user._id);
    const lastMessage = lastMessages[user._id];
    
    // Format last message text
    const getMessagePreview = () => {
      if (!lastMessage) return "No messages yet";
      
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
      
      // Truncate if too long
      return messageText.length > 40 ? messageText.substring(0, 40) + '...' : messageText;
    };
    
    return (
      <div
        className={`sidebar-chat${selectedUser && selectedUser._id === user._id ? ' sidebar-chat-active' : ''}`}
        key={user._id}
        onClick={() => handleChatClick(user)}
        style={{ cursor: 'pointer' }}
      >
        <div className="chat-avatar" style={{ position: 'relative' }}>
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">
              <FaCircleUser size={24} />
            </div>
          )}
          {/* Online status indicator */}
          {isOnline && settings.onlineStatus && (
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
            <span className="chat-message">{getMessagePreview()}</span>

              <div className="chat-timestamp">
          {/* Placeholder for timestamp or last message time if needed */}
           <span className="last-seen text-sm text-gray-400">
      {formatLastSeen(user.lastSeen)}
    </span>
        </div>
          </div>
        </div>
        
      </div>
    );
  };

  // Determine current active section for indicator position
  const getActiveSection = () => {
    if (showSettings) return 'settings';
    if (showProfile && !isViewingOtherUserProfile) return 'profile';
    if (activeTab === 'notifications' && !showProfile && !showSettings) return 'notifications';
    if (activeTab === 'groups' && !showProfile && !showSettings) return 'groups';
    if (activeTab === 'adduser' && !showProfile && !showSettings) return 'adduser';
    return 'chats'; // Default to chats (also when viewing other user's profile)
  };

  const activeSection = getActiveSection();

  return (
    <>
      {/* Left icon rail: hidden on mobile, shown from md+ */}
      <div className={` ${!isMobile ? 'border-r border-gray-700' : ''} w-16 md:flex flex-col items-center py-6 h-full relative hidden`}>
        {/* Top icons */}
        <div className="flex flex-col gap-6 relative">
          <div className="relative group" data-section="chats">
            <IoChatboxEllipses 
              size={22} 
              className={`${activeSection === 'chats' ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer transition-colors duration-200`} 
              title='chat'
              onClick={() => {
                setActiveTab('chats');
                if (onTabChange) onTabChange('chats');
              }}
            />
            <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out pointer-events-none ${activeSection === 'chats' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
          </div>
          <div className="relative group" data-section="groups">
            <TiGroup 
              size={22} 
              className={`${activeSection === 'groups' ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer transition-colors duration-200`} 
              title='group'
              onClick={() => {
                setActiveTab('groups');
                if (onTabChange) onTabChange('groups');
              }}
            />
            <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out pointer-events-none ${activeSection === 'groups' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
          </div>
           <div className="relative group" data-section="adduser">
            <MdPersonAddAlt1  
              size={22} 
              className={`${activeSection === 'adduser' ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer transition-colors duration-200`} 
              title='add user'
              onClick={() => {
                setActiveTab('adduser');
                if (onTabChange) onTabChange('adduser');
              }}
            />
            <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out pointer-events-none ${activeSection === 'adduser' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
          </div>
          <div className="relative group" data-section="notifications">
            <div className="relative">
              <IoNotifications 
                size={22} 
                className={`${activeSection === 'notifications' ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer transition-colors duration-200`} 
                title='notifications'
                onClick={onNotificationClick}
              />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </div>
            <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out pointer-events-none ${activeSection === 'notifications' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
          </div>
        </div>
        <div className="flex-1" />
        {/* Bottom icons */}
        <div className="flex flex-col gap-6">
          <div className="relative group cursor-pointer" data-section="settings" onClick={onSettingsClick}>
            <MdOutlineSettings 
              size={22} 
              className={`${activeSection === 'settings' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors duration-200`} 
              title='settings'
            />
            <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out pointer-events-none ${activeSection === 'settings' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
          </div>
          <div className="relative group cursor-pointer" data-section="profile" onClick={onProfileClick}>
            <FaCircleUser 
              size={22} 
              className={`${activeSection === 'profile' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors duration-200`} 
              title='user'
            />
            <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out pointer-events-none ${activeSection === 'profile' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
          </div>
        </div>
      </div>

      {/* Main sidebar */}
      <div className={`sidebar w-full md:w-auto ${isMobile ? 'pb-20' : ''}`}>
        {/* Hide header on mobile since we have top header in home.jsx */}
        {!isMobile && (
          <div className="sidebar-header">
            <input 
              type="text" 
              placeholder="Search users..." 
              className="sidebar-search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search users"
            />
            {/* Desktop top icons row (hidden on mobile) */}
            <div className="hidden items-center gap-5 py-2 border-b border-gray-700">
              <button
                aria-label="Chats"
                className={`${activeSection === 'chats' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
                onClick={() => {
                  setActiveTab('chats');
                  if (onTabChange) onTabChange('chats');
                }}
                title="Chats"
              >
                <IoChatboxEllipses size={22} />
              </button>
              <button
                aria-label="Groups"
                className={`${activeSection === 'groups' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
                onClick={() => {
                  setActiveTab('groups');
                  if (onTabChange) onTabChange('groups');
                }}
                title="Groups"
              >
                <TiGroup size={22} />
              </button>
              <button
                aria-label="Add user"
                className={`${activeSection === 'adduser' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
                onClick={() => {
                  setActiveTab('adduser');
                  if (onTabChange) onTabChange('adduser');
                }}
                title="Add user"
              >
                <MdPersonAddAlt1 size={22} />
              </button>
              <button
                aria-label="Notifications"
                className="relative text-gray-400 hover:text-white transition-colors"
                onClick={onNotificationClick}
                title="Notifications"
              >
                <IoNotifications size={22} />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
              <div className="ml-auto flex items-center gap-4">
                <button
                  aria-label="Settings"
                  className={`${activeSection === 'settings' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
                  onClick={onSettingsClick}
                  title="Settings"
                >
                  <MdOutlineSettings size={22} />
                </button>
                <button
                  aria-label="Profile"
                  className={`${activeSection === 'profile' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
                  onClick={onProfileClick}
                  title="Profile"
                >
                  <FaCircleUser size={22} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List area */}
        {activeTab === 'chats' ? (
          <div className="sidebar-section md:mt-0">
            {!isMobile && (
              <div className="section-title">Chats</div>
            )}
            {loading ? (
              <FriendsSkeletonLoader count={5} />
            ) : error ? (
              <div className="sidebar-error">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4 scroll-hide">
                {searchQuery ? 'No friends found' : 'No friends yet. Add users to start chatting!'}
              </div>
            ) : (
              filteredUsers.map(renderChat)
            )}
          </div>
        ) : (
          <div className="sidebar-section md:mt-0">
            {!isMobile && (
              <div className="section-title">Groups</div>
              )}
            
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <TiGroup size={48} className="mb-3 text-gray-600" />
                <p className="text-sm">No groups yet</p>
                <button 
                  onClick={onCreateGroup}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Create Group
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={onCreateGroup}
                  className="w-full mb-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                >
                  <TiGroup size={18} />
                  Create Group
                </button>
                {groups.map((group) => (
                  <div
                    key={group._id}
                    className={`sidebar-chat scroll-hide ${selectedGroup && selectedGroup._id === group._id ? ' sidebar-chat-active' : ''}`}
                    onClick={() => onSelectGroup && onSelectGroup(group)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="chat-avatar">
                      {group.avatar ? (
                        <img src={group.avatar} alt={group.name} className="avatar-img" />
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
                        <span className="chat-message text-gray-400">{group.members?.length || 0} members</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
