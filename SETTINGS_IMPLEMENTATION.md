# Settings & Features Implementation Guide

## Overview
All settings functionality has been implemented with a global context system that persists user preferences to localStorage.

## Architecture

### SettingsContext (`context/SettingsContext.jsx`)
The main context provider that manages all user settings:

```javascript
const defaultSettings = {
  darkMode: true,              // Dark/Light theme
  notifications: true,         // Enable/disable notifications
  sound: true,                 // Enable/disable notification sounds
  language: "English",         // User language preference
  onlineStatus: true,          // Show online status to others
  readReceipts: true,          // Show read receipts for messages
  typingIndicator: true        // Show when typing
};
```

### Key Features

#### 1. **Dark/Light Mode**
- **File**: `context/SettingsContext.jsx`, `App.jsx`
- **Implementation**: 
  - Toggles `dark` class on `document.documentElement`
  - Adds/removes dark background on document body
  - Automatically applied when settings change
  - Persists to localStorage

#### 2. **Notifications**
- **File**: `components/ChatView.jsx`
- **Implementation**:
  - Sends browser notifications when new messages arrive
  - Uses Notification API with permission handling
  - Shows sender name and message preview
  - Includes sound playback when enabled

#### 3. **Notification Sound**
- **File**: `context/SettingsContext.jsx`
- **Method**: `playSoundNotification()`
- **Implementation**: 
  - Uses Web Audio API to generate beep sound
  - Only plays if both notifications AND sound settings are enabled
  - Frequency: 800Hz sine wave with 0.5s duration

#### 4. **Online Status Visibility**
- **File**: `components/Sidebar.jsx`
- **Implementation**:
  - Green indicator dot shown next to user avatar only if `onlineStatus` is enabled
  - Other users will NOT see your online status if disabled
  - Still shows other users' online status if their setting is enabled

#### 5. **Read Receipts**
- **File**: `components/ChatView.jsx`
- **Implementation**:
  - Messages marked as read only if `readReceipts` is enabled
  - Emits `markMessageRead` event to socket when setting is true
  - Others will NOT know if you've read their messages if disabled
  - Messages show single tick (sent) or double tick (read) depending on status

#### 6. **Typing Indicator**
- **File**: `components/ChatView.jsx`
- **Implementation**:
  - Shows "typing..." indicator only if `typingIndicator` is enabled
  - Sends typing events via socket when user starts typing
  - Automatically stops after 1 second of inactivity
  - Others won't see you typing if setting is disabled

## User Interface

### Settings Page (`components/Settings.jsx`)
Located at `/settings` route

**Sections**:
1. **Appearance**
   - Dark Mode toggle

2. **Notifications**
   - Push Notifications toggle
   - Message Sounds toggle

3. **Privacy**
   - Online Status toggle
   - Read Receipts toggle
   - Typing Indicator toggle

4. **General**
   - Language selector (English, Spanish, French, German, Hindi, Japanese, Chinese)

5. **Security**
   - Change Password
   - Data & Storage

6. **Support**
   - Help Center
   - Report a Bug

7. **About**
   - App Version

## Integration Points

### ChatView Component
- Imports `useSettings` hook
- Respects all privacy settings
- Sends notifications for new messages
- Conditions typing indicator and read receipt emissions

### Sidebar Component  
- Imports `useSettings` hook
- Conditionally shows online status based on setting
- Respects onlineStatus visibility preference

### App Component
- Wraps entire app with `SettingsProvider`
- Enables all child components to access settings via hook

## Usage

### Using Settings in Components

```javascript
import { useSettings } from '../context/SettingsContext';

function MyComponent() {
  const { 
    settings,                    // Current settings object
    updateSetting,              // Function to update setting
    playSoundNotification,      // Play notification sound
    sendNotification,           // Send browser notification
    requestNotificationPermission,  // Request permission
    isLoaded                    // Settings loaded from storage
  } = useSettings();

  // Use settings
  if (settings.darkMode) {
    // Apply dark mode
  }

  // Update settings
  updateSetting('notifications', false);

  // Send notification
  sendNotification('Title', { body: 'Message' });
}
```

## Data Persistence

All settings are automatically saved to localStorage under the key `chatAppSettings`:

```json
{
  "darkMode": true,
  "notifications": true,
  "sound": true,
  "language": "English",
  "onlineStatus": true,
  "readReceipts": true,
  "typingIndicator": true
}
```

Settings are:
- Loaded on app initialization
- Updated whenever a setting changes
- Persisted across browser sessions

## Browser Permissions

### Notifications
- Request permission when notifications are first enabled
- Uses browser's standard permission flow
- Required for desktop notifications to work
- Users can manage permissions in browser settings

## Socket Events Modified

### Now Conditional:
- **`typing`**: Only emitted if `typingIndicator` is true
- **`stopTyping`**: Only emitted if `typingIndicator` is true
- **`markMessageRead`**: Only emitted if `readReceipts` is true

## Testing Checklist

- [x] Dark/Light mode toggle works
- [x] Settings persist across page reload
- [x] Notifications sent for new messages
- [x] Notification sounds play when enabled
- [x] Online status hidden when disabled
- [x] Read receipts conditional on setting
- [x] Typing indicator conditional on setting
- [x] Browser notification permissions requested
- [x] All settings saved to localStorage
- [x] Settings apply globally to app

## Future Enhancements

1. Sync settings with backend
2. Add more notification customization
3. Add time-based do-not-disturb settings
4. Add notification categories (only alerts, all messages, etc.)
5. Add blocked users/chats
6. Add message scheduling
7. Add automatic reply settings
