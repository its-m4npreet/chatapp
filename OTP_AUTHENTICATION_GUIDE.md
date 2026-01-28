# OTP Authentication System Setup Guide

## Overview
Complete OTP (One-Time Password) authentication flow for email verification with login, including backend logic using Nodemailer and frontend UI components.

**Flow:** Email → Send OTP → Receive OTP → Enter OTP → Verify → Login

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
- `isEmailVerified`: Boolean flag for email verification status

### 3. OTP Service (`backend/services/otpService.js`)
Handles all OTP operations:
- **generateOTP()**: Creates random 6-digit code
- **sendOTP(email, otp)**: Sends OTP via Gmail SMTP
- **verifyOTP(userOTP, storedOTP, otpExpiry)**: Validates OTP and checks expiry

### 4. Backend Routes
Three new endpoints added to `/user` routes:

#### POST `/send-otp`
Sends OTP to provided email
- **Body:** `{ email: "user@example.com" }`
- **Response:** `{ message: "OTP sent successfully", email, expiresIn: "10 minutes" }`

#### POST `/verify-otp`
Verifies the OTP entered by user
- **Body:** `{ email: "user@example.com", otp: "123456" }`
- **Response:** `{ message: "Email verified successfully", user: {...} }`

#### POST `/login-with-otp`
Logs in user after OTP verification
- **Body:** `{ email: "user@example.com" }`
- **Response:** `{ message: "Login successful", token: "jwt_token", user: {...} }`

---

## Frontend Implementation

### Components Created

#### 1. **OtpAuthFlow.jsx** (Main Component)
Orchestrates the entire OTP authentication flow with state management.
- Manages 4 steps: email input → checking mail → OTP entry → success
- Handles API calls to backend
- Responsive design for mobile

#### 2. **chekingMail.jsx** (Check Email Screen)
Shows after OTP is sent
- Displays email address where OTP was sent
- "Enter code manually" button to go to OTP input
- "Back to login" button
- Uses your original UI design

#### 3. **enterOtp.jsx** (Enter OTP Screen)
6-digit OTP input with features:
- Individual input fields for each digit
- Auto-focus between fields
- Paste support (paste all 6 digits at once)
- 10-minute countdown timer
- Resend OTP button when expired
- Real-time validation against backend
- Uses your original UI design

#### 4. **success.jsx** (Success Screen)
Confirmation screen after verification
- Shows green checkmark icon
- "Continue" button to login
- Handles automatic login and redirect to home
- Uses your original UI design

### Frontend Routes
Added new route `/otp-login` to App.jsx that renders OtpAuthFlow component

### Integration Points

1. **Signin.jsx Updated**
   - Added "Login with OTP" button below divider
   - Navigates to `/otp-login` when clicked

2. **API Integration**
   - Uses axios to communicate with backend
   - Stores JWT token and user data in localStorage on successful login
   - Proper error handling with user-friendly messages

---

## User Flow Diagram

```
START
  ↓
[Email Input Screen]
  ↓ User enters email → "Send OTP" button
  ↓
[Backend: Generate OTP, Save to DB, Send via Email]
  ↓
[Check Email Screen]
  ↓ User sees email address where code was sent
  ↓ Click "Enter code manually"
  ↓
[Enter OTP Screen]
  ↓ User receives email with 6-digit code
  ↓ User enters code in 6 input fields
  ↓
[Backend: Verify OTP, Check Expiry]
  ↓
[Success Screen]
  ↓
[Backend: Generate JWT, Login User]
  ↓
[Redirect to Home Dashboard]
```

---

## API Examples

### Send OTP
```bash
curl -X POST http://localhost:5000/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:5000/api/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'
```

### Login with OTP
```bash
curl -X POST http://localhost:5000/api/login-with-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

## Security Features

✅ **OTP Expiry:** 10-minute timeout (changeable in otpService.js)
✅ **Secure Email:** Uses Gmail SMTP with app-specific passwords
✅ **JWT Tokens:** Generated after successful verification
✅ **Verification Flag:** `isEmailVerified` tracks email status
✅ **OTP Clearing:** OTP and expiry cleared after verification

---

## Testing the Flow

1. **Start backend server:**
   ```bash
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Navigate to:**
   - Sign in page → Click "Login with OTP" button, OR
   - Directly visit: `http://localhost:5173/otp-login`

4. **Enter test email:** Use a real email address (Gmail recommended)

5. **Check inbox:** Look for email with subject "Your OTP for ChatApp Verification"

6. **Enter code:** Copy 6-digit code and enter in the OTP input fields

---

## Customization

### Change OTP Expiry Time
Edit `backend/services/otpService.js`, line 31:
```javascript
const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Change 10 to desired minutes
```

### Change Email Template
Edit the HTML template in `sendOTP()` function in `otpService.js` to customize email design

### Styling
All components use Tailwind CSS classes. Update className attributes to match your design system.

---

## Troubleshooting

**Issue:** OTP email not sending
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Verify Gmail app password is correct (16 characters)
- Check Gmail "Less secure app access" settings

**Issue:** "Invalid OTP" error
- OTP is case-sensitive
- Ensure OTP hasn't expired (10 minutes limit)
- Database connectivity check

**Issue:** CORS errors
- Check backend CORS configuration in index.js
- Verify frontend axios baseURL is correct

---

## Files Modified/Created

### Backend
- ✅ `model/user.js` - Added OTP fields
- ✅ `services/otpService.js` - OTP logic
- ✅ `controllers/auth.js` - Added 3 new functions
- ✅ `routes/user.Route.js` - Added 3 new routes

### Frontend
- ✅ `components/OtpAuthFlow.jsx` - Main orchestrator (NEW)
- ✅ `components/chekingMail.jsx` - Updated with backend integration
- ✅ `components/enterOtp.jsx` - Updated with backend integration
- ✅ `components/success.jsx` - Updated with backend integration
- ✅ `components/Signin.jsx` - Added OTP login button
- ✅ `App.jsx` - Added `/otp-login` route

---

## Next Steps

1. Test thoroughly with your email provider
2. Customize email template with your branding
3. Add optional features:
   - Max login attempts with lockout
   - Email verification for signup
   - Password reset via OTP
   - SMS-based OTP option

