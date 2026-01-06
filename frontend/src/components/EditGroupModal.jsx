import React, { useState, useEffect, useRef } from 'react';
import { IoClose, IoCamera } from 'react-icons/io5';
import { TiGroup } from 'react-icons/ti';
import { FaCircleUser, FaTrash, FaCrown } from 'react-icons/fa6';
import {FaShieldAlt} from 'react-icons/fa'
import axios from '../lib/axios';
import { ButtonLoading, ContentLoading } from './Loading';

const EditGroupModal = ({ isOpen, group, currentUser, onClose, onGroupUpdated }) => {
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'members'
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const fileInputRef = useRef(null);

  const isCreator = group?.creator?._id === currentUser?._id;
  const isAdmin = group?.admins?.some(a => a._id === currentUser?._id);

  useEffect(() => {
    if (isOpen && group) {
      setGroupName(group.name || '');
      setGroupDescription(group.description || '');
      setPreviewAvatar(null);
      setMembers(group.members || []);
      setError('');
      setActiveTab('general');
    }
  }, [isOpen, group]);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updateData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
      };

      if (previewAvatar) {
        updateData.avatar = previewAvatar;
      }

      const res = await axios.put(`/groups/${group._id}`, updateData);

      if (res.data?.group) {
        if (onGroupUpdated) onGroupUpdated(res.data.group);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;

    try {
      await axios.post(`/groups/${group._id}/remove-member`, { memberId });
      setMembers(prev => prev.filter(m => m._id !== memberId));
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleToggleAdmin = async (memberId, isCurrentlyAdmin) => {
    try {
      await axios.post(`/groups/${group._id}/toggle-admin`, { 
        memberId,
        makeAdmin: !isCurrentlyAdmin 
      });
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update admin status');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg bg-zinc-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h3 className="text-white font-semibold text-lg">Edit Group</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded-lg text-gray-400 hover:text-white transition"
          >
            <IoClose size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'general'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'members'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Members ({members.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'general' ? (
            <div className="space-y-4">
              {/* Group Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                    {previewAvatar || group?.avatar ? (
                      <img
                        src={previewAvatar || group?.avatar}
                        alt={group?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <TiGroup size={48} className="text-white" />
                    )}
                  </div>
                  {(isCreator || isAdmin) && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition"
                    >
                      <IoCamera size={16} />
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
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
                  disabled={!isCreator && !isAdmin}
                  className="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-gray-500 text-xs mt-1 text-right">{groupName.length}/50</p>
              </div>

              {/* Group Description */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  maxLength={200}
                  rows={3}
                  disabled={!isCreator && !isAdmin}
                  className="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-gray-500 text-xs mt-1 text-right">{groupDescription.length}/200</p>
              </div>

              {/* Group Info */}
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-gray-400 text-sm mb-2">Group Info</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created by</span>
                    <span className="text-white">{group?.creator?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Members</span>
                    <span className="text-white">{members.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created</span>
                    <span className="text-white">
                      {group?.createdAt
                        ? new Date(group.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const isMemberCreator = member._id === group?.creator?._id;
                const isMemberAdmin = group?.admins?.some(a => a._id === member._id);
                const isSelf = member._id === currentUser?._id;

                return (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-700 transition"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                      {member.profilePicture ? (
                        <img
                          src={member.profilePicture}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <FaCircleUser size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">{member.name}</p>
                        {isMemberCreator && (
                          <FaCrown size={12} className="text-yellow-500 shrink-0" title="Creator" />
                        )}
                        {isMemberAdmin && !isMemberCreator && (
                          <FaShieldAlt size={12} className="text-green-500 shrink-0" title="Admin" />
                        )}
                        {isSelf && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">{member.email}</p>
                    </div>

                    {/* Admin actions */}
                    {(isCreator || isAdmin) && !isMemberCreator && !isSelf && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isCreator && (
                          <button
                            onClick={() => handleToggleAdmin(member._id, isMemberAdmin)}
                            className={`p-2 rounded-lg transition ${
                              isMemberAdmin
                                ? 'bg-green-600/20 text-green-500 hover:bg-green-600/30'
                                : 'bg-zinc-600 text-gray-400 hover:bg-zinc-500 hover:text-white'
                            }`}
                            title={isMemberAdmin ? 'Remove admin' : 'Make admin'}
                          >
                            <FaShieldAlt size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg transition"
                          title="Remove member"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {members.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  No members in this group
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'general' && (isCreator || isAdmin) && (
          <div className="p-4 border-t border-gray-700 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !groupName.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
            >
              {saving ? <ButtonLoading color="#ffffff" /> : null}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditGroupModal;
