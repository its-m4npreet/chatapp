import React, { useState, useEffect, useRef } from 'react';
import { FaCircleUser, FaCamera, FaImage } from 'react-icons/fa6';
import { IoArrowBack } from 'react-icons/io5';
import { MdSave } from 'react-icons/md';
import axios from '../lib/axios';
import { ButtonLoading } from './Loading';

const EditProfile = ({ currentUser, onClose, onSave }) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [portfolio, setPortfolio] = useState(currentUser?.portfolio || '');
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [banner, setBanner] = useState(currentUser?.banner || '');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setBio(currentUser.bio || '');
      setLocation(currentUser.location || '');
      setWebsite(currentUser.website || '');
      setPortfolio(currentUser.portfolio || '');
      setProfilePicture(currentUser.profilePicture || '');
      setBanner(currentUser.banner || '');
    }
  }, [currentUser]);

  const handleImageSelect = async (e) => {
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
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Banner size should be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewBanner(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updateData = { 
        name: name.trim(), 
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        portfolio: portfolio.trim()
      };

      // If there's a new profile picture, include it
      if (previewImage) {
        updateData.profilePicture = previewImage;
      }

      // If there's a new banner, include it
      if (previewBanner) {
        updateData.banner = previewBanner;
      }

      const res = await axios.put('/updateProfile', updateData);
      
      if (res.data && res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (onSave) onSave(res.data.user);
        onClose();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1419]/90 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-full text-white transition-all"
            >
              <IoArrowBack size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Edit Profile</h1>
              <p className="text-gray-500 text-sm">Update your information</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-full font-semibold flex items-center gap-2 transition-all"
          >
            {loading ? (
              <ButtonLoading color="#ffffff" />
            ) : (
              <MdSave size={18} />
            )}
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Banner & Profile Picture Section */}
      <div className="relative">
        {/* Banner */}
        <div className="h-32 md:h-40 w-full relative overflow-hidden group">
          {previewBanner || banner ? (
            <img 
              src={previewBanner || banner} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500"></div>
          )}
          <div className="absolute inset-0 bg-black/20"></div>
          
          {/* Banner edit button */}
          <button 
            onClick={() => bannerInputRef.current?.click()}
            className="absolute bottom-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 cursor-pointer flex items-center gap-2"
          >
            <FaImage size={16} />
            <span className="text-sm">Change Banner</span>
          </button>
          
          <input
            type="file"
            ref={bannerInputRef}
            onChange={handleBannerSelect}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-6">
          <div className="relative group">
            {previewImage || profilePicture ? (
              <img
                src={previewImage || profilePicture}
                alt="Profile"
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-[#0f1419] shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gray-800 flex items-center justify-center border-4 border-[#0f1419] shadow-xl">
                <FaCircleUser size={80} className="text-gray-600" />
              </div>
            )}
            
            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <FaCamera size={24} className="text-white" />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="mt-20 px-6 md:px-10 pb-8">
        <div className="max-w-2xl space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#1a1f26] border border-gray-700 text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
              placeholder="Your full name"
              maxLength={50}
            />
            <p className="text-gray-600 text-xs mt-1 text-right">{name.length}/50</p>
          </div>

          {/* Bio Field */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#1a1f26] border border-gray-700 text-white outline-none focus:border-blue-500 resize-none transition-all placeholder:text-gray-600"
              placeholder="Tell people about yourself, your experience, skills, and interests..."
              rows={4}
              maxLength={300}
            />
            <p className="text-gray-600 text-xs mt-1 text-right">{bio.length}/300</p>
          </div>

          {/* Location Field */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#1a1f26] border border-gray-700 text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
              placeholder="e.g. Melbourne, AU"
              maxLength={100}
            />
          </div>

          {/* Website Field */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#1a1f26] border border-gray-700 text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Portfolio Field */}
          <div>
            <label className="block text-gray-400 text-sm font-medium mb-2">Portfolio</label>
            <input
              type="url"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#1a1f26] border border-gray-700 text-white outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
              placeholder="https://yourportfolio.com"
            />
          </div>

          {/* Cancel Button */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
