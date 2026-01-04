import React, { useState } from 'react';
import { MdOutlineSettings, MdDarkMode, MdLightMode, MdNotifications, MdNotificationsOff, MdVolumeUp, MdVolumeOff, MdLock, MdInfo } from 'react-icons/md';
import { IoLanguage } from 'react-icons/io5';

// Helper function to get initial settings from localStorage
const getInitialSettings = () => {
  const savedSettings = localStorage.getItem('chatAppSettings');
  if (savedSettings) {
    return JSON.parse(savedSettings);
  }
  return {
    darkMode: true,
    notifications: true,
    sound: true,
    language: 'English',
  };
};

// SettingItem component defined outside Settings
// eslint-disable-next-line no-unused-vars
const SettingItem = ({ icon: Icon, title, description, children }) => (
  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
        <Icon size={20} className="text-gray-300" />
      </div>
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        {description && <p className="text-gray-400 text-sm">{description}</p>}
      </div>
    </div>
    {children}
  </div>
);

// Toggle component defined outside Settings
const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-12 h-6 rounded-full transition-colors ${
      enabled ? 'bg-blue-600' : 'bg-gray-600'
    }`}
  >
    <span
      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

const Settings = ({ onClose }) => {
  const [settings, setSettings] = useState(getInitialSettings);

  // Save settings to localStorage whenever they change
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('chatAppSettings', JSON.stringify(newSettings));
  };

  return (
    <div className="h-full w-full flex flex-col ">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MdOutlineSettings size={24} className="text-white" />
          <h2 className="text-xl font-semibold text-white">Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back to Chat
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 p-6 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="max-w-2xl mx-auto">
          {/* Appearance Section */}
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Appearance</h3>
            
            <SettingItem
              icon={settings.darkMode ? MdDarkMode : MdLightMode}
              title="Dark Mode"
              description="Use dark theme for the app"
            >
              <Toggle
                enabled={settings.darkMode}
                onChange={(value) => updateSetting('darkMode', value)}
              />
            </SettingItem>
          </div>

          {/* Notifications Section */}
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Notifications</h3>
            
            <SettingItem
              icon={settings.notifications ? MdNotifications : MdNotificationsOff}
              title="Push Notifications"
              description="Receive notifications for new messages"
            >
              <Toggle
                enabled={settings.notifications}
                onChange={(value) => updateSetting('notifications', value)}
              />
            </SettingItem>

            <SettingItem
              icon={settings.sound ? MdVolumeUp : MdVolumeOff}
              title="Message Sounds"
              description="Play sound when receiving messages"
            >
              <Toggle
                enabled={settings.sound}
                onChange={(value) => updateSetting('sound', value)}
              />
            </SettingItem>
          </div>

          {/* General Section */}
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">General</h3>
            
            <SettingItem
              icon={IoLanguage}
              title="Language"
              description="Select your preferred language"
            >
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="bg-gray-700 text-white px-3 py-2 rounded-lg outline-none border border-gray-600 focus:border-blue-500"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Hindi">Hindi</option>
              </select>
            </SettingItem>
          </div>

          {/* Privacy & Security Section */}
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Privacy & Security</h3>
            
            <div 
              className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3 cursor-pointer hover:bg-gray-750"
              onClick={() => {/* TODO: Implement change password modal */}}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <MdLock size={20} className="text-gray-300" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Change Password</h4>
                  <p className="text-gray-400 text-sm">Update your account password</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </div>

          {/* About Section */}
          <div className="mb-8">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">About</h3>
            
            <SettingItem
              icon={MdInfo}
              title="App Version"
              description="ChatApp v1.0.0"
            >
              <span className="text-gray-400 text-sm">Latest</span>
            </SettingItem>
          </div>

          {/* Danger Zone */}
          <div className="mb-8">
            <h3 className="text-red-400 text-sm font-semibold uppercase tracking-wider mb-4">Danger Zone</h3>
            
            <div className="p-4 bg-gray-800 rounded-lg border border-red-900">
              <h4 className="text-white font-medium mb-2">Delete Account</h4>
              <p className="text-gray-400 text-sm mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
