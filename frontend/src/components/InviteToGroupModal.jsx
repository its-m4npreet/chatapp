import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoSearch } from 'react-icons/io5';
import { FaCircleUser, FaCheck } from 'react-icons/fa6';
import axios from '../lib/axios';
import { ContentLoading } from './Loading';

const InviteToGroupModal = ({ isOpen, onClose, group }) => {
  const [friends, setFriends] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/friends');
      // Filter out users who are already members or have pending invites
      const memberIds = group?.members?.map((m) => m._id) || [];
      const pendingIds = group?.pendingInvites?.map((i) => i.user?._id || i.user) || [];
      const availableFriends = (res.data.friends || []).filter(
        (f) => !memberIds.includes(f._id) && !pendingIds.includes(f._id)
      );
      setFriends(availableFriends);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    if (isOpen && group) {
      setTimeout(fetchFriends, 0);
    }
  }, [isOpen, group, fetchFriends]);

  const toggleUser = (user) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u._id === user._id)) {
        return prev.filter((u) => u._id !== user._id);
      }
      return [...prev, user];
    });
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    setInviting(true);
    try {
      await axios.post('/groups/invite', {
        groupId: group._id,
        userIds: selectedUsers.map((u) => u._id),
      });
      alert(`Invited ${selectedUsers.length} user(s) to the group`);
      handleClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to invite users');
    }
    setInviting(false);
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery('');
    onClose();
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-zinc-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <h3 className="text-white font-semibold text-lg">Invite to Group</h3>
            <p className="text-gray-400 text-sm">{group.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full bg-zinc-700 text-white pl-10 pr-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500"
            />
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user._id}
                  onClick={() => toggleUser(user)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full cursor-pointer hover:bg-blue-700"
                >
                  {user.name}
                  <IoClose size={14} />
                </span>
              ))}
            </div>
          )}

          {/* Friends List */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <ContentLoading text="Loading friends..." />
            ) : filteredFriends.length === 0 ? (
              <div className="text-center text-gray-400 py-4">
                {friends.length === 0
                  ? 'All your friends are already in this group'
                  : 'No friends found'}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = selectedUsers.some((u) => u._id === friend._id);
                return (
                  <div
                    key={friend._id}
                    onClick={() => toggleUser(friend)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'hover:bg-zinc-700 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {friend.profilePicture ? (
                        <img
                          src={friend.profilePicture}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <FaCircleUser size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{friend.name}</p>
                      <p className="text-gray-400 text-xs truncate">{friend.email}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                      }`}
                    >
                      {isSelected && <FaCheck className="text-white" size={10} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Invite Button */}
          <button
            onClick={handleInvite}
            disabled={selectedUsers.length === 0 || inviting}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
          >
            {inviting
              ? 'Inviting...'
              : `Invite${selectedUsers.length > 0 ? ` (${selectedUsers.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteToGroupModal;
