import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';

export const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-black/80">
      <Sidebar onSelectUser={setSelectedUser} selectedUser={selectedUser} />
      <div className='w-full h-full'>
        <ChatView user={selectedUser} />
      </div>
    </div>
  );
};