import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';
import Profile from '../components/Profile';
import EditProfile from '../components/EditProfile';
import Settings from '../components/Settings';
import AddUser from '../components/addUser';
import GroupChat from '../components/GroupChat';
import NotificationPopup from '../components/NotificationPopup';
import CreateGroupModal from '../components/CreateGroupModal';
import InviteToGroupModal from '../components/InviteToGroupModal';
import socket from '../lib/socket';
import axios from '../lib/axios';

export const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [refreshFriends, setRefreshFriends] = useState(0);
  
  // Group states
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInviteToGroup, setShowInviteToGroup] = useState(false);
  const [inviteGroup, setInviteGroup] = useState(null);
  const [refreshGroups, setRefreshGroups] = useState(0);
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Sidebar tab state
  const [sidebarActiveTab, setSidebarActiveTab] = useState('chats');

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

  // Listen for online users updates
  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.on('onlineUsers', handleOnlineUsers);
    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
    };
  }, []);

  // Listen for typing events
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = ({ senderId }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
    };

    const handleUserStopTyping = ({ senderId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[senderId];
        return updated;
      });
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);
    return () => {
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
    };
  }, []);

  // Listen for friend added/removed events (real-time updates)
  useEffect(() => {
    if (!socket) return;

    const handleFriendAdded = () => {
      // Trigger sidebar to refresh friends list
      setRefreshFriends(prev => prev + 1);
    };

    const handleFriendRemoved = () => {
      // Trigger sidebar to refresh friends list
      setRefreshFriends(prev => prev + 1);
    };

    socket.on('friendAdded', handleFriendAdded);
    socket.on('friendRemoved', handleFriendRemoved);
    return () => {
      socket.off('friendAdded', handleFriendAdded);
      socket.off('friendRemoved', handleFriendRemoved);
    };
  }, []);

  // Fetch groups
  const fetchGroups = async () => {
    try {
      const res = await axios.get('/groups/my-groups');
      setGroups(res.data.groups || []);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  // Fetch unread notification count
  const fetchUnreadNotifications = async () => {
    try {
      const res = await axios.get('/notifications/unread-count');
      setUnreadNotifications(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchUnreadNotifications();
  }, [refreshGroups]);

  // Listen for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = () => {
      setUnreadNotifications(prev => prev + 1);
    };

    const handleGroupMemberJoined = () => {
      fetchGroups();
    };

    const handleGroupDeleted = ({ groupId }) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
      }
    };

    socket.on('newNotification', handleNewNotification);
    socket.on('groupMemberJoined', handleGroupMemberJoined);
    socket.on('groupDeleted', handleGroupDeleted);

    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('groupMemberJoined', handleGroupMemberJoined);
      socket.off('groupDeleted', handleGroupDeleted);
    };
  }, [selectedGroup]);

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
    setSelectedGroup(null);
    setShowProfile(false);
    setShowSettings(false);
    setShowAddUser(false);
    setSidebarActiveTab('chats'); // Switch to chats tab when selecting a user
    if (user && user._id) {
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[user._id];
        return updated;
      });
    }
  };

  const handleSelectGroup = async (group) => {
    try {
      // Fetch full group details
      const res = await axios.get(`/groups/${group._id}`);
      setSelectedGroup(res.data.group);
      setSelectedUser(null);
      setShowProfile(false);
      setShowSettings(false);
      setShowAddUser(false);
      setSidebarActiveTab('groups'); // Switch to groups tab when selecting a group
    } catch (error) {
      console.error('Failed to fetch group details:', error);
      setSelectedGroup(group);
      setSidebarActiveTab('groups');
    }
  };

  const handleProfileClick = () => {
    setViewingUserProfile(null); // Reset viewing user to show current user's profile
    setShowProfile(true);
    setShowSettings(false);
    setSelectedUser(null);
  };

  const handleCloseProfile = () => {
    // If viewing another user's profile, go back to chat with that user
    if (viewingUserProfile) {
      setSelectedUser(viewingUserProfile);
      setShowProfile(false);
      setViewingUserProfile(null);
    } else {
      setShowProfile(false);
    }
  };

  const handleEditProfile = () => {
    setShowEditProfile(true);
    setShowProfile(false);
  };

  const handleCloseEditProfile = () => {
    setShowEditProfile(false);
    setShowProfile(true);
  };

  const handleProfileSaved = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const handleViewUserProfile = (user) => {
    setViewingUserProfile(user);
    setShowProfile(true);
    setShowSettings(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    setShowProfile(false);
    setSelectedUser(null);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleTabChange = (tab) => {
    setShowProfile(false);
    setShowSettings(false);
    if (tab === 'adduser') {
      setShowAddUser(true);
      setSelectedUser(null);
      setSelectedGroup(null);
      setSidebarActiveTab('adduser');
    } else if (tab === 'chats') {
      setShowAddUser(false);
      setSidebarActiveTab('chats');
    } else if (tab === 'groups') {
      setShowAddUser(false);
      setSidebarActiveTab('groups');
    } else {
      setShowAddUser(false);
    }
  };

  const handleCloseAddUser = () => {
    setShowAddUser(false);
  };

  const handleFriendAdded = () => {
    // Trigger sidebar to refresh friends list
    setRefreshFriends(prev => prev + 1);
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  const handleNotificationAction = (action) => {
    if (action === 'accepted') {
      // Refresh groups after accepting invite
      setRefreshGroups(prev => prev + 1);
    }
    fetchUnreadNotifications();
  };

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
  };

  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [newGroup, ...prev]);
    setSelectedGroup(newGroup);
    setSelectedUser(null);
  };

  const handleOpenInvite = (group) => {
    setInviteGroup(group);
    setShowInviteToGroup(true);
  };

  const handleGroupUpdated = () => {
    fetchGroups();
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
        viewingUserProfile={viewingUserProfile}
        onlineUsers={onlineUsers}
        refreshFriends={refreshFriends}
        onNotificationClick={handleNotificationClick}
        unreadNotifications={unreadNotifications}
        groups={groups}
        selectedGroup={selectedGroup}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={handleCreateGroup}
        refreshGroups={refreshGroups}
        externalActiveTab={sidebarActiveTab}
      />
      <div className='w-full h-full'>
        {showEditProfile ? (
          <EditProfile 
            currentUser={currentUser} 
            onClose={handleCloseEditProfile}
            onSave={handleProfileSaved}
          />
        ) : showProfile ? (
          <Profile 
            currentUser={currentUser} 
            viewingUser={viewingUserProfile} 
            onClose={handleCloseProfile}
            onEditProfile={handleEditProfile}
          />
        ) : showSettings ? (
          <Settings onClose={handleCloseSettings} />
        ) : showAddUser ? (
          <AddUser 
            onClose={handleCloseAddUser}
            onSelectUser={handleSelectUser}
            currentUser={currentUser}
            onFriendAdded={handleFriendAdded}
          />
        ) : selectedGroup ? (
          <GroupChat
            group={selectedGroup}
            socket={socket}
            currentUser={currentUser}
            onClose={() => setSelectedGroup(null)}
            onOpenInvite={handleOpenInvite}
            onGroupUpdated={handleGroupUpdated}
          />
        ) : (
          <ChatView 
            user={selectedUser} 
            socket={socket} 
            currentUser={currentUser} 
            onViewProfile={handleViewUserProfile}
            isUserOnline={selectedUser && onlineUsers.includes(selectedUser._id)}
            isUserTyping={selectedUser && typingUsers[selectedUser._id]}
          />
        )}
      </div>

      {/* Notification Popup */}
      <NotificationPopup
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        socket={socket}
        onNotificationAction={handleNotificationAction}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={handleGroupCreated}
        currentUser={currentUser}
      />

      {/* Invite to Group Modal */}
      <InviteToGroupModal
        isOpen={showInviteToGroup}
        onClose={() => {
          setShowInviteToGroup(false);
          setInviteGroup(null);
        }}
        group={inviteGroup}
        currentUser={currentUser}
      />
    </div>
  );
};