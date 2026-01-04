import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';
import Profile from '../components/Profile';
import Settings from '../components/Settings';
import socket from '../lib/socket';

export const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch current user info on mount and when localStorage changes
  useEffect(() => {
    const updateUser = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        // Normalize id to _id for compatibility
        const normalizedUser = {
          ...user,
          _id: user._id || user.id,
        };
        if (normalizedUser._id && (!currentUser || currentUser._id !== normalizedUser._id)) {
          setCurrentUser(normalizedUser);
        }
      }
    };
    updateUser();
    window.addEventListener('focus', updateUser);
    window.addEventListener('storage', updateUser);
    return () => {
      window.removeEventListener('focus', updateUser);
      window.removeEventListener('storage', updateUser);
    };
  }, [currentUser]);

  // Connect socket once on mount
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, []);

  // Join socket room when currentUser is available
  useEffect(() => {
    if (socket && currentUser && currentUser._id) {
      console.log('Joining socket room with userId:', currentUser._id);
      socket.emit('join', currentUser._id);
    }
  }, [currentUser]);

  // Listen for new messages to update unread counts
  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = (msg) => {
      const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
      // Only increment unread if message is from someone else and not the selected user
      if (senderId !== currentUser._id && (!selectedUser || senderId !== selectedUser._id)) {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, currentUser, selectedUser]);

  // Clear unread count when selecting a user
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setShowProfile(false);
    setShowSettings(false);
    if (user && user._id) {
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[user._id];
        return updated;
      });
    }
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setShowSettings(false);
    setSelectedUser(null);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    setShowProfile(false);
    setSelectedUser(null);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleTabChange = () => {
    setShowProfile(false);
    setShowSettings(false);
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-black/80">
      <Sidebar 
        onSelectUser={handleSelectUser} 
        selectedUser={selectedUser} 
        unreadCounts={unreadCounts} 
        onProfileClick={handleProfileClick}
        showProfile={showProfile}
        onSettingsClick={handleSettingsClick}
        showSettings={showSettings}
        onTabChange={handleTabChange}
      />
      <div className='w-full h-full'>
        {showProfile ? (
          <Profile currentUser={currentUser} onClose={handleCloseProfile} />
        ) : showSettings ? (
          <Settings onClose={handleCloseSettings} />
        ) : (
          <ChatView user={selectedUser} socket={socket} currentUser={currentUser} />
        )}
      </div>
    </div>
  );
};