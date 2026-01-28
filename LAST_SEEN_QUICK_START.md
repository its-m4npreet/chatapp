# Last Seen Feature - Quick Start

## What's Been Implemented

The "Last Seen" feature shows when your friends were last active in the chat application. You'll see timestamps like "Just now", "2 min ago", "Yesterday", etc. next to each friend's name in the sidebar.

## What Changed

### Backend Changes
1. **Socket Event** (`backend/index.js`):
   - Added `updateActivity` event that updates user's `lastSeen` timestamp
   - Called every 30 seconds automatically
   - Also triggered on user interactions (mouse, keyboard, clicks)

2. **API Update** (`backend/controllers/auth.js`):
   - Modified `getFriends` endpoint to include `lastSeen` field
   - This ensures the frontend receives the last seen time

### Frontend Changes
1. **Activity Tracking** (`frontend/src/pages/home.jsx`):
   - New `useEffect` hook that sends activity updates to backend
   - Updates every 30 seconds while user is active
   - Triggers on user interactions for real-time updates

2. **Display** (`frontend/src/components/Sidebar.jsx`):
   - Already had `formatLastSeen` function (no changes needed)
   - Displays "Last seen X" in chat list items
   - Shows human-readable timestamps

3. **Styling** (`frontend/src/components/Sidebar.css`):
   - Added `.chat-timestamp` and `.last-seen` styles
   - Timestamps appear on the right side of chat items

## How to Run

### Backend
```bash
cd chatapp/backend
npm install  # Only if needed
npm run dev
```

### Frontend
```bash
cd chatapp/frontend
npm install  # Only if needed
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Testing the Feature

1. **Open Two Windows:**
   - Log in to account A in window 1
   - Log in to account B in window 2

2. **Check Last Seen:**
   - In window 2's sidebar, next to Account A's name, you should see "Last seen Just now"
   - Move your mouse in window 1 to stay active
   - You'll see it keep updating in window 2

3. **Test Inactivity:**
   - Minimize or close window 1
   - In window 2, watch the timestamp for Account A
   - After a moment, it should change to "Last seen X min ago"
   - Time should increment as you wait

4. **Test Time Formatting:**
   - The timestamps should show:
     - < 30 sec: "Just now"
     - < 1 min: "Active recently"
     - < 1 hour: "X min ago"
     - < 24 hours: "X hr ago"
     - Yesterday: "Yesterday"
     - < 7 days: "X days ago"
     - > 7 days: Full date like "18 Jan 2026"

## Files Modified

- ✅ `backend/index.js` - Socket event added
- ✅ `backend/controllers/auth.js` - API updated
- ✅ `frontend/src/pages/home.jsx` - Activity tracking added
- ✅ `frontend/src/components/Sidebar.jsx` - Uses existing functions (no changes)
- ✅ `frontend/src/components/Sidebar.css` - Styles added

## Troubleshooting

### Last Seen Not Updating
1. Check if backend is running (`npm run dev` in backend folder)
2. Check if frontend is connected to backend (check browser console for errors)
3. Try refreshing the page
4. Check browser console for any errors (F12)

### Timestamps Not Showing
1. Make sure you have friends added
2. Refresh the page
3. Check if `getFriends` API is being called (Network tab in DevTools)

### Activity Not Being Tracked
1. Try moving your mouse or typing something
2. The activity should be sent to backend
3. Check backend logs for "Updated activity" messages

## Notes

- Activity updates are sent every 30 seconds automatically
- Moving mouse, typing, or clicking also triggers updates
- The feature respects the online/offline status already in the app
- All times are shown in your local timezone
- Works on both desktop and mobile views

## Next Steps (Optional Enhancements)

1. Add privacy setting to hide last seen from others
2. Show typing indicators when someone is actively typing
3. Add read receipts for messages
4. Add "online" vs "offline" visual indicators
5. Add custom status messages

Enjoy your updated chat app with Last Seen tracking! 🎉
