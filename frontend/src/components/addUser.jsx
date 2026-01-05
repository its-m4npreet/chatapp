import React, { useState, useEffect } from 'react';
import { IoArrowBack, IoSearch, IoPersonAdd } from 'react-icons/io5';
import { FaCircleUser, FaCheck } from 'react-icons/fa6';
import axios from '../lib/axios';
import { ContentLoading } from './Loading';

const AddUser = ({ onClose, onSelectUser, currentUser, onFriendAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedUsers, setAddedUsers] = useState([]);
  const [addingUser, setAddingUser] = useState(null);

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
        setLoading(false);
      } catch {
        setError('Failed to load users');
        setLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    // If already a friend, open chat directly
    if (addedUsers.includes(user._id) && onSelectUser) {
      onSelectUser(user);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center gap-4">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-full text-white transition-all"
        >
          <IoArrowBack size={20} />
        </button>
        <h2 className="text-xl font-semibold text-white">Add New Chat</h2>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <IoSearch
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <ContentLoading text="Loading users..." />
        ) : error ? (
          <div className="text-center text-red-400 py-8">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery ? 'No users found matching your search' : 'No users available'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => {
              const isAdded = addedUsers.includes(user._id);
              const isAdding = addingUser === user._id;
              return (
                <div
                  key={user._id}
                  className={`flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800 transition-all ${isAdded ? 'cursor-pointer' : 'cursor-default'} group`}
                  onClick={() => handleUserClick(user)}
                >
                  {/* Avatar */}
                  <div className="relative">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                        <FaCircleUser size={32} className="text-gray-500" />
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {user.email}
                    </div>
                    {user.bio && (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {user.bio}
                      </div>
                    )}
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
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-sm text-gray-500 text-center">
          Click the + button to add a user to your chat list
        </p>
      </div>
    </div>
  );
};

export default AddUser;
