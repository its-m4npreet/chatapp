import React, { useState, useEffect } from "react";
import { SettingsContext } from "./SettingsContextProvider";

const defaultSettings = {
  darkMode: true,
  notifications: true,
  sound: true,
  language: "English",
  onlineStatus: true,
  readReceipts: true,
  typingIndicator: true,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem("chatAppSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsedSettings };
      } catch (error) {
        console.error("Error loading settings:", error);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Apply dark mode to document
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("bg-[#0b0e12]");
      document.body.classList.add("text-white");
      document.body.classList.remove("bg-white");
      document.body.classList.remove("text-gray-900");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.add("bg-white");
      document.body.classList.add("text-gray-900");
      document.body.classList.remove("bg-[#0b0e12]");
      document.body.classList.remove("text-white");
    }
  }, [settings.darkMode]);

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("chatAppSettings", JSON.stringify(newSettings));
  };

  const playSoundNotification = () => {
    if (settings.sound && settings.notifications) {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  const sendNotification = (title, options = {}) => {
    if (settings.notifications && "Notification" in window) {
      if (Notification.permission === "granted") {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          ...options,
        });

        // Handle notification click to focus the window
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        playSoundNotification();
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        playSoundNotification,
        sendNotification,
        requestNotificationPermission,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
