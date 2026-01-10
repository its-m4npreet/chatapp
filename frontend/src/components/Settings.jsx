import React, { useState } from "react";
import {
  MdOutlineSettings,
  MdDarkMode,
  MdLightMode,
  MdNotifications,
  MdNotificationsOff,
  MdVolumeUp,
  MdVolumeOff,
  MdLock,
  MdInfo,
  MdKeyboardArrowRight,
  MdColorLens,
  MdSecurity,
  MdHelp,
  MdBugReport,
  MdPrivacyTip,
} from "react-icons/md";
import { IoLanguage, IoArrowBack, IoShieldCheckmark } from "react-icons/io5";
import { FaUserShield, FaDatabase } from "react-icons/fa6";

// Helper function to get initial settings from localStorage
const getInitialSettings = () => {
  const savedSettings = localStorage.getItem("chatAppSettings");
  if (savedSettings) {
    return JSON.parse(savedSettings);
  }
  return {
    darkMode: true,
    notifications: true,
    sound: true,
    language: "English",
    onlineStatus: true,
    readReceipts: true,
    typingIndicator: true,
  };
};

// Toggle component
const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
      enabled ? "bg-blue-600" : "bg-zinc-600"
    }`}
  >
    <span
      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
        enabled ? "translate-x-6" : "translate-x-0"
      }`}
    />
  </button>
);

