import React, { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import { FaCircleUser } from "react-icons/fa6";
import { MdOutlineSettings,MdPersonAddAlt1  } from "react-icons/md";
import { IoChatboxEllipses, IoNotifications } from "react-icons/io5";
import { TiGroup } from "react-icons/ti";
import axios from '../lib/axios';
import { ContentLoading } from './Loading';

const Sidebar = ({ onSelectUser, selectedUser, unreadCounts = {}, onProfileClick, showProfile, onSettingsClick, showSettings, onTabChange, viewingUserProfile, onlineUsers = [], refreshFriends, onNotificationClick, unreadNotifications = 0, groups = [], selectedGroup, onSelectGroup, onCreateGroup, externalActiveTab }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [internalActiveTab, setInternalActiveTab] = useState('chats'); // 'chats' or 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const prevRefreshFriends = useRef(refreshFriends);

  // Use externalActiveTab if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = (tab) => {
    setInternalActiveTab(tab);
  };

  // Check if viewing another user's profile (from chat)
  const isViewingOtherUserProfile = showProfile && viewingUserProfile;

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/friends');
      setUsers(res.data.friends || []);
      setLoading(false);
    } catch {
      setError("Failed to load friends");
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadFriends = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/friends');
        if (isMounted) {
          setUsers(res.data.friends || []);
          setError("");
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
  }, [refreshFriends]);

  // Filter users based on search query
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatClick = (user) => {
    if (onSelectUser) onSelectUser(user);
  };

  const renderChat = (user) => {
    const unreadCount = unreadCounts[user._id] || 0;
    const isOnline = onlineUsers.includes(user._id);
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
          {isOnline && (
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
            <span className="chat-message">{user.email}</span>
          </div>
        </div>
      </div>
    );
  };

  // Determine current active section for indicator position
  const getActiveSection = () => {
    if (showSettings) return 'settings';
    if (showProfile && !isViewingOtherUserProfile) return 'profile';
    if (activeTab === 'groups' && !showProfile && !showSettings) return 'groups';
    if (activeTab === 'adduser' && !showProfile && !showSettings) return 'adduser';
    return 'chats'; // Default to chats (also when viewing other user's profile)
  };

  const activeSection = getActiveSection();

  return (
    <>
      <div className="border-r w-16 border-gray-700 flex flex-col items-center py-6 h-full relative">
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
          <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out ${activeSection === 'chats' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
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
          <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out ${activeSection === 'groups' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
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
          <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out ${activeSection === 'adduser' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
        </div>
        <div className="relative group" data-section="notifications">
          <div className="relative">
            <IoNotifications 
              size={22} 
              className="text-gray-400 hover:text-white cursor-pointer transition-colors duration-200" 
              title='notifications'
              onClick={onNotificationClick}
            />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </div>
        </div>
  </div>

  {/* Spacer to push bottom icons down */}
  <div className="flex-1" />

  {/* Bottom icons */}
  <div className="flex flex-col gap-6">
    <div className="relative group" data-section="settings">
      <MdOutlineSettings 
        size={22} 
        className={`${activeSection === 'settings' ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer transition-colors duration-200`} 
        title='settings' 
        onClick={onSettingsClick}
      />
      <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out ${activeSection === 'settings' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
    </div>
    <div className="relative group" data-section="profile">
      <FaCircleUser 
        size={22} 
        className={`${activeSection === 'profile' ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer transition-colors duration-200`} 
        title='user' 
        onClick={onProfileClick}
      />
      <span className={`absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r transition-all duration-300 ease-out ${activeSection === 'profile' ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0'}`}></span>
    </div>
  </div>

  {/* Current section indicator */}
  {/* <div className="text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-2">
    {getActiveSectionName()}
  </div> */}
</div>
      <div className="sidebar">
        <div className="sidebar-header">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="sidebar-search" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* <div className="sidebar-stories">
          <div className="stories-list">
            {["Mike", "Brand", "Jim Katt", "Steven", "Helia","jbsjq","add"].map((user, idx) => (
              <div className="story-avatar" key={idx}>
                <div className="avatar-circle" />
                <span className="story-name">{user}</span>
              </div>
            ))}
          </div>
        </div> */}
        
        {activeTab === 'chats' ? (
          <div className="sidebar-section">
            <div className="section-title">Chats</div>
            {loading ? (
              <ContentLoading text="Loading friends..." />
            ) : error ? (
              <div className="sidebar-error">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                {searchQuery ? 'No friends found' : 'No friends yet. Add users to start chatting!'}
              </div>
            ) : (
              filteredUsers.map(renderChat)
            )}
          </div>
        ) : (
          <div className="sidebar-section">
            <div className="section-title">Groups</div>
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
                    className={`sidebar-chat${selectedGroup && selectedGroup._id === group._id ? ' sidebar-chat-active' : ''}`}
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
