import React from 'react';
import { FaCircleUser } from 'react-icons/fa6';
import { MdEdit, MdLogout, MdVerified, MdEmail, MdLocationOn, MdLink, MdWork } from 'react-icons/md';
import { IoArrowBack } from 'react-icons/io5';
import axios from '../lib/axios';
import { useNavigate } from 'react-router-dom';
import { ContentLoading } from './Loading';
import indexedDBService from '../lib/indexedDB';

const Profile = ({ currentUser, viewingUser, onClose, onEditProfile, isMobile }) => {
  // If viewingUser is provided, show their profile (read-only), otherwise show currentUser's profile (editable)
  const isViewingOther = viewingUser && viewingUser._id !== currentUser?._id;
  const user = isViewingOther ? viewingUser : currentUser;
  
  const navigate = useNavigate();

  const handleBack = () => {
    if (isMobile || !onClose) {
      navigate(-1);
    } else {
      onClose();
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/logout');
      // Clear IndexedDB on logout
      await indexedDBService.clearAll();
      localStorage.removeItem('user');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('unreadCounts');
      navigate('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local data even if server logout fails
      indexedDBService.clearAll().catch(console.error);
      localStorage.removeItem('user');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('unreadCounts');
      navigate('/signin');
    }
  };

  const isDarkMode =localStorage.getItem('chatAppSettings') ? JSON.parse(localStorage.getItem('chatAppSettings')).darkMode : true;

  if (!user) {
    return (
      <div className={`flex items-center justify-center h-full ${isDarkMode ? 'bg-[#0b0e12] text-white' : 'bg-white text-gray-900'}`}>
        <ContentLoading text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className={`h-full w-full min-h-screen flex flex-col overflow-y-auto scrollbar-hide ${isDarkMode ? 'bg-[#0b0e12]' : 'bg-white'}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
            <div className={`absolute z-0 inset-0 bg-linear-to-br ${isDarkMode ? 'from-blue-600 via-purple-600 to-pink-500' : 'from-blue-400 via-purple-400 to-pink-400'}`}></div>
          )}
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-black/20' : 'bg-white/10'}`}></div>
        </div>

        {/* Back Button */}
        <button
          onClick={handleBack}
          className={`absolute top-4 left-4 p-2 z-50 md:hidden ${isDarkMode ? 'bg-black/50 hover:bg-black/70 text-white' : 'bg-white/50 hover:bg-white/70 text-black'} rounded-full  backdrop-blur-sm transition-all`}
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
                className={`w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 shadow-xl ${isDarkMode ? 'border-[#0f1419]' : 'border-gray-300'}`}
              />
            ) : (
              <div className={`w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center border-4 shadow-xl ${isDarkMode ? 'bg-gray-800 border-[#0f1419] text-gray-600' : 'bg-gray-200 border-gray-400 text-gray-500'}`}>
                <FaCircleUser size={80} />
              </div>
            )}
            {/* <div className="absolute bottom-1 right-1 bg-[#EAB308] rounded-full p-1">
              <MdVerified size={16} className="text-white " />
            </div> */}
          </div>
        </div>

        {/* Action Buttons */}
        {!isViewingOther && (
          <div className="absolute -bottom-12 right-4 md:right-6 flex items-center gap-2">
            <button
              onClick={onEditProfile}
              className={`px-4 py-2 bg-transparent border rounded text-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${isDarkMode ? 'border-gray-600 hover:bg-gray-800 text-white' : 'border-gray-400 hover:bg-gray-100 text-gray-900'}`}
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
          <h2
            className={`text-2xl md:text-3xl font-bold max-w-xs md:max-w-md truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            title={user.name}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              maxWidth: '20ch'
            }}
          >
            {user.name}
          </h2>
        </div>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm md:text-base`}>@{user.username}</p>

        {/* Experience/Bio Section */}
        <div className="mt-6">
          <h3 className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm font-medium mb-2`}>Bio</h3>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
            {user.bio || 'Hey there! Let’s chat'}
          </p>
        </div>

        {/* About Me & Details Grid */}
        <div className={`mt-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-300'} py-5`}>
          {/* About Me */}
          <div>
            <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold mb-3`}>About me</h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm leading-relaxed`}>
              {user.aboutMe || 'Open to chatting and meeting new people.'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 grid grid-cols-2">
            <div>
              <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-xs uppercase tracking-wider`}>Location</span>
              <div className="flex items-center gap-2 mt-1">
                <MdLocationOn size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>{user.location || 'Add your location'}</span>
              </div>
            </div>
            <div>
              <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-xs uppercase tracking-wider`}>Website</span>
              <div className="flex items-center gap-2 mt-1">
                <MdLink size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                {user.website ? (
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-sm hover:underline`}>
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>Add your website</span>
                )}
              </div>
            </div>
            <div>
              <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-xs uppercase tracking-wider`}>Portfolio</span>
              <div className="flex items-center gap-2 mt-1">
                <MdWork size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                {user.portfolio ? (
                  <a href={user.portfolio} target="_blank" rel="noopener noreferrer" className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-sm hover:underline`}>
                    {user.portfolio.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>Add your portfolio</span>
                )}
              </div>
            </div>
            <div>
              <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-xs uppercase tracking-wider`}>Email</span>
              <div className="flex items-center gap-2 mt-1">
                <MdEmail size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                <a href={`mailto:${user.email}`} className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} text-sm hover:underline`}>{user.email}</a>
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
              className={`px-5 py-2 ${isDarkMode ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20' : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'} border disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer`}
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
