# Google OAuth Setup Guide

## Overview
Google Sign-in/Sign-up authentication has been integrated into your chat application using `react-oauth/google` on the frontend and `google-auth-library` on the backend.

## Features
- ✅ Google Sign-up: Create accounts directly via Google
- ✅ Google Sign-in: Login with existing Google accounts
- ✅ User Data Storage: Automatically saves user info to database
- ✅ Session Management: JWT tokens and localStorage integration
- ✅ Profile Picture: Uses Google profile picture if available

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:5173` (local development)
   - `http://localhost:3000` (if using different port)
   - Your production domain(s)
7. Copy your **Client ID**

### 2. Configure Frontend Environment

Create a `.env.local` file in `/frontend` directory:

```
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

### 3. Configure Backend Environment

Add to your `.env` file in `/backend` directory:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

### 4. Database Schema Update

The User model has been updated to support Google OAuth:

```javascript
{
  googleId: String,        // Stores Google's unique user ID
  password: String,        // Now optional for Google users
  profilePicture: String,  // Will be populated from Google
  // ... other fields
}
```

## File Changes

### Backend
- **`/backend/model/user.js`**: Added `googleId` field, made `password` optional
- **`/backend/controllers/auth.js`**: Added `googleAuth()` handler function
- **`/backend/routes/user.Route.js`**: Added `/google-auth` POST endpoint

### Frontend
- **`/frontend/src/main.jsx`**: Wrapped app with `GoogleOAuthProvider`
- **`/frontend/src/components/GoogleAuthButton.jsx`**: New reusable component
- **`/frontend/src/components/Signup.jsx`**: Integrated Google auth button
- **`/frontend/src/components/Signin.jsx`**: Integrated Google auth button

## How It Works

### Sign-Up Flow
1. User clicks "Sign in with Google" button
2. Google login popup appears
3. User authenticates with Google
4. Frontend receives credential token
5. Token sent to `/google-auth` endpoint
6. Backend verifies token using `google-auth-library`
7. User created in database if new, or existing user retrieved
8. JWT token generated and stored in localStorage
9. User redirected to home page

### Sign-In Flow
1. Same as Sign-Up flow
2. If user exists, they are logged in with existing account
3. If user doesn't exist, new account is created

## API Endpoint

### POST `/google-auth`

**Request:**
```json
{
  "credential": "GOOGLE_ID_TOKEN"
}
```

**Response (Success):**
```json
{
  "message": "Google authentication successful",
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "name": "User Name",
    "email": "user@example.com",
    "profilePicture": "PROFILE_PIC_URL"
  }
}
```

**Response (Error):**
```json
{
  "message": "Invalid Google token or authentication failed"
}
```

## Testing

### Local Development
1. Update `.env.local` in frontend with your Google Client ID
2. Update `.env` in backend with your Google Client ID
3. Start both frontend and backend servers
4. Navigate to Signup/Signin pages
5. Click "Sign in with Google" button
6. Test the authentication flow

### Test Accounts
You can use any Google account for testing, or add test user emails in Google Cloud Console.

## Troubleshooting

### Issue: "Google login popup doesn't appear"
- Check that `VITE_GOOGLE_CLIENT_ID` is correctly set
- Verify Client ID is authorized for your localhost URL
- Check browser console for errors

### Issue: "Invalid Google token"
- Verify `GOOGLE_CLIENT_ID` in backend `.env`
- Token might have expired - have user try again
- Check that token verification is using correct Client ID

### Issue: "User already exists" error when using Google
- Google user is being linked to existing email
- This is expected behavior for existing email accounts
- User can now sign in with either method (password or Google)

### Issue: Profile picture not loading
- Google might not provide picture in all cases
- Fallback default picture is provided in schema
- User can upload custom picture in profile settings

## Security Notes

- Google ID tokens are validated server-side using `google-auth-library`
- Tokens are verified before user creation/login
- Password is optional for Google OAuth users (not required)
- JWT tokens stored securely with HTTP-only cookies
- CORS and CSRF protections are in place

## Next Steps

1. **Frontend**: Add Google login success/error messages
2. **Backend**: Implement email verification for additional security
3. **Both**: Add logout functionality testing
4. **Frontend**: Add loading states during Google authentication
5. **Backend**: Log authentication attempts for analytics

## References

- [React OAuth/Google Documentation](https://www.npmjs.com/package/@react-oauth/google)
- [Google Auth Library Documentation](https://www.npmjs.com/package/google-auth-library)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
