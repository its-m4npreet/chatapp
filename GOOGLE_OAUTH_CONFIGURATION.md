# Google OAuth Configuration - Step by Step

## 🎯 Quick Start (5 Minutes)

### Step 1: Get Google OAuth Credentials (2 minutes)

1. Visit: https://console.cloud.google.com/
2. Log in with your Google account (or create one)
3. Create a new project:
   - Click project dropdown at top
   - Click "NEW PROJECT"
   - Name: "ChatApp" (or any name)
   - Click "CREATE"
4. Wait for project to be created, then select it

5. Enable Google+ API:
   - Click "APIs & Services" in left menu
   - Search for "Google+ API"
   - Click the result
   - Click "ENABLE"

6. Create OAuth 2.0 credentials:
   - Go to "Credentials" in left menu
   - Click "CREATE CREDENTIALS"
   - Select "OAuth Client ID"
   - Choose "Web application"
   - Fill in the form:
     - Name: "ChatApp Frontend"
     - Authorized JavaScript origins (add both):
       ```
       http://localhost:5173
       http://localhost:3000
       ```
     - Authorized redirect URIs (add both):
       ```
       http://localhost:5173/callback
       http://localhost:3000/callback
       ```
   - Click "CREATE"
   - Copy your **Client ID**
   - Click the download icon if you want to save as JSON

---

### Step 2: Configure Frontend (1 minute)

**File: `/frontend/.env.local`**

Create this file if it doesn't exist:
```
VITE_GOOGLE_CLIENT_ID=paste_your_client_id_here
```

Replace `paste_your_client_id_here` with the Client ID you copied from Step 1.

Example:
```
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

---

### Step 3: Configure Backend (1 minute)

**File: `/backend/.env`**

Add or update this line:
```
GOOGLE_CLIENT_ID=paste_your_client_id_here
```

Use the same Client ID from Step 1.

Example:
```
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

---

### Step 4: Restart Servers (1 minute)

**Terminal 1 - Stop and restart backend:**
```bash
cd /home/manpreet/Documents/projects/chatapp/chatapp/backend
# Press Ctrl+C to stop if running
npm run dev
```

**Terminal 2 - Stop and restart frontend:**
```bash
cd /home/manpreet/Documents/projects/chatapp/chatapp/frontend
# Press Ctrl+C to stop if running
npm run dev
```

---

### ✅ Done! Test it:

1. Open http://localhost:5173
2. Go to Sign In or Sign Up page
3. Click "Sign in with Google"
4. You should see Google's popup!

---

## 🚀 Production Deployment

### For production, update your Google OAuth settings:

1. Go to Google Cloud Console
2. Credentials → OAuth Client ID → Edit your web application
3. Add production URLs to:
   - **Authorized JavaScript origins:**
     ```
     https://yourdomain.com
     https://www.yourdomain.com
     ```
   - **Authorized redirect URIs:**
     ```
     https://yourdomain.com/callback
     https://www.yourdomain.com/callback
     ```

4. Update production environment variables:
   - Frontend: Same Client ID (works everywhere)
   - Backend: Same Client ID (works everywhere)

---

## 🔍 Verification Checklist

After configuration, verify everything works:

### Frontend Checks
- [ ] Can see "Sign in with Google" button on signin page
- [ ] Can see "Sign in with Google" button on signup page
- [ ] Google button is visible and clickable
- [ ] Clicking button opens Google login popup

### Backend Checks
- [ ] Backend is running without errors
- [ ] No "GOOGLE_CLIENT_ID is not defined" errors in logs
- [ ] No database connection errors

### Integration Checks
- [ ] Can authenticate with Google account
- [ ] Successfully redirected to home page after login
- [ ] User data appears in database
- [ ] Token stored in browser localStorage
- [ ] Can access protected routes after login

### Data Verification
Check MongoDB to verify user was created:
```javascript
// In MongoDB shell
db.users.find({ googleId: { $exists: true } })

// Should return something like:
{
  _id: ObjectId(...),
  name: "John Doe",
  email: "john@gmail.com",
  googleId: "118194341826854321234",
  profilePicture: "https://lh3.googleusercontent.com/...",
  ...
}
```

