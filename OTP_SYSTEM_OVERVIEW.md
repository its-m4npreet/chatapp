# OTP Authentication System - Complete Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Signin.jsx ────── "Login with OTP" button                         │
│      ↓                                                              │
│  OtpAuthFlow.jsx (State Manager)                                   │
│  ├─ Step 1: Email Input                                           │
│  │  └─ User enters email                                          │
│  │     └─ Calls: POST /send-otp                                   │
│  │                                                                 │
│  ├─ Step 2: CheckingMail.jsx                                      │
│  │  └─ Shows confirmation screen                                  │
│  │  └─ Button: "Enter code manually"                              │
│  │                                                                 │
│  ├─ Step 3: EnterOtp.jsx                                          │
│  │  └─ 6 digit input fields                                       │
│  │  └─ Timer countdown (10 min)                                   │
│  │  └─ Calls: POST /verify-otp                                    │
│  │  └─ Resend option when expired                                 │
│  │                                                                 │
│  └─ Step 4: Success.jsx                                           │
│     └─ Confirmation with checkmark                                │
│     └─ Calls: POST /login-with-otp                                │
│     └─ Redirects to Home (/home)                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              ↓ API Calls ↓
┌────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Routes: /send-otp                                               │
│    ↓                                                              │
│  Controller: sendOtpCode()                                        │
│    ├─ Validate email                                             │
│    ├─ Generate 6-digit OTP                                       │
│    ├─ Save to User in DB with 10-min expiry                      │
│    └─ Call OTP Service                                           │
│         ↓                                                          │
│      Services/otpService.js                                       │
│        └─ sendOTP(email, otp)                                    │
│           └─ Send via Gmail SMTP                                 │
│                                                                    │
│  Routes: /verify-otp                                             │
│    ↓                                                              │
│  Controller: verifyOtpCode()                                      │
│    ├─ Get user from DB                                           │
│    ├─ Call verifyOTP() service                                   │
│    ├─ Check OTP matches                                          │
│    ├─ Check not expired                                          │
│    ├─ Set isEmailVerified = true                                 │
│    └─ Clear OTP from DB                                          │
│                                                                    │
│  Routes: /login-with-otp                                         │
│    ↓                                                              │
│  Controller: loginWithVerifiedEmail()                             │
│    ├─ Get verified user from DB                                  │
│    ├─ Generate JWT token (7d expiry)                             │
│    ├─ Set HTTP-only cookie                                       │
│    └─ Return token + user data                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              ↓ Store ↓
┌────────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  User Schema                                                       │
│  {                                                                 │
│    _id: ObjectId                                                  │
│    name: String                                                   │
│    email: String (unique)                                         │
│    password: String                                               │
│    googleId: String                                               │
│    profilePicture: String                                         │
│    ───────── OTP Fields ───────                                   │
│    otp: String          (6-digit code)                           │
│    otpExpiry: Date      (10-minute timeout)                      │
│    isEmailVerified: Boolean  (verification status)               │
│    ───────────────────────────                                    │
│    ... other fields ...                                           │
│  }                                                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Data Flow: Complete User Journey

### 1. User Initiates OTP Login
```
User clicks "Login with OTP" on Signin page
            ↓
Navigates to /otp-login route
            ↓
OtpAuthFlow component loads
            ↓
Shows email input form
```

### 2. Send OTP
```
User enters: user@example.com
User clicks: "Send OTP"
            ↓
Frontend: POST /send-otp { email: "user@example.com" }
            ↓
Backend: 
  - Create/Find user in DB
  - Generate OTP: "245891"
  - Set expiry: now + 10 minutes
  - Save to DB: user.otp = "245891", user.otpExpiry = timestamp
  - Call sendOTP()
            ↓
OTP Service (Nodemailer):
  - Connect to Gmail SMTP
  - Create email with HTML template
  - Send to user@example.com
  - Return success
            ↓
User receives email:
  "Your OTP: 245891 (expires in 10 minutes)"
            ↓
Frontend: Shows "Check your email" screen
```

### 3. Enter OTP
```
User clicks: "Enter code manually"
            ↓
Frontend: Shows 6 input fields
User receives email with OTP
User enters: 2 4 5 8 9 1
User clicks: "Verify"
            ↓
Frontend: POST /verify-otp { email: "user@example.com", otp: "245891" }
            ↓
Backend:
  - Find user in DB by email
  - Get stored OTP and expiry
  - verifyOTP() checks:
    ✓ Not expired? Date.now() < otpExpiry
    ✓ Matches? "245891" === "245891"
  - If valid:
    - Set user.isEmailVerified = true
    - Clear OTP: user.otp = null
    - Clear expiry: user.otpExpiry = null
    - Save to DB
  - Return success
            ↓
Frontend: Shows "Email verified" success screen
```

### 4. Login & Redirect
```
User clicks: "Continue"
            ↓
Frontend: POST /login-with-otp { email: "user@example.com" }
            ↓
Backend:
  - Find user by email
  - Check isEmailVerified = true
  - Generate JWT: jwt.sign({ userId: user._id }, SECRET, 7d)
  - Set HTTP-only cookie
  - Return: { token, user: {...} }
            ↓
Frontend:
  - Save token to localStorage
  - Save user data to localStorage
  - Redirect to "/" (home page)
            ↓
User logged in! ✓
```

