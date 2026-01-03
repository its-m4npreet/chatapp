// import React, { useState } from 'react';
import './Sidebar.css';
import { FaCircleUser } from "react-icons/fa6";
import { MdOutlineSettings } from "react-icons/md";
import { IoChatboxEllipsesOutline } from "react-icons/io5";
import { TiGroup } from "react-icons/ti";


const users = [
  { name: 'Lu Yuhang', message: 'How is going? Ahang.', time: 'Now', unread: 2, bio:'hii',starred: true, avatar: '', online: true },
  { name: 'Muzi', message: 'This is a new way to pay.', time: '12 mins', unread: 0, starred: true , bio:'hii', avatar: '', online: false },
  { name: 'Jia Heng', message: 'There is something wrong.', time: '1 hour', unread: 0, starred: true , bio:'hii', avatar: '', online: true },
  { name: 'Amy Bulon', message: 'Missed Call', time: '10 mins', unread: 3, starred: false , bio:'hii', avatar: '', online: false },
  { name: 'Surf Worrall', message: 'See you there, man.', time: '10:25am', unread: 0, starred: false , bio:'hii', avatar: '', online: true },
  { name: 'Dalonzo', message: 'Voice Message', time: '8:45am', unread: 0, starred: false , bio:'hii', avatar: '', online: false },
  { name: 'Frank Crew', message: 'Tomorrow I will send you the...', time: 'Jan 25', unread: 0, starred: false , bio:'hii', avatar: '', online: true },
  { name: 'Alice', message: 'Fine. You can go there.', time: 'Jan 24', unread: 0, starred: false , bio:'hii', avatar: '', online: false },
];

const Sidebar = ({ onSelectUser, selectedUser }) => {
  const handleChatClick = (user) => {
    if (onSelectUser) onSelectUser(user);
  };

  const renderChat = (user) => (
    <div
      className={`sidebar-chat${selectedUser && selectedUser.name === user.name ? ' sidebar-chat-active' : ''}`}
      key={user.name}
      onClick={() => handleChatClick(user)}
      style={{ cursor: 'pointer' }}
    >
      <div className="chat-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="avatar-img" />
        ) : (
          <div className="avatar-placeholder">
            <FaCircleUser size={24} />
          </div>
        )}
        <span className={`status-dot ${user.online ? 'online' : 'offline'}`}></span>
      </div>
      <div className="chat-info">
        <div className="chat-name-row">
          <span className="chat-name">{user.name}</span>
          <span className="chat-time">{user.time}</span>
        </div>
        <div className="chat-message-row">
          <span className="chat-message">{user.message.length > 28 ? `${user.message.slice(0, 28)}...` : user.message}</span>
          {user.unread > 0 && <span className="chat-unread">{user.unread}</span>}
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
          <div className="section-title">Starred</div>
          {users.filter(u => u.starred).map(renderChat)}
        </div>
        <div className="sidebar-section">
          <div className="section-title">Message</div>
          {users.filter(u => !u.starred).map(renderChat)}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
