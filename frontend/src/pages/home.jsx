import React, { useState, useEffect } from 'react';
import { IoEllipsisVertical, IoSearch, IoNotifications, IoChatbubbles, IoPeople, IoPersonAdd, IoSettings } from 'react-icons/io5';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';
import Profile from '../components/Profile';
import EditProfile from '../components/EditProfile';
import Settings from '../components/Settings';
import AddUser from '../components/addUser';
import GroupChat from '../components/GroupChat';
import NotificationPage from '../components/notification';
import CreateGroupModal from '../components/CreateGroupModal';
import InviteToGroupModal from '../components/InviteToGroupModal';
import socket from '../lib/socket';
import axios from '../lib/axios';

export const Home = () => {
  const navigate = useNavigate();
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationsPage, setShowNotificationsPage] = useState(false);

  // Sidebar tab state
  const [sidebarActiveTab, setSidebarActiveTab] = useState('chats');
  const [prevActiveTab, setPrevActiveTab] = useState('chats');

  // New: responsive + mobile sidebar visibility
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    // Set initial state based on media query
    handler(mql);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Fetch current user info on mount and when localStorage changes
  useEffect(() => {
    const updateUser = () => {
      const user = JSON.parse(localStorage.getItem('user'));
      const token = localStorage.getItem('jwt_token');
      
      // Redirect to signin if no user or token
      if (!user || !token) {
        navigate('/signin');
        return;
      }
      
      // Normalize id to _id for compatibility
      const normalizedUser = {
        ...user,
        _id: user._id || user.id,
      };
      if (normalizedUser._id && (!currentUser || currentUser._id !== normalizedUser._id)) {
        setCurrentUser(normalizedUser);
      }
    };
    updateUser();
    window.addEventListener('focus', updateUser);
    window.addEventListener('storage', updateUser);
    return () => {
      window.removeEventListener('focus', updateUser);
      window.removeEventListener('storage', updateUser);
    };
  }, [currentUser, navigate]);

  // Connect socket once on mount
  useEffect(() => {
    if (!socket.connected) {
      console.log('Home: Connecting socket...');
      socket.connect();
    }
    
    // Listen for connection events
    const handleConnect = () => {
      console.log('Home: Socket connected successfully', socket.id);
    };
    
    const handleDisconnect = () => {
      console.log('Home: Socket disconnected');
    };
    
    const handleConnectError = (error) => {
      console.error('Home: Socket connection error:', error);
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      // Don't disconnect socket - it's a singleton used across pages
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
    (async () => {
      // Only fetch if user and token are available
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('jwt_token');
      
      if (!user || !token) {
        console.log('No user or token, skipping fetch');
        return;
      }
      
      console.log('Fetching groups and notifications with token:', token ? 'present' : 'missing');
      await fetchGroups();
      await fetchUnreadNotifications();
    })();
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

    const handleGroupUpdated = ({ group }) => {
      setGroups(prev => prev.map(g => g._id === group._id ? group : g));
      if (selectedGroup?._id === group._id) {
        setSelectedGroup(group);
      }
    };

    const handleRemovedFromGroup = ({ groupId, groupName }) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(null);
        alert(`You have been removed from the group "${groupName}"`);
      }
    };

    socket.on('newNotification', handleNewNotification);
    socket.on('groupMemberJoined', handleGroupMemberJoined);
    socket.on('groupDeleted', handleGroupDeleted);
    socket.on('groupUpdated', handleGroupUpdated);
    socket.on('removedFromGroup', handleRemovedFromGroup);

    return () => {
      socket.off('newNotification', handleNewNotification);
      socket.off('groupMemberJoined', handleGroupMemberJoined);
      socket.off('groupDeleted', handleGroupDeleted);
      socket.off('groupUpdated', handleGroupUpdated);
      socket.off('removedFromGroup', handleRemovedFromGroup);
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
  }, [currentUser, selectedUser]);

  // Clear unread count when selecting a user
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setShowProfile(false);
    setShowSettings(false);
    setShowAddUser(false);
    setViewingUserProfile(null);
    setSidebarActiveTab('chats'); 
    if (user && user._id) {
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[user._id];
        return updated;
      });
    }
    // New: hide sidebar on mobile when opening a chat
    if (isMobile) setShowSidebar(false);
  };

  const handleSelectGroup = async (group) => {
    try {
      const res = await axios.get(`/groups/${group._id}`);
      setSelectedGroup(res.data.group);
      setSelectedUser(null);
      setShowProfile(false);
      setShowSettings(false);
      setShowAddUser(false);
      setSidebarActiveTab('groups');
    } catch (error) {
      console.error('Failed to fetch group details:', error);
      setSelectedGroup(group);
      setSidebarActiveTab('groups');
    }
    // New: hide sidebar on mobile when opening a group
    if (isMobile) setShowSidebar(false);
  };

  // New: back to list (mobile)
  const handleBackToList = () => {
    setShowSidebar(true);
    // keep selection if you prefer; clearing selection provides a clean list view:
    setSelectedUser(null);
    setSelectedGroup(null);
  };

  const handleProfileClick = () => {
    if (isMobile) {
      navigate('/profile');
    } else {
      // Desktop: show in chat area
      setShowProfile(true);
      setShowSettings(false);
      setShowAddUser(false);
      setSelectedUser(null);
      setSelectedGroup(null);
      setViewingUserProfile(null);
    }
  };

  const handleCloseProfile = () => {
    if (isMobile) {
      navigate(-1);
    } else {
      setShowProfile(false);
    }
  };

  const handleEditProfile = () => {
    if (isMobile) {
      navigate('/edit-profile');
    } else {
      setShowEditProfile(true);
      setShowProfile(false);
    }
  };

  const handleCloseEditProfile = () => {
    setShowEditProfile(false);
    setShowProfile(true);
  };

  const handleProfileSaved = (updatedUser) => {
    // Update current user state
    setCurrentUser(updatedUser);
    
    // Also update localStorage to ensure persistence
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Close edit profile view
    setShowEditProfile(false);
    
    // If we were viewing the profile, refresh it
    if (showProfile && viewingUserProfile?._id === updatedUser._id) {
      setViewingUserProfile(updatedUser);
    }
  };

  const handleViewUserProfile = (user) => {
    setViewingUserProfile(user);
    setShowProfile(true);
    setShowSettings(false);
  };

  const handleSettingsClick = () => {
    if (isMobile) {
      // On mobile, show settings in the main area instead of navigating
      setShowSettings(true);
      setShowProfile(false);
      setShowAddUser(false);
      setSelectedUser(null);
      setSelectedGroup(null);
      setShowNotificationsPage(false);
      setSidebarActiveTab('settings');
      setShowSidebar(false);
    } else {
      // Desktop: show in chat area
      setShowSettings(true);
      setShowProfile(false);
      setShowAddUser(false);
      setSelectedUser(null);
      setSelectedGroup(null);
    }
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setSidebarActiveTab('chats');
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  const handleTabChange = (tab) => {
    setPrevActiveTab(sidebarActiveTab);
    setShowProfile(false);
    setShowSettings(false);
    setShowNotificationsPage(false);
    if (tab === 'adduser') {
      setShowAddUser(true);
      setSelectedUser(null);
      setSelectedGroup(null);
      setSidebarActiveTab('adduser');
      // Hide sidebar on mobile when showing AddUser
      if (isMobile) setShowSidebar(false);
    } else if (tab === 'chats') {
      setShowAddUser(false);
      setSidebarActiveTab('chats');
      if (isMobile) setShowSidebar(true);
    } else if (tab === 'groups') {
      setShowAddUser(false);
      setSidebarActiveTab('groups');
      if (isMobile) setShowSidebar(true);
    } else if (tab === 'notifications') {
      setShowAddUser(false);
      setShowNotificationsPage(true);
      setSidebarActiveTab('notifications');
      if (isMobile) setShowSidebar(false);
    } else {
      setShowAddUser(false);
    }
  };

  const handleCloseAddUser = () => {
    setShowAddUser(false);
    // Show sidebar again on mobile when closing AddUser
    if (isMobile) setShowSidebar(true);
  };

  const handleFriendAdded = () => {
    // Trigger sidebar to refresh friends list
    setRefreshFriends(prev => prev + 1);
  };

  const handleNotificationClick = () => {
    setShowNotificationsPage(true);
    setSidebarActiveTab('notifications');
    setShowSidebar(false);
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

  // Navigation items for mobile bottom nav
  const navItems = [
    { id: "chats", icon: IoChatbubbles, label: "Chats" },
    { id: "groups", icon: IoPeople, label: "Groups" },
    { id: "adduser", icon: IoPersonAdd, label: "Add Friend" },
    {id: "notifications", icon: IoNotifications, label: "Notifications" },
    { id: "settings", icon: IoSettings, label: "Settings" },
  ];

  // Helper function to determine animation class based on page transition
  const getAnimationClass = () => {
    const tabOrder = ['chats', 'groups', 'adduser', 'notifications', 'settings'];
    const prevIndex = tabOrder.indexOf(prevActiveTab);
    const currIndex = tabOrder.indexOf(sidebarActiveTab);
    
    if (currIndex > prevIndex) {
      return 'content-transition'; // Moving right/forward
    } else if (currIndex < prevIndex) {
      return 'content-transition-left'; // Moving left/backward
    }
    return 'content-transition';
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .content-transition {
          animation: slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .content-transition-left {
          animation: slideInLeft 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .content-transition-up {
          animation: slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .content-transition-scale {
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .nav-btn-active {
          animation: slideInUp 0.3s ease-out;
        }
        
        .page-exit {
          animation: slideInLeft 0.3s ease-out reverse;
        }
      `}</style>
      <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-black/80">
      {/* Mobile Header */}
      {isMobile && showSidebar && !showEditProfile && !showProfile && !showSettings && !showNotificationsPage && ( 
        <div className=" border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {showMobileSearch ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Search..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  className="flex-1 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowMobileSearch(false);
                    setMobileSearchQuery('');
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <h2 className="text-white font-semibold text-lg">ChatApp</h2>
            )}
          </div>
          {!showMobileSearch && (
            <div className="flex items-center gap-3">
             

              {/* Search Button */}
              <button
                onClick={() => setShowMobileSearch(true)}
                className="p-2  rounded-lg text-gray-400 hover:text-white transition"
              >
                <IoSearch size={20} />
              </button>            

              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
                >
                  <IoEllipsisVertical size={20} />
                </button>
                {showMobileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setShowMobileMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[#141417] border border-gray-700 rounded-lg shadow-lg z-999 py-1">
                      <button
                        onClick={() => {
                          handleProfileClick();
                          setShowMobileMenu(false);
                        }}
                        className="w-full bg-[#141417] text-left px-4 py-2 text-gray-300 hover:bg-zinc-700 transition"
                      >
                        Profile
                      </button>
                      <div className='h-px w-full bg-gray-700'></div>
                      <button
                        onClick={() => {
                          handleSettingsClick();
                          setShowMobileMenu(false);
                        }}
                        className="w-full bg-[#141417] text-left px-4 py-2 text-gray-300 hover:bg-zinc-700 transition"
                      >
                        Settings
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )
       }

       <div className="flex flex-1 overflow-hidden">
        {/* Sidebar hidden on mobile when a chat/group is open OR when viewing profile/settings/edit */}
        {(!isMobile || (showSidebar && !showEditProfile && !showProfile && !showSettings)) && (
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
            isMobile={isMobile}
            mobileSearchQuery={mobileSearchQuery}
          />
        )}
        <div className="flex-1 h-full overflow-hidden relative">
        {showEditProfile ? (
          <div className={`absolute inset-0 ${getAnimationClass()} overflow-y-auto`}>
            <EditProfile 
              currentUser={currentUser} 
              onClose={handleCloseEditProfile}
              onSave={handleProfileSaved}
              isMobile={isMobile}
            />
          </div>
        ) : showProfile ? (
          <div className={`absolute inset-0 ${getAnimationClass()} overflow-y-auto`}>
            <Profile 
              currentUser={currentUser} 
              viewingUser={viewingUserProfile} 
              onClose={handleCloseProfile}
              onEditProfile={handleEditProfile}
              isMobile={isMobile}
            />
          </div>
        ) : showSettings ? (
          <div className={`absolute inset-0 ${getAnimationClass()} overflow-y-auto`}>
            <Settings 
              onClose={handleCloseSettings}
              isMobile={isMobile}
            />
          </div>
        ) : showAddUser ? (
          <div className={`absolute inset-0 ${getAnimationClass()} overflow-y-auto`}>
            <AddUser 
              onClose={handleCloseAddUser}
              onSelectUser={handleSelectUser}
              currentUser={currentUser}
              onFriendAdded={handleFriendAdded}
            />
          </div>
        ) : showNotificationsPage ? (
          <div className={`absolute inset-0 ${getAnimationClass()} overflow-y-auto`}>
            <NotificationPage
              onClose={() => {
                setShowNotificationsPage(false);
                setSidebarActiveTab('chats');
                setShowSidebar(true);
              }}
              socket={socket}
              onNotificationAction={handleNotificationAction}
              isMobile={isMobile}
            />
          </div>
        ) : selectedGroup ? (
          <div className={`absolute inset-0 ${getAnimationClass()} overflow-y-auto`}>
            <GroupChat
              group={selectedGroup}
              socket={socket}
              currentUser={currentUser}
              onClose={() => setSelectedGroup(null)}
              onOpenInvite={handleOpenInvite}
              onGroupUpdated={handleGroupUpdated}
              isMobile={isMobile}
              onBack={handleBackToList}
            />
          </div>
        ) : (
          isMobile && !selectedUser ? null : (
            <div className={`absolute inset-0 ${getAnimationClass()} overflow-hidden`}>
              <ChatView 
                user={selectedUser} 
                socket={socket} 
                currentUser={currentUser} 
                onViewProfile={handleViewUserProfile}
                isUserOnline={selectedUser && onlineUsers.includes(selectedUser._id)}
                isUserTyping={selectedUser && typingUsers[selectedUser._id]}
                isMobile={isMobile}
                onBack={handleBackToList}
              />
            </div>
          )
        )}
        </div>
      </div>


      {/* Tab Navigation for Mobile - Bottom Icon Navigation */}
      {isMobile && (showSidebar || showSettings || showNotificationsPage || showAddUser) && (
        <nav className="fixed bottom-0 left-0 right-0 bg-black rounded-t-xl shadow-2xl px-3 py-3 safe-area-bottom z-100">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = sidebarActiveTab === item.id;
              const hasUnread = item.id === "notifications" && unreadNotifications > 0;

              const handleItemClick = () => {
                if (item.id === "settings") {
                  handleSettingsClick();
                } else {
                  handleTabChange(item.id);
                }
              };

              return (
                <button
                  key={item.id}
                  onClick={handleItemClick}
                  className={`flex flex-col items-center gap-1 min-w-15 py-2 transition-all duration-300 active:scale-95 ${
                    isActive ? 'nav-btn-active' : ''
                  }`}
                >
                  <div
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300 relative
                      ${isActive ? "bg-[#4f38f7] shadow-lg shadow-purple-600/40 scale-110" : "bg-transparent hover:bg-gray-800/50 hover:scale-105"}
                    `}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-[#4f38f7] rounded-full blur-md opacity-30 animate-pulse" />
                    )}
                    <Icon
                      size={22}
                      className={`
                        transition-all duration-300 relative z-10
                        ${isActive ? "text-white scale-110" : "text-gray-400 hover:text-gray-200"}
                      `}
                      strokeWidth={2}
                    />
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold animate-bounce">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </span>
                    )}
                  </div>
                  <span
                    className={`
                      text-[10px] font-medium transition-all duration-300
                      ${isActive ? "text-[#4f38f7]" : "text-gray-400"}
                    `}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      
      {/* Notification Popup - Removed, using full page instead */}

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
    </>
  );
};