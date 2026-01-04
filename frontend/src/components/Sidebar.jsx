
import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { FaCircleUser } from "react-icons/fa6";
import { MdOutlineSettings } from "react-icons/md";
import { IoChatboxEllipsesOutline } from "react-icons/io5";
import { TiGroup } from "react-icons/ti";
import axios from '../lib/axios';

const Sidebar = ({ onSelectUser, selectedUser, unreadCounts = {}, onProfileClick, showProfile, onSettingsClick, showSettings, onTabChange }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'groups'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/users');
        setUsers(res.data.users);
        setLoading(false);
      } catch {
        setError("Failed to load users");
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

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
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
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
        <div className="chat-info">
          <div className="chat-name-row">
            <span className="chat-name">{user.name}</span>
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
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

  // Determine current active section name
  // const getActiveSectionName = () => {
  //   if (showProfile) return 'Profile';
  //   if (showSettings) return 'Settings';
  //   if (activeTab === 'groups') return 'Groups';
  //   return 'Chats';
  // };

  return (
    <>
      <div className="border-r w-16 border-gray-700 flex flex-col items-center py-6 h-full">
  {/* Top icons */}
  <div className="flex flex-col gap-6">
        <div className="relative group">
          <IoChatboxEllipsesOutline 
            size={22} 
            className={`${activeTab === 'chats' && !showProfile && !showSettings ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer`} 
            title='chat'
            onClick={() => {
              setActiveTab('chats');
              if (onTabChange) onTabChange();
            }}
          />
          {activeTab === 'chats' && !showProfile && !showSettings && (
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r"></span>
          )}
        </div>
        <div className="relative group">
          <TiGroup 
            size={22} 
            className={`${activeTab === 'groups' && !showProfile && !showSettings ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer`} 
            title='group'
            onClick={() => {
              setActiveTab('groups');
              if (onTabChange) onTabChange();
            }}
          />
          {activeTab === 'groups' && !showProfile && !showSettings && (
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r"></span>
          )}
        </div>
  </div>

  {/* Spacer to push bottom icons down */}
  <div className="flex-1" />

  {/* Bottom icons */}
  <div className="flex flex-col gap-6 mb-3 border border-t-gray-700">
    <div className="relative group">
      <MdOutlineSettings 
        size={22} 
        className={`${showSettings ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer`} 
        title='settings' 
        onClick={onSettingsClick}
      />
      {showSettings && (
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r"></span>
      )}
    </div>
    <div className="relative group">
      <FaCircleUser 
        size={22} 
        className={`${showProfile ? 'text-white' : 'text-gray-400'} hover:text-white cursor-pointer`} 
        title='user' 
        onClick={onProfileClick}
      />
      {showProfile && (
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-5 bg-blue-500 rounded-r"></span>
      )}
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
            <div className="section-title">Users</div>
            {loading ? (
              <div className="sidebar-loading">Loading users...</div>
            ) : error ? (
              <div className="sidebar-error">{error}</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">
                {searchQuery ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map(renderChat)
            )}
          </div>
        ) : (
          <div className="sidebar-section">
            <div className="section-title">Groups</div>
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <TiGroup size={48} className="mb-3 text-gray-600" />
              <p className="text-sm">No groups yet</p>
              <button 
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
