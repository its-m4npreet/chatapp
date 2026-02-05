import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IoArrowBack, IoSearch, IoPersonAdd } from 'react-icons/io5';
import { FaCircleUser, FaCheck } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import axios from '../lib/axios';
import indexedDBService from '../lib/indexedDB';
import { FriendsSkeletonLoader } from './Loading';

const USERS_PER_PAGE = 10;

const AddUser = ({ onClose, onSelectUser, currentUser, onFriendAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [addedUsers, setAddedUsers] = useState([]);
  const [addingUser, setAddingUser] = useState(null);
  const [displayedCount, setDisplayedCount] = useState(USERS_PER_PAGE);
  const [hasMore, setHasMore] = useState(true);
  
  const navigate = useNavigate();
  const isDarkMode = localStorage.getItem('chatAppSettings') ? JSON.parse(localStorage.getItem('chatAppSettings')).darkMode : true;
  const isMobile = window.innerWidth <= 768;
  
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Fetch all users and current user's friends
        const [usersRes, friendsRes] = await Promise.all([
          axios.get('/users'),
          axios.get('/friends')
        ]);
        
        // Filter out current user from the list
        const filteredUsers = usersRes.data.users.filter(
          (user) => user._id !== currentUser?._id
        );
        
        // Mark already added friends
        const friendIds = (friendsRes.data.friends || []).map(f => f._id);
        setAddedUsers(friendIds);
        setUsers(filteredUsers);
        setHasMore(filteredUsers.length > USERS_PER_PAGE);
        setLoading(false);
      } catch {
        setError('Failed to load users');
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  // Reset pagination when search query changes
  useEffect(() => {
    setDisplayedCount(USERS_PER_PAGE);
  }, [searchQuery]);

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get paginated users to display
  const displayedUsers = filteredUsers.slice(0, displayedCount);
  const canLoadMore = displayedCount < filteredUsers.length;

  // Load more users function
  const loadMoreUsers = useCallback(() => {
    if (loadingMore || !canLoadMore) return;
    
    setLoadingMore(true);
    // Simulate a small delay for smooth UX
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + USERS_PER_PAGE, filteredUsers.length));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, canLoadMore, filteredUsers.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canLoadMore && !loadingMore) {
          loadMoreUsers();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, canLoadMore, loadingMore, loadMoreUsers]);

  const handleAddFriend = async (user, e) => {
    e.stopPropagation();
    if (addedUsers.includes(user._id)) {
      // Already a friend, just open chat
      if (onSelectUser) {
        onSelectUser(user);
      }
      return;
    }

    try {
      setAddingUser(user._id);
      await axios.post('/friends/add', { friendId: user._id });
      setAddedUsers([...addedUsers, user._id]);
      
      // Cache new friend to IndexedDB for offline access
      const currentUserId = currentUser?._id;
      if (currentUserId) {
        const existingFriends = await indexedDBService.getFriends(currentUserId);
        const updatedFriends = [...existingFriends, user];
        indexedDBService.saveFriends(updatedFriends, currentUserId).catch(console.error);
      }
      
      // Notify parent to refresh friends list
      if (onFriendAdded) {
        onFriendAdded();
      }
      setAddingUser(null);
      // Open chat with the newly added friend
      if (onSelectUser) {
        onSelectUser(user);
      }
    } catch (err) {
      console.error('Failed to add friend:', err);
      setAddingUser(null);
    }
  };

  const handleUserClick = (user) => {
    // Navigate to user's profile
    navigate(`/profile/${user._id}`);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700 bg-[#0b0e12]' : 'border-gray-300 bg-white'} flex items-center gap-4`}>
        {!isMobile && (
          <button onClick={onClose} className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}>
            <IoArrowBack size={24} className={isDarkMode ? 'text-white' : 'text-gray-900'} />
          </button>
        )}
        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add New Friends</h2>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <IoSearch
            size={20}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none transition-all ${isDarkMode ? 'border-gray-700 bg-[#1a1f26] text-white placeholder-gray-400 focus:border-blue-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500'}`}
          />
        </div>
      </div>

      {/* Users List */}
      <div className={`flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide ${isDarkMode ? '' : 'bg-white'}`}>
        {loading ? (
          <FriendsSkeletonLoader count={6} />
        ) : error ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
            {searchQuery ? 'No users found matching your search' : 'No users available'}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedUsers.map((user) => {
              const isAdded = addedUsers.includes(user._id);
              const isAdding = addingUser === user._id;
              return (
                <div
                  key={user._id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-900'}`}
                >
                  {/* Avatar */}
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => handleUserClick(user)}
                    title="View profile"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                        <FaCircleUser size={32} className={isDarkMode ? 'text-gray-500' : 'text-gray-600'} />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleUserClick(user)}
                    title="View profile"
                  >
                    <div className={`font-semibold truncate hover:underline transition-all ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.name}
                    </div>
                    <div className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user.username}
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={(e) => handleAddFriend(user, e)}
                    disabled={isAdding}
                    className={`p-2 rounded-full transition-all ${
                      isAdded
                        ? 'bg-green-600 text-white cursor-pointer'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } ${isAdding ? 'opacity-50' : ''}`}
                    title={isAdded ? 'Added - Click to chat' : 'Add to chat list'}
                  >
                    {isAdding ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : isAdded ? (
                      <FaCheck size={16} />
                    ) : (
                      <IoPersonAdd size={16} />
                    )}
                  </button>
                </div>
              );
            })}
            
            {/* Load More Trigger & Skeleton Loading */}
            {canLoadMore && (
              <div ref={loadMoreRef} className="py-2">
                {loadingMore && (
                  <FriendsSkeletonLoader count={3} />
                )}
              </div>
            )}
            
            {/* End of list indicator */}
            {!canLoadMore && displayedUsers.length > 0 && (
              <div className={`text-center py-4 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Showing all {filteredUsers.length} users
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Footer */}
      {!isMobile && (
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <p className={`text-sm text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
          Click the + button to add a user to your chat list
        </p>
      </div>
      )}
    </div>
  );
};

export default AddUser;
