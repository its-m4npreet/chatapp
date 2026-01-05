import React from 'react';
import { FaCircleUser } from 'react-icons/fa6';
import { MdEdit, MdLogout, MdVerified, MdEmail, MdLocationOn, MdLink, MdWork } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';
import axios from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { ContentLoading } from './Loading';

const Profile = ({ currentUser, viewingUser, onClose, onEditProfile }) => {
  // If viewingUser is provided, show their profile (read-only), otherwise show currentUser's profile (editable)
  const isViewingOther = viewingUser && viewingUser._id !== currentUser?._id;
  const user = isViewingOther ? viewingUser : currentUser;
  
  const navigate = useNavigate();

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
      <div className="flex items-center justify-center h-full bg-[#0f1419]">
        <ContentLoading text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col  overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* Banner Section */}
      <div className="relative">
        {/* Banner Image */}
        <div className="h-40 md:h-52 w-full relative overflow-hidden">
          {user.banner ? (
            <img 
              src={user.banner} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-purple-600 to-pink-500"></div>
          )}
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Back Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-all"
        >
          <IoArrowBack size={20} />
        </button>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-6 md:left-10">
          <div className="relative">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-[#0f1419] shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gray-800 flex items-center justify-center border-4 border-[#0f1419] shadow-xl">
                <FaCircleUser size={80} className="text-gray-600" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 bg-blue-500 rounded-full p-1">
              <MdVerified size={16} className="text-white" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isViewingOther && (
          <div className="absolute -bottom-12 right-4 md:right-6 flex items-center gap-2">
            <button
              onClick={onEditProfile}
              className="px-4 py-2 bg-transparent border border-gray-600 hover:bg-gray-800 text-white rounded text-sm font-medium flex items-center gap-2 transition-all cursor-pointer"
            >
              <MdEdit size={16} />
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Profile Info Section */}
      <div className="mt-20 px-6 md:px-10">
        {/* Name and Title */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white">{user.name}</h1>
          <MdVerified size={22} className="text-blue-500" />
        </div>
        <p className="text-gray-400 text-sm md:text-base">{user.email}</p>

        {/* Experience/Bio Section */}
        <div className="mt-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Bio</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            {user.bio || 'Hii'}
          </p>
        </div>

        {/* About Me & Details Grid */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-700 py-5">
          {/* About Me */}
          <div>
            <h3 className="text-white font-semibold mb-3">About me</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {user.aboutMe || 'Tell people about yourself. Share your interests, what you\'re working on, or anything else you\'d like others to know.'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 grid grid-cols-2">
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wider">Location</span>
              <div className="flex items-center gap-2 mt-1">
                <MdLocationOn size={16} className="text-gray-400" />
                <span className="text-gray-300 text-sm">{user.location || 'Add your location'}</span>
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wider">Website</span>
              <div className="flex items-center gap-2 mt-1">
                <MdLink size={16} className="text-gray-400" />
                {user.website ? (
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-gray-300 text-sm">Add your website</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wider">Portfolio</span>
              <div className="flex items-center gap-2 mt-1">
                <MdWork size={16} className="text-gray-400" />
                {user.portfolio ? (
                  <a href={user.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline">
                    {user.portfolio.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-gray-300 text-sm">Add your portfolio</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wider">Email</span>
              <div className="flex items-center gap-2 mt-1">
                <MdEmail size={16} className="text-gray-400" />
                <a href={`mailto:${user.email}`} className="text-blue-400 text-sm hover:underline">{user.email}</a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {/* <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[#1a1f26] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <span className="text-blue-400 text-lg">💬</span>
              </div>
            </div>
            <h4 className="text-white font-semibold text-sm">Active Chats</h4>
            <p className="text-gray-500 text-xs mt-1">Available for messaging</p>
          </div>

          <div className="bg-[#1a1f26] rounded-2xl p-4 border border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <span className="text-green-400 text-lg">🟢</span>
              </div>
            </div>
            <h4 className="text-white font-semibold text-sm">Online Status</h4>
            <p className="text-gray-500 text-xs mt-1">Currently online</p>
          </div>

          <div className="bg-[#1a1f26] rounded-2xl p-4 border border-gray-800 col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                <span className="text-purple-400 text-lg">⭐</span>
              </div>
            </div>
            <h4 className="text-white font-semibold text-sm">Verified Member</h4>
            <p className="text-gray-500 text-xs mt-1">Trusted user</p>
          </div>
        </div> */}
        {/* w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded transition duration-300 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed */}

        {/* Action Buttons */}
        <div className="mt-8 pb-8 flex justify-end gap-3">
          {!isViewingOther ?  (
            <button
              onClick={handleLogout}
              className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
            >
              <MdLogout size={20} />
              <span>Logout</span>
            </button>
          ): null}
        </div>
      </div>

      </div>
    // </div>
  );
};

export default Profile;
