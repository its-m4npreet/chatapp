# TODO: Implement Last Seen Functionality in Sidebar

## Backend Changes
- [ ] Add `lastSeen` field to user schema in `user.js`
- [ ] Update `lastSeen` on user logout in `auth.js`
- [ ] Update `lastSeen` on socket disconnect in `index.js`
- [ ] Include `lastSeen` in friends data returned by `getFriends`

## Frontend Changes
- [ ] Update Sidebar.jsx to display "Last seen X ago" when user is offline
- [ ] Format the last seen timestamp appropriately (e.g., "2 hours ago", "yesterday", etc.)

## Testing
- [ ] Test the last seen display in sidebar
- [ ] Verify last seen updates on logout and disconnect