// SettingCard component for grouped settings
const SettingCard = ({ children, className = "" }) => (
  <div
    className={`bg-zinc-800/50 backdrop-blur-sm rounded-2xl border border-zinc-700/50 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

// SettingRow component for individual settings
const SettingRow = ({
  icon: Icon,
  title,
  description,
  children,
  onClick,
  showArrow = false,
  iconBg = "bg-zinc-700",
  iconColor = "text-gray-300",
}) => (
  <div
    className={`flex items-center justify-between p-4 hover:bg-zinc-700/30 transition-colors ${
      onClick ? "cursor-pointer" : ""
    }`}
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}
      >
        {Icon && <Icon size={20} className={iconColor} />}
      </div>
      <div>
        <h4 className="text-white font-medium">{title}</h4>
        {description && (
          <p className="text-gray-500 text-sm mt-0.5">{description}</p>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {children}
      {showArrow && (
        <MdKeyboardArrowRight size={24} className="text-gray-500" />
      )}
    </div>
  </div>
);

// Divider component
const Divider = () => <div className="h-px bg-zinc-700/50 mx-4" />;

// Section header
const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-3 px-1">
    {Icon && <Icon size={16} className="text-gray-500" />}
    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
      {title}
    </h3>
  </div>
);

const Settings = ({ onClose }) => {
  const [settings, setSettings] = useState(getInitialSettings);

  // Save settings to localStorage whenever they change
  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("chatAppSettings", JSON.stringify(newSettings));
  };

  return (
    <div className="h-full w-full flex flex-col ">
      {/* Header */}
      <div className="sticky top-0 z-10  backdrop-blur-sm border-b border-zinc-800">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl text-gray-400 hover:text-white transition-all"
            >
              <IoArrowBack size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <p className="text-gray-500 text-sm">Customize your experience</p>
            </div>
          </div>
          {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <MdOutlineSettings size={22} className="text-white" />
          </div> */}
        </div>
      </div>

      {/* Settings Content */}
      <div
        className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Appearance Section */}
          <div>
            <SectionHeader title="Appearance" icon={MdColorLens} />
            <SettingCard>
              <SettingRow
                icon={settings.darkMode ? MdDarkMode : MdLightMode}
                title="Dark Mode"
                description="Use dark theme for the app"
                iconBg="bg-indigo-600/20"
                iconColor="text-indigo-400"
              >
                <Toggle
                  enabled={settings.darkMode}
                  onChange={(value) => updateSetting("darkMode", value)}
                />
              </SettingRow>
            </SettingCard>
          </div>

          {/* Notifications Section */}
          <div>
            <SectionHeader title="Notifications" icon={MdNotifications} />
            <SettingCard>
              <SettingRow
                icon={
                  settings.notifications ? MdNotifications : MdNotificationsOff
                }
                title="Push Notifications"
                description="Receive notifications for new messages"
                iconBg="bg-green-600/20"
                iconColor="text-green-400"
              >
                <Toggle
                  enabled={settings.notifications}
                  onChange={(value) => updateSetting("notifications", value)}
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={settings.sound ? MdVolumeUp : MdVolumeOff}
                title="Message Sounds"
                description="Play sound when receiving messages"
                iconBg="bg-cyan-600/20"
                iconColor="text-cyan-400"
              >
                <Toggle
                  enabled={settings.sound}
                  onChange={(value) => updateSetting("sound", value)}
                />
              </SettingRow>
            </SettingCard>
          </div>

          {/* Privacy Section */}
          <div>
            <SectionHeader title="Privacy" icon={MdPrivacyTip} />
            <SettingCard>
              <SettingRow
                icon={IoShieldCheckmark}
                title="Online Status"
                description="Show when you're online"
                iconBg="bg-emerald-600/20"
                iconColor="text-emerald-400"
              >
                <Toggle
                  enabled={settings.onlineStatus}
                  onChange={(value) => updateSetting("onlineStatus", value)}
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={FaUserShield}
                title="Read Receipts"
                description="Let others know when you've read their messages"
                iconBg="bg-blue-600/20"
                iconColor="text-blue-400"
              >
                <Toggle
                  enabled={settings.readReceipts}
                  onChange={(value) => updateSetting("readReceipts", value)}
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={MdInfo}
                title="Typing Indicator"
                description="Show when you're typing a message"
                iconBg="bg-purple-600/20"
                iconColor="text-purple-400"
              >
                <Toggle
                  enabled={settings.typingIndicator}
                  onChange={(value) => updateSetting("typingIndicator", value)}
                />
              </SettingRow>
            </SettingCard>
          </div>

          {/* General Section */}
          <div>
            <SectionHeader title="General" icon={MdOutlineSettings} />
            <SettingCard>
              <SettingRow
                icon={IoLanguage}
                title="Language"
                description="Select your preferred language"
                iconBg="bg-orange-600/20"
                iconColor="text-orange-400"
              >
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting("language", e.target.value)}
                  className="bg-zinc-700 text-white px-3 py-2 rounded-lg outline-none border border-zinc-600 focus:border-blue-500 text-sm"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Español</option>
                  <option value="French">Français</option>
                  <option value="German">Deutsch</option>
                  <option value="Hindi">हिंदी</option>
                  <option value="Japanese">日本語</option>
                  <option value="Chinese">中文</option>
                </select>
              </SettingRow>
            </SettingCard>
          </div>

          {/* Security Section */}
          <div>
            <SectionHeader title="Security" icon={MdSecurity} />
            <SettingCard>
              <SettingRow
                icon={MdLock}
                title="Change Password"
                description="Update your account password"
                iconBg="bg-red-600/20"
                iconColor="text-red-400"
                showArrow
                onClick={() => {
                  /* TODO: Implement change password modal */
                }}
              />
              <Divider />
              <SettingRow
                icon={FaDatabase}
                title="Data & Storage"
                description="Manage your data and storage usage"
                iconBg="bg-teal-600/20"
                iconColor="text-teal-400"
                showArrow
                onClick={() => {
                  /* TODO: Implement data management */
                }}
              />
            </SettingCard>
          </div>

          {/* Support Section */}
          <div>
            <SectionHeader title="Support" icon={MdHelp} />
            <SettingCard>
              <SettingRow
                icon={MdHelp}
                title="Help Center"
                description="Get help with using ChatApp"
                iconBg="bg-sky-600/20"
                iconColor="text-sky-400"
                showArrow
                onClick={() => {
                  /* TODO: Implement help center */
                }}
              />
              <Divider />
              <SettingRow
                icon={MdBugReport}
                title="Report a Bug"
                description="Help us improve by reporting issues"
                iconBg="bg-amber-600/20"
                iconColor="text-amber-400"
                showArrow
                onClick={() => {
                  /* TODO: Implement bug report */
                }}
              />
            </SettingCard>
          </div>

          {/* About Section */}
          <div>
            <SectionHeader title="About" icon={MdInfo} />
            <SettingCard>
              <SettingRow
                icon={MdInfo}
                title="App Version"
                description="ChatApp v1.0.0"
                iconBg="bg-gray-600/20"
                iconColor="text-gray-400"
              >
                <span className="px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded-full font-medium">
                  Latest
                </span>
              </SettingRow>
            </SettingCard>
          </div>

          {/* Danger Zone */}
          <div>
            <SectionHeader title="Danger Zone" />
            <SettingCard className="border-red-900/50">
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center shrink-0">
                    <MdSecurity size={20} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">
                      Delete Account
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                    <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 hover:border-red-600 rounded-xl text-sm font-medium transition-all">
                      Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            </SettingCard>
          </div>

          {/* Footer */}
          <div className="text-center py-6 text-gray-600 text-sm">
            <p>Made with ❤️ by ChatApp Team</p>
            <p className="mt-1">© 2026 ChatApp. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
