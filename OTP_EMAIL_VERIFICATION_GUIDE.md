# OTP Email Verification After Signup - Setup Guide

## Overview
Complete OTP (One-Time Password) email verification flow integrated into the signup process. After users create an account, they must verify their email with a 6-digit OTP before they can access the app.

**Flow:** Sign Up → Email Verification with OTP → Verify Email → Auto-login → Dashboard

---

## What Changed from Previous Version

The OTP system has been **redesigned from a separate login method to an email verification step during signup**:

| Previous | Current |
|----------|---------|
| OTP was optional login method | OTP required for all new signups |
| Users could login with email/OTP or password | Users must verify email after signup |
| Separate `/otp-login` route | Integrated into signup flow via `/verify-email` |
| `sendOtpCode` endpoint | Removed (OTP sent automatically during signup) |
| `loginWithVerifiedEmail` endpoint | Removed (auto-login after verification) |
| 3 OTP endpoints | 2 OTP endpoints (verify-otp, resend-otp) |

---

## Backend Setup

### 1. Environment Variables (.env)
Add these email configuration variables to your `.env` file:

```env
# Gmail SMTP Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

**How to get Gmail App Password:**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification (if not already enabled)
3. Go to App passwords → Select Mail & Windows → Generate
4. Copy the 16-character password and paste in `EMAIL_PASSWORD`

### 2. Database Model Updates
The User model now includes OTP fields:
- `otp`: Stores the generated 6-digit code
- `otpExpiry`: Timestamp when OTP expires (10 minutes)
- `isEmailVerified`: Boolean flag for email verification status (default: false)

### 3. OTP Service (`backend/services/otpService.js`)
Handles all OTP operations:
- **generateOTP()**: Creates random 6-digit code
- **sendOTP(email, otp)**: Sends OTP via Gmail SMTP
- **verifyOTP(userOTP, storedOTP, otpExpiry)**: Validates OTP and checks expiry

### 4. Backend Auth Flow Changes

#### Signup Endpoint: POST `/signup`
Now includes automatic OTP generation and sending:
- **Request:** `{ name, email, password }`
- **Response:** 
  ```json
  {
    "message": "User created. OTP sent to email for verification.",
    "email": "user@example.com",
    "expiresIn": "10 minutes"
  }
  ```

#### Backend Routes Updated

| Route | Method | Purpose | Notes |
|-------|--------|---------|-------|
| `/signup` | POST | Create account + send OTP | **UPDATED** - Now sends OTP automatically |
| `/verify-otp` | POST | Verify OTP code | **UPDATED** - Auto-logs user in after verification |
| `/resend-otp` | POST | Resend OTP | **NEW** - Resend if expired |
| `/signin` | POST | Normal login | Unchanged - requires email verification first |

**Removed Endpoints:**
- `✗ /send-otp` - OTP sent automatically during signup
- `✗ /login-with-otp` - Not needed, auto-login after verification

### 5. Modified Auth Controller Functions

#### `signUp()` - Now sends OTP
```javascript
// Generates OTP immediately after user creation
const otp = generateOTP();
const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

const newUser = new User({
  name, email, password: hashedPassword,
  otp, otpExpiry,
  isEmailVerified: false
});

await sendOTP(email, otp);
```

#### `verifyOtpCode()` - Updated to auto-login
```javascript
// After OTP verification, generates JWT and returns token
const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
res.cookie('jwt', token, { httpOnly: true, ... });
// Returns token + user data for immediate login
```

#### `resendOtpCode()` - New function
```javascript
// Generates new OTP and resends email
const otp = generateOTP();
user.otp = otp;
user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
await sendOTP(email, otp);
```

---

## Frontend Implementation

### Updated User Flow

```
START
  ↓
[Signup Form] - name, email, password
  ↓ Click "Sign Up"
  ↓
[Backend: Hash password, Create user, Generate OTP, Send Email]
  ↓
[Check Email Screen] - "We sent verification code to your email"
  ↓ User receives email with 6-digit code
  ↓ Click "Enter code manually"
  ↓
[Enter OTP Screen] - 6 digit input fields
  ↓ User enters code
  ↓
[Backend: Verify OTP, Check Expiry, Generate JWT, Auto-login]
  ↓
[Success Screen] - "Email verified, you are logged in"
  ↓ Click "Continue"
  ↓
