import React, { useState, useEffect } from 'react';
import { FaCircleUser } from 'react-icons/fa6';
import { MdEdit, MdLogout } from 'react-icons/md';
import axios from '../lib/axios';
import { useNavigate } from 'react-router-dom';

const Profile = ({ currentUser, onClose }) => {
  const [user, setUser] = useState(currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      setName(currentUser.name || '');
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await axios.put('/updateProfile', { name, bio });
      if (res.data && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/logout');
      localStorage.removeItem('user');
      navigate('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('user');
      navigate('/signin');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Profile</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back to Chat
        </button>
      </div>

      {/* Profile Content */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-28 h-28 rounded-full object-cover border-4 border-gray-700"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                <FaCircleUser size={80} className="text-gray-500" />
              </div>
            )}
          </div>
          {!isEditing && (
            <h3 className="mt-4 text-2xl font-bold text-white">{user.name}</h3>
          )}
          <p className="text-gray-400 text-sm mt-1">{user.email}</p>
        </div>

        {/* Profile Details */}
        <div className="max-w-md mx-auto space-y-6">
          {isEditing ? (
            <>
              {/* Edit Mode */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white outline-none focus:border-blue-500 resize-none"
                  placeholder="Write something about yourself..."
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(user.name || '');
                    setBio(user.bio || '');
                  }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Name</span>
                </div>
                <p className="text-white">{user.name}</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Email</span>
                </div>
                <p className="text-white">{user.email}</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Bio</span>
                </div>
                <p className="text-white">{user.bio || 'No bio added yet.'}</p>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <MdEdit size={20} />
                Edit Profile
              </button>
            </>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 mt-4"
          >
            <MdLogout size={20} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