---

## ⚠️ Common Issues & Fixes

### Issue 1: "Cannot find VITE_GOOGLE_CLIENT_ID"
**Solution:**
- Check file is named `.env.local` (not `.env.local.example`)
- Restart frontend server after creating `.env.local`
- Make sure you're using the correct environment variable name

### Issue 2: "Google button doesn't work on signin/signup"
**Solution:**
- Verify GoogleOAuthProvider is in main.jsx
- Check that Client ID is correct
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for errors (F12)

### Issue 3: "Token verification failed on backend"
**Solution:**
- Verify backend GOOGLE_CLIENT_ID matches frontend
- Make sure token is not expired
- Restart backend after updating .env
- Check backend logs for error messages

### Issue 4: "User not showing in database"
**Solution:**
- Verify MongoDB is running
- Check database connection string in backend
- Look for MongoDB connection errors in console
- Try logging in again

### Issue 5: "Localhost not authorized"
**Solution:**
- Go to Google Cloud Console
- Edit OAuth Client ID credentials
- Add `http://localhost:5173` to authorized origins
- Add `http://localhost:5173/callback` to authorized URIs
- Wait a few seconds, then try again

---

## 🧪 Testing Different Scenarios

### Scenario 1: First Time Sign Up
1. Open http://localhost:5173/signup
2. Click "Sign in with Google"
3. Sign in with Google account you haven't used before
4. Should create new account automatically
5. Check database to see user created with `googleId`

### Scenario 2: Return User Sign In
1. Use Google account from Scenario 1
2. Open http://localhost:5173/signin
3. Click "Sign in with Google"
4. Should log in existing user
5. Check that token is generated

### Scenario 3: Same Email, Different Auth
1. Create account with email/password on signup page
2. Later, try to sign up with Google using same email
3. Should retrieve existing user and link Google
4. User can now login with either method

### Scenario 4: Profile Picture
1. Sign up with Google account that has profile picture
2. Check your profile page
3. Should show Google's profile picture
4. Option to upload different picture available

---

## 📊 Monitoring & Logging

### Add logging to verify authentication:

**Backend - In googleAuth function:**
```javascript
console.log("Received Google credential");
console.log("Token verified successfully");
console.log("User found/created:", user.email);
console.log("JWT token generated");
```

### Check logs:
```bash
# Terminal where backend is running
npm run dev

# Look for messages like:
# Received Google credential
# Token verified successfully
# User found/created: john@gmail.com
# JWT token generated
```

### Frontend logging (in browser console):
1. Open DevTools: F12
2. Go to Console tab
3. Look for messages from GoogleAuthButton
4. Can see API response and token details

---

## 🔐 Security Best Practices

1. **Never commit .env files**
   - Add to .gitignore
   - Store separately on production servers

2. **Use environment-specific credentials**
   - Different OAuth apps for dev/staging/production
   - Never reuse credentials across environments

3. **Verify tokens server-side**
   - Always verify on backend, never trust frontend
   - Use official Google library for verification

4. **Keep credentials secure**
   - Never log or expose Client IDs
   - Rotate credentials if compromised
   - Use access control in Google Cloud Console

5. **Monitor authentication**
   - Log successful and failed attempts
   - Set up alerts for suspicious activity
   - Regular security audits

---

## 📞 Need Help?

### Check these resources:
1. **Frontend issues**: Check [GoogleAuthButton component](src/components/GoogleAuthButton.jsx)
2. **Backend issues**: Check [googleAuth controller function](controllers/auth.js)
3. **Google OAuth docs**: https://developers.google.com/identity/protocols/oauth2
4. **Google Libraries**: https://www.npmjs.com/package/google-auth-library

### Common commands:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Restart backend
npm run dev

# Restart frontend
npm run dev

# Clear browser cache
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete
# Safari: Cmd+Shift+Delete
```

---

## ✅ You're Ready!

You have successfully configured Google OAuth for your chat application. 

**Next steps:**
1. Test the authentication flow
2. Share with users
3. Monitor for issues
4. Prepare for production deployment

**Happy chatting! 🎉**