[Redirect to Home Dashboard] ✓ Logged in and verified
```

### Components

#### 1. **Signup.jsx** (Updated)
- Form with name, email, password
- On submit, calls `/signup`
- Redirects to `/verify-email` with email passed in state
- **Key change:** Now navigates to verification instead of signin

#### 2. **VerifyEmail.jsx** (New)
- Main orchestrator component for email verification
- Manages 3 steps: checking mail → enter OTP → success
- Automatically starts at "checking" step when user arrives from signup
- Handles navigation between screens

#### 3. **chekingMail.jsx** (Reused)
- Shows email address where code was sent
- "Enter code manually" button to go to OTP input
- "Back to signup" button

#### 4. **enterOtp.jsx** (Reused)
- 6-digit OTP input with individual fields
- Auto-focus between fields
- Paste support
- 10-minute countdown timer
- Resend OTP button
- Calls `POST /verify-otp` endpoint
- On success, shows success screen

#### 5. **success.jsx** (Updated)
- Shows green checkmark and "Email verified"
- "Continue" button navigates to home
- **Key change:** User is already logged in (no extra login call needed)

### New Route

| Route | Component | Purpose |
|-------|-----------|---------|
| `/verify-email` | VerifyEmail | Email verification after signup |

**Removed:**
- `✗ /otp-login` - No longer needed

### API Integration Points

**During Signup:**
```javascript
POST /signup
Body: { name, email, password }
Response: { message, email, expiresIn }
```

**During Email Verification:**
```javascript
POST /verify-otp
Body: { email, otp }
Response: { message, token, user }
// Automatically saves token to localStorage
```

**Resend OTP:**
```javascript
POST /resend-otp
Body: { email }
Response: { message, expiresIn }
```

---

## Testing the Flow

1. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test signup with verification:**
   - Navigate to http://localhost:5173/signup
   - Fill form: name, email (use Gmail), password
   - Click "Sign Up"
   - Should redirect to verification screen
   - Check email for 6-digit OTP code
   - Enter code in OTP fields
   - Should see success screen
   - Click "Continue"
   - Should be on home dashboard (logged in)

4. **Test resend OTP:**
   - On OTP entry screen, wait for timer to expire
   - "Resend OTP" button appears
   - Click to resend
   - Check email again for new code

---

## Security Features

✅ **OTP Expiry:** 10-minute timeout (changeable in otpService.js)
✅ **Secure Email:** Uses Gmail SMTP with app-specific passwords (not plain text)
✅ **JWT Tokens:** Generated after successful verification (7-day expiry)
✅ **Verification Flag:** `isEmailVerified` tracks email status in database
✅ **OTP Clearing:** OTP and expiry cleared after verification (no replay attacks)
✅ **HTTP-Only Cookies:** XSS protection for JWT tokens
✅ **One-Time Use:** OTP can only be used once and expires after 10 minutes

---

## Customization Options

### Change OTP Expiry Time
Edit `backend/services/otpService.js`, line 31:
```javascript
const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Change 10 to desired minutes
```

### Change Email Template
Edit the HTML template in `sendOTP()` function in `otpService.js` to customize email design

### Styling
All components use Tailwind CSS classes. Update className attributes to match your design system.

### Allow Password Login Without Email Verification
Modify `/signin` endpoint to check `isEmailVerified`:
```javascript
// Optional: comment out this check to allow login
if (!user.isEmailVerified) {
    return res.status(400).json({ message: "Please verify your email first" });
}
```

---

## Troubleshooting

**Issue:** OTP email not sending
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Verify Gmail app password is correct (16 characters)
- Check Gmail "Less secure app access" settings

**Issue:** "Invalid OTP" error
- OTP is case-sensitive and numeric only
- Ensure OTP hasn't expired (10 minutes limit)
- Database connectivity check

**Issue:** User stuck on verification screen
- Check browser console for API errors
- Verify backend is running
- Check email inbox and spam folder

**Issue:** CORS errors
- Check backend CORS configuration in index.js
- Verify frontend axios baseURL is correct

---

## Files Modified/Created

### Backend
- ✅ `model/user.js` - Already has OTP fields
- ✅ `services/otpService.js` - OTP logic (unchanged)
- ✅ `controllers/auth.js` - Updated `signUp()`, `verifyOtpCode()`, added `resendOtpCode()`
- ✅ `routes/user.Route.js` - Updated routes (removed `/send-otp` and `/login-with-otp`)

### Frontend
- ✅ `components/VerifyEmail.jsx` - NEW main orchestrator
- ✅ `components/Signup.jsx` - Updated to redirect to verification
- ✅ `components/chekingMail.jsx` - Reused
- ✅ `components/enterOtp.jsx` - Reused
- ✅ `components/success.jsx` - Updated (no extra login needed)
- ✅ `components/Signin.jsx` - Removed OTP login button
- ✅ `App.jsx` - Changed `/otp-login` to `/verify-email`

---

## Next Steps

1. ✅ Configure Gmail credentials in .env
2. ✅ Test signup with email verification
3. ✅ Test OTP resend functionality
4. ✅ Customize email template with your branding
5. ✅ Test on mobile devices
6. ✅ Deploy to staging environment
7. ✅ Deploy to production

---

## API Endpoint Summary

### Signup with OTP
```bash
POST /signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response 201:
{
  "message": "User created. OTP sent to email for verification.",
  "email": "john@example.com",
  "expiresIn": "10 minutes"
}
```

### Verify Email with OTP
```bash
POST /verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}

Response 200:
{
  "message": "Email verified successfully. You are now logged in.",
  "token": "eyJhbGc...",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "profilePicture": "..."
  }
}
```

### Resend OTP
```bash
POST /resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}

Response 200:
{
  "message": "OTP resent successfully",
  "email": "john@example.com",
  "expiresIn": "10 minutes"
}
```

---

## Version History

**v2.0** - OTP Email Verification on Signup
- Changed from optional OTP login to required email verification
- Integrated OTP into signup flow
- Auto-login after email verification
- Improved security with verified email flag

**v1.0** - OTP as Alternative Login Method
- Optional OTP login method
- Separate from signup process

