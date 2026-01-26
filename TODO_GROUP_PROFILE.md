# TODO: Group Profile Page Implementation

## Task: When clicking group avatar or title, navigate to group profile page

### Changes made:

1. ✅ **GroupChat.jsx** - Click handlers now navigate to group profile page
   - ✅ Added `useNavigate` import from react-router-dom
   - ✅ Fixed the onClick handler on header to navigate to `/group/${group._id}`
   - ✅ Removed inline `showGroupProfile` modal (commented out code)
   - ✅ Cleaned up unused state (`showGroupProfile`, `groupProfileScroll`, etc.)

2. ✅ **groupViewPage.jsx** - Enhanced and fixed the group profile page
   - ✅ Fixed `navigator(-1)` typo to `navigate(-1)`
   - ✅ Added `useSettings` context import and usage for dark mode
   - ✅ Get `currentUser` from props for isCreator/isAdmin checks
   - ✅ Added loading state for API calls
   - ✅ Pass currentUser prop to enable edit permissions

3. ✅ **App.jsx** - Pass currentUser to GroupProfilePage
   - ✅ Updated route to pass currentUser prop: `<Route path='/group/:groupId' element={<GroupProfilePage currentUser={currentUser} />} />`

### How it works:
1. Click on group avatar or title in the chat header
2. User is navigated to `/group/:groupId` route
3. Group profile page fetches group data from API
4. Displays group info, creator, admins, and all members
5. Edit button only shows for creator/admin

### Files modified:
- `chatapp/frontend/src/components/GroupChat.jsx`
- `chatapp/frontend/src/components/groupViewPage.jsx`
- `chatapp/frontend/src/App.jsx`


