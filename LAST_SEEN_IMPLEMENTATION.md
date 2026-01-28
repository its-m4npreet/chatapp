# Last Seen Implementation Guide

## Overview
This document describes the complete implementation of the "Last Seen" feature in the chat application. This feature allows users to see when their friends were last active.

## Implementation Components

### 1. Database Schema (Backend)
**File:** `backend/model/user.js`

```javascript
lastSeen: {
    type: Date,
    default: null,
}
```

The `lastSeen` field stores the timestamp of when a user was last active.

### 2. Backend - Socket.IO Events

**File:** `backend/index.js`

#### A. Update Activity Event
```javascript
socket.on('updateActivity', async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      console.log('Backend: Updated activity/lastSeen for user:', userId);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
});
```
This event is triggered when the user is actively using the app.

#### B. Disconnect Event
```javascript
socket.on('disconnect', async () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      try {
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
      } catch (error) {
        console.error('Error updating last seen on disconnect:', error);
      }
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
});
```
Updates `lastSeen` when a user disconnects.

### 3. Backend - Authentication Controller

**File:** `backend/controllers/auth.js`

#### A. Logout Endpoint
```javascript
const logout = async (req, res) => {
    try {
        // Update last seen timestamp before logout
        await User.findByIdAndUpdate(req.userId, { lastSeen: new Date() });
        // ... rest of logout logic
    }
}
```

#### B. Get Friends Endpoint
```javascript
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('friends', 'name email profilePicture bio username lastSeen');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ friends: user.friends });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
```
Now includes `lastSeen` field in the friends response.

### 4. Frontend - Activity Tracking

**File:** `frontend/src/pages/home.jsx`

Periodic activity updates every 30 seconds and on user interactions:
```javascript
// Update activity status periodically to track lastSeen
useEffect(() => {
    if (!socket || !currentUser || !currentUser._id) return;

    // Send activity update every 30 seconds
    const activityInterval = setInterval(() => {
      socket.emit('updateActivity', currentUser._id);
    }, 30000);

    // Also send activity update on user interactions
    const handleUserActivity = () => {
      socket.emit('updateActivity', currentUser._id);
    };

    // Listen to various user interactions
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, [socket, currentUser]);
```

### 5. Frontend - Sidebar Display

**File:** `frontend/src/components/Sidebar.jsx`

#### A. Format Last Seen Function
```javascript
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "";

  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) return "Just now";
  if (diffMinutes < 1) return "Active recently";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return lastSeenDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
```

#### B. Display in Chat Item
```jsx
<div className="chat-timestamp">
  <span className="last-seen text-sm text-gray-400">
    Last seen {formatLastSeen(user.lastSeen)}
  </span>
</div>
```

### 6. Frontend - Styling

**File:** `frontend/src/components/Sidebar.css`

```css
.chat-timestamp {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  white-space: nowrap;
}

.last-seen {
  font-size: 11px;
  color: #8b92a0;
}
```

## How It Works

1. **User Joins:** When a user connects to the app, they emit a 'join' event with their userId
2. **Activity Tracking:** The app tracks user activity through:
   - Periodic updates every 30 seconds
   - Mouse movements
   - Keyboard input
   - Click events
3. **Database Update:** Each activity event updates the `lastSeen` field in the user document
4. **Display:** The Sidebar component displays the formatted `lastSeen` time for each friend
5. **Disconnect/Logout:** When a user disconnects or logs out, `lastSeen` is updated to the current time

## Time Formatting

The `formatLastSeen` function converts timestamps into human-readable formats:
- Less than 30 seconds: "Just now"
- Less than 1 minute: "Active recently"
- Less than 1 hour: "X min ago"
- Less than 24 hours: "X hr ago"
- Yesterday: "Yesterday"
- Less than 7 days: "X days ago"
- Older than 7 days: Full date (e.g., "18 Jan 2026")

## Files Modified

1. ✅ `backend/model/user.js` - Already has lastSeen field
2. ✅ `backend/index.js` - Added updateActivity socket event
3. ✅ `backend/controllers/auth.js` - Updated logout and getFriends
4. ✅ `frontend/src/pages/home.jsx` - Added activity tracking
5. ✅ `frontend/src/components/Sidebar.jsx` - Already has formatLastSeen and display
6. ✅ `frontend/src/components/Sidebar.css` - Added styling for timestamp display

## Testing the Feature

1. **Start Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Test Scenarios:**
   - Open the app and check if you can see friends' last seen times
   - Close the browser/logout and verify lastSeen is updated
   - Check if the formatting works correctly for different time intervals
   - Verify that activity tracking updates lastSeen periodically

## Future Enhancements

1. Add settings to hide last seen status for privacy
2. Show online/offline status with different indicators
3. Add typing indicators
4. Add read receipts for messages
5. Add custom status messages

## Notes

- The activity update interval is set to 30 seconds to balance accuracy and server load
- User interactions (mouse, keyboard, click) also trigger immediate updates
- The lastSeen time is displayed in the user's local timezone via the date formatting function
