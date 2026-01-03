import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';
import socket from '../lib/socket';

export const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user info on mount (from backend or localStorage)
  useEffect(() => {
    // Example: get from localStorage (adjust as needed)
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user._id) setCurrentUser(user);
    // Optionally, fetch from backend
  }, []);

  useEffect(() => {
    socket.connect();
    // Join socket room for current user
    if (currentUser && currentUser._id) {
      socket.emit('join', currentUser._id);
    }
    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-black/80">
      <Sidebar onSelectUser={setSelectedUser} selectedUser={selectedUser} />
      <div className='w-full h-full'>
        <ChatView user={selectedUser} socket={socket} currentUser={currentUser} />
      </div>
    </div>
  );
};