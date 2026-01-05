import React, { useState, useEffect } from 'react';
import { IoClose, IoAdd, IoSearch } from 'react-icons/io5';
import { TiGroup } from 'react-icons/ti';
import { FaCircleUser } from 'react-icons/fa6';
import axios from '../lib/axios';
import { ContentLoading } from './Loading';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [step, setStep] = useState(1); // 1: Group info, 2: Add members
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/friends');
      setFriends(res.data.friends || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && step === 2) {
      fetchFriends();
    }
  }, [isOpen, step]);

  const handleNext = () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const toggleMember = (friend) => {
    setSelectedMembers((prev) => {
      if (prev.some((m) => m._id === friend._id)) {
        return prev.filter((m) => m._id !== friend._id);
      }
      return [...prev, friend];
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    setCreating(true);
    try {
      // Create the group
      const createRes = await axios.post('/groups/create', {
        name: groupName.trim(),
        description: groupDescription.trim(),
      });

      const newGroup = createRes.data.group;

      // Invite selected members
      if (selectedMembers.length > 0) {
        await axios.post('/groups/invite', {
          groupId: newGroup._id,
          userIds: selectedMembers.map((m) => m._id),
        });
      }

      if (onGroupCreated) onGroupCreated(newGroup);
      handleClose();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create group');
    }
    setCreating(false);
  };

  const handleClose = () => {
    setStep(1);
    setGroupName('');
    setGroupDescription('');
    setSelectedMembers([]);
    setSearchQuery('');
    onClose();
  };

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md bg-zinc-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold text-lg">
            {step === 1 ? 'Create Group' : 'Invite Members'}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Group Avatar Placeholder */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                  <TiGroup size={40} className="text-white" />
                </div>
              </div>

              {/* Group Name */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Group Name *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  maxLength={50}
                  className="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500"
                />
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description (optional)</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  maxLength={200}
                  rows={3}
                  className="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleNext}
                disabled={!groupName.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
              >
                Next: Add Members
              </button>
            </div>
          ) : (
            <div className="space-y-4">
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

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <span
                      key={member._id}
                      onClick={() => toggleMember(member)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full cursor-pointer hover:bg-blue-700"
                    >
                      {member.name}
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
                    {searchQuery ? 'No friends found' : 'No friends to add'}
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedMembers.some((m) => m._id === friend._id);
                    return (
                      <div
                        key={friend._id}
                        onClick={() => toggleMember(friend)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition ${
                          isSelected ? 'bg-blue-600/20 border border-blue-500' : 'hover:bg-zinc-700 border border-transparent'
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
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-500'
                          }`}
                        >
                          {isSelected && <IoAdd className="text-white rotate-45" size={12} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={creating}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
                >
                  {creating ? 'Creating...' : `Create Group${selectedMembers.length > 0 ? ` & Invite (${selectedMembers.length})` : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