## Security Layers

```
┌─────────────────────────────────────────┐
│     Security Features in OTP System     │
├─────────────────────────────────────────┤
│                                         │
│ Layer 1: Email Security                │
│  └─ Gmail SMTP with app-specific pwd  │
│     └─ Not stored in plain text       │
│     └─ Requires 2FA setup             │
│                                         │
│ Layer 2: OTP Validation                │
│  └─ 6-digit random code               │
│  └─ 10-minute expiration              │
│  └─ Cleared after use                 │
│  └─ One-time use only                 │
│                                         │
│ Layer 3: Email Verification Flag      │
│  └─ isEmailVerified boolean           │
│  └─ Required for login                │
│  └─ Prevents unauthorized access      │
│                                         │
│ Layer 4: JWT Token                     │
│  └─ Generated after verification      │
│  └─ 7-day expiration                  │
│  └─ HTTP-only cookie (XSS protection) │
│  └─ Signed with secret                │
│                                         │
│ Layer 5: Database Security             │
│  └─ MongoDB unique email index         │
│  └─ No passwords in OTP flow          │
│  └─ Timestamps for audit              │
│                                         │
└─────────────────────────────────────────┘
```

## Component Hierarchy

```
App.jsx
├─ AppRoutes
│  ├─ Route: /signin
│  │  └─ Signin.jsx
│  │     └─ [Button] "Login with OTP"
│  │        └─ navigate("/otp-login")
│  │
│  └─ Route: /otp-login
│     └─ OtpAuthFlow.jsx (State Manager)
│        ├─ State: step, email, emailInput, loading, error
│        │
│        ├─ Conditional Render:
│        │  │
│        │  ├─ step="email"
│        │  │  └─ [Email Input Form]
│        │  │     ├─ Input: emailInput
│        │  │     ├─ Button: "Send OTP"
│        │  │     └─ Link: "Back to password login"
│        │  │
│        │  ├─ step="checking"
│        │  │  └─ CheckingMail.jsx
│        │  │     ├─ Shows: email address
│        │  │     ├─ Button: "Enter code manually"
│        │  │     └─ Link: "Back to login"
│        │  │
│        │  ├─ step="otp"
│        │  │  └─ EnterOtp.jsx
│        │  │     ├─ 6 Input fields (auto-focus)
│        │  │     ├─ Timer countdown
│        │  │     ├─ Button: "Verify email"
│        │  │     ├─ Button: "Resend OTP" (when expired)
│        │  │     └─ Link: "Back"
│        │  │
│        │  └─ step="success"
│        │     └─ Success.jsx
│        │        ├─ Checkmark icon
│        │        ├─ Message: "Email verified"
│        │        ├─ Button: "Continue"
│        │        └─ Auto-redirects to Home
```

## Key Algorithms

### OTP Generation
```javascript
function generateOTP() {
  // Range: 100000 to 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// Example outputs: "234891", "512847", "789123"
```

### OTP Expiry Check
```javascript
function verifyOTP(userOTP, storedOTP, otpExpiry) {
  if (new Date() > otpExpiry) {
    return { success: false, message: 'OTP has expired' };
  }
  
  if (userOTP === storedOTP) {
    return { success: true, message: 'OTP verified successfully' };
  }
  
  return { success: false, message: 'Invalid OTP' };
}
```

### Timer Countdown
```javascript
useEffect(() => {
  if (timeLeft <= 0) {
    setIsExpired(true);
    return;
  }

  const interval = setInterval(() => {
    setTimeLeft((prev) => prev - 1);
  }, 1000);

  return () => clearInterval(interval);
}, [timeLeft]);
// Updates every second from 600 to 0
```

## Configuration Options

### OTP Length
**Current:** 6 digits
**To change:** Edit `generateOTP()` in otpService.js
```javascript
// For 4 digits:
return Math.floor(1000 + Math.random() * 9000).toString();
// For 8 digits:
return Math.floor(10000000 + Math.random() * 90000000).toString();
```

### Expiry Duration
**Current:** 10 minutes
**To change:** Edit line 31 in otpService.js
```javascript
// For 5 minutes:
const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
// For 30 minutes:
const otpExpiry = new Date(Date.now() + 30 * 60 * 1000);
```

### JWT Token Expiry
**Current:** 7 days
**To change:** Edit auth controller, loginWithVerifiedEmail function
```javascript
// For 24 hours:
const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
```

## Error Handling Strategy

```
Send OTP
  ├─ Email validation ✓
  │  └─ If invalid → "Please enter a valid email address"
  │
  ├─ Database save ✓
  │  └─ If fails → "Server error"
  │
  └─ Email sending ✓
     └─ If fails → "Failed to send OTP"

Verify OTP
  ├─ Input validation ✓
  │  └─ If not 6 digits → "Please enter all 6 digits"
  │
  ├─ OTP lookup ✓
  │  └─ If not found → "User not found"
  │
  ├─ Expiry check ✓
  │  └─ If expired → "OTP has expired" + "Resend" button
  │
  └─ Matching ✓
     └─ If mismatch → "Invalid OTP"

Login with OTP
  ├─ User lookup ✓
  │  └─ If not found → "User not found"
  │
  └─ Verification check ✓
     └─ If not verified → "Email is not verified"
```

