
import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { FaCircleUser } from "react-icons/fa6";
import { MdOutlineSettings } from "react-icons/md";
import { IoChatboxEllipsesOutline } from "react-icons/io5";
import { TiGroup } from "react-icons/ti";
import axios from '../lib/axios';

const Sidebar = ({ onSelectUser, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleChatClick = (user) => {
    if (onSelectUser) onSelectUser(user);
  };

  const renderChat = (user) => (
    <div
      className={`sidebar-chat${selectedUser && selectedUser._id === user._id ? ' sidebar-chat-active' : ''}`}
      key={user._id}
      onClick={() => handleChatClick(user)}
      style={{ cursor: 'pointer' }}
    >
      <div className="chat-avatar">
        {user.profilePicture ? (
          <img src={user.profilePicture} alt={user.name} className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">
            <FaCircleUser size={24} />
          </div>
        )}
        {/* You can add online status if you track it */}
      </div>
      <div className="chat-info">
        <div className="chat-name-row">
          <span className="chat-name">{user.name}</span>
        </div>
        <div className="chat-message-row">
          <span className="chat-message">{user.email}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="border-r w-16 border-gray-700 flex flex-col items-center py-6 h-full">
  {/* Top icons */}
  <div className="flex flex-col gap-6">
        <IoChatboxEllipsesOutline  size={22} className="text-gray-400 hover:text-white cursor-pointer" title='chat' />
        <TiGroup size={22} className="text-gray-400 hover:text-white cursor-pointer" title='group'/>
  </div>

  {/* Spacer to push bottom icons down */}
  <div className="flex-1" />

  {/* Bottom icons */}
  <div className="flex flex-col gap-6 mb-3">
    <FaCircleUser size={22} className="text-gray-400 hover:text-white cursor-pointer" title='user' />
    <MdOutlineSettings size={22} className="text-gray-400 hover:text-white cursor-pointer" title='settings' />
  </div>
</div>
      <div className="sidebar">
        <div className="sidebar-header">
          <input type="text" placeholder="Search" className="sidebar-search" />
        </div>
        <div className="sidebar-stories">
          {/* Stories Avatars */}
          <div className="stories-list">
            {["Mike", "Brand", "Jim Katt", "Steven", "Helia","jbsjq","add"].map((user, idx) => (
              <div className="story-avatar" key={idx}>
                <div className="avatar-circle" />
                <span className="story-name">{user}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sidebar-section">
          <div className="section-title">Users</div>
          {loading ? (
            <div className="sidebar-loading">Loading users...</div>
          ) : error ? (
            <div className="sidebar-error">{error}</div>
          ) : (
            users.map(renderChat)
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
