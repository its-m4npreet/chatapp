# OTP Authentication System - Visual Guide & Walkthrough

## 🎬 User Experience Flow

### Screen 1: Sign In Page
```
┌────────────────────────────────────────┐
│           Sign in to your account      │
│    Welcome back! Please enter details. │
├────────────────────────────────────────┤
│  Email: [________________]             │
│  Password: [________________]      👁️  │
│  ☐ Remember for 30 days  Forgot?     │
│  [    SIGN IN    ]                     │
├────────────────────────────────────────┤
│          ──── or ────                  │
│  [  Login with OTP  ]  ← NEW!         │
│  [  Continue with Google  ]           │
├────────────────────────────────────────┤
│  Don't have account? Sign up           │
└────────────────────────────────────────┘
```

**User Action:** Click "Login with OTP"

---

### Screen 2: Email Input
```
┌────────────────────────────────────────┐
│      Login with OTP                    │
│  Enter your email to receive           │
│  a one-time password                   │
├────────────────────────────────────────┤
│  Email: [________________________]      │
├────────────────────────────────────────┤
│  [        SEND OTP        ]            │
├────────────────────────────────────────┤
│  Back to password login                │
└────────────────────────────────────────┘
```

**What happens:**
- User enters email
- Clicks "Send OTP"
- Backend generates 6-digit code
- Email sent to inbox
- Frontend shows next screen

---

### Screen 3: Check Your Email
```
┌────────────────────────────────────────┐
│  📧 Check your email                   │
│                                        │
│  We sent a verification code to        │
│  user@example.com                      │
├────────────────────────────────────────┤
│  [   ENTER CODE MANUALLY   ]           │
│                                        │
│  ← Back to log in                      │
└────────────────────────────────────────┘
```

**User Action:** Click "Enter code manually"
**Meanwhile:** Email arrives in inbox with 6-digit code

---

### Screen 4: Enter OTP (6-Digit Input)
```
┌────────────────────────────────────────┐
│  📧 Check your email                   │
│                                        │
│  We sent a verification code to        │
│  user@example.com                      │
├────────────────────────────────────────┤
│  One-Time Password:                    │
│  [2] [4] [5] [8] [9] [1]              │
│                                        │
│  Code expires in 9:45                  │
│                                        │
│  [      VERIFY EMAIL      ]            │
├────────────────────────────────────────┤
│  Didn't receive?  [Resend]             │
│  ← Back                                │
└────────────────────────────────────────┘
```

**Features:**
- Individual input fields for each digit
- Auto-focus between fields
- Countdown timer (10 minutes)
- Resend button (shows when expired)
- Can paste all 6 digits at once

**User Action:** User enters code and clicks "Verify Email"

---

### Screen 5: Success!
```
┌────────────────────────────────────────┐
│           ✓ Email verified             │
│                                        │
│  Your email has been successfully      │
│  verified. Click below to log in       │
│  magically.                            │
├────────────────────────────────────────┤
│  [       CONTINUE       ]              │
└────────────────────────────────────────┘
```

**What happens:**
- Checkmark icon displayed
- Success message shown
- User clicks "Continue"
- JWT token generated
- User logged in
- Redirects to home page
- Session data saved

---

## 📊 Backend Process Flow

### Step 1: Send OTP
```
User Request
    ↓
┌─────────────────────────────────┐
│  POST /send-otp                 │
│  Body: { email: "..." }         │
└─────┬───────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  Controller: sendOtpCode()      │
│  ├─ Validate email              │
│  ├─ Find/Create user            │
│  └─ Call OTP Service            │
└─────┬───────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  Service: sendOTP()             │
│  ├─ Generate: "245891"          │
│  ├─ Save to DB                  │
│  └─ Send via Gmail SMTP         │
└─────┬───────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  Database: Save User            │
│  {                              │
│    email: "user@example.com"   │
│    otp: "245891"                │
│    otpExpiry: 2026-01-17T14:35  │
│    isEmailVerified: false       │
│  }                              │
└─────┬───────────────────────────┘
      ↓
┌─────────────────────────────────┐
│  Email Sent                     │
│  📧 to: user@example.com       │
│  Subject: OTP Code             │
│  Body: Your code: 245891       │
│  Expires: 10 minutes           │
└─────┬───────────────────────────┘
      ↓
Response to Frontend
{ 
  message: "OTP sent successfully",
  expiresIn: "10 minutes"
}
```

### Step 2: Verify OTP
```
User Request
    ↓
┌──────────────────────────────────┐
│  POST /verify-otp                │
│  Body: {                         │
│    email: "user@example.com"    │
│    otp: "245891"                 │
│  }                               │
└──────┬────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  Controller: verifyOtpCode()     │
│  ├─ Find user by email           │
│  ├─ Call OTP Service             │
│  └─ Check: OTP + Expiry          │
└──────┬────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  Service: verifyOTP()            │
│  ├─ Check expiry:                │
│  │  now <= 2026-01-17T14:35 ✓   │
│  └─ Check match:                 │
│     "245891" === "245891" ✓      │
└──────┬────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  Database: Update User           │
│  {                               │
│    isEmailVerified: true         │
│    otp: null (cleared)           │
│    otpExpiry: null (cleared)     │
│  }                               │
└──────┬────────────────────────────┘
       ↓
Response to Frontend
{ 
  message: "Email verified successfully",
  user: { id, name, email }
}
```

### Step 3: Login with OTP
```
User Request
    ↓
┌──────────────────────────────────┐
│  POST /login-with-otp            │
│  Body: { email: "..." }          │
└──────┬────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  Controller: loginWithEmail()    │
│  ├─ Find user                    │
│  ├─ Check isEmailVerified = true │
│  ├─ Generate JWT                 │
│  └─ Set cookie                   │
└──────┬────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  JWT Token Generated             │
│  {                               │
│    userId: "507f1f77bcf..."     │
│    exp: 7 days from now          │
│    iat: now                      │
│  }                               │
│  Signed with: SECRET_KEY         │
└──────┬────────────────────────────┘
       ↓
┌──────────────────────────────────┐
│  HTTP Cookie Set                 │
│  {                               │
│    name: "jwt"                   │
│    value: "eyJh..."              │
│    httpOnly: true (XSS protect)  │
│    secure: true (HTTPS)          │
│    sameSite: "lax"               │
│    maxAge: 7 days                │
│  }                               │
└──────┬────────────────────────────┘
       ↓
Response to Frontend
{ 
  message: "Login successful",
  token: "eyJh...",
  user: {
    id: "507f...",
    name: "John Doe",
    email: "user@example.com"
  }
}
```

---

## 🔄 Data Model Diagram

```
┌─────────────────────────────────────┐
│         User Collection             │
├─────────────────────────────────────┤
│ _id: ObjectId                       │
│ name: "John Doe"                    │
│ email: "john@example.com"           │
│ username: "johndoe123"              │
│ password: "hashed_pwd..."           │
│ googleId: null                      │
│ profilePicture: "https://..."       │
│ bio: "Hello world"                  │
│ ┌─── OTP Fields ─────────────────┐ │
│ │ otp: "245891"               │   │ │
│ │ otpExpiry: Date             │   │ │
│ │ isEmailVerified: true       │   │ │
│ └─────────────────────────────┘   │
│ friends: [ObjectId, ...]           │
│ createdAt: Date                    │
│ updatedAt: Date                    │
└─────────────────────────────────────┘

OTP Lifecycle:
┌──────────────────────────────┐
│ User created/found           │
│ otp: null, expiry: null      │
│ isEmailVerified: false       │
└──────────┬───────────────────┘
           ↓ Send OTP
┌──────────────────────────────┐
│ otp: "245891"                │
│ otpExpiry: 2026-01-17T14:35  │
│ isEmailVerified: false       │
└──────────┬───────────────────┘
           ↓ Verify OTP
┌──────────────────────────────┐
│ otp: null (cleared)          │
│ otpExpiry: null (cleared)    │
│ isEmailVerified: true        │
└──────────────────────────────┘
```

---

## 🎯 Component Interaction Diagram

```
App.jsx
  │
  ├─ Route: /signin → Signin.jsx
  │                    │
  │                    └─ [Login with OTP Button]
  │                           │
  │                           v
  ├─ Route: /otp-login → OtpAuthFlow.jsx (State: step, email, loading, error)
  │                         │
  │                         ├─ step="email" → Email Input Form
  │                         │                  ├─ Input: emailInput
  │                         │                  ├─ onSendOtp()
  │                         │                  └─ API: POST /send-otp
  │                         │
  │                         ├─ step="checking" → CheckingMail.jsx
  │                         │                     ├─ Props: email, onEnterCodeManually, onBackToSignin
  │                         │                     └─ API: (just UI)
  │                         │
  │                         ├─ step="otp" → EnterOtp.jsx
  │                         │                 ├─ Props: email, onBack, onSuccess
  │                         │                 ├─ State: code[], timeLeft, loading
  │                         │                 └─ API: POST /verify-otp, POST /send-otp (resend)
  │                         │
  │                         └─ step="success" → Success.jsx
  │                                             ├─ Props: email, onContinue
  │                                             ├─ API: POST /login-with-otp
  │                                             └─ navigate("/")
  │
  └─ Route: / → Home.jsx (Logged in!)
```

---

## 🔐 Security Layers

```
Layer 1: Email Validation
┌────────────────────────────┐
│ Frontend: Regex validation │
│ Backend: Email lookup      │
└────────────────────────────┘
           ↓
Layer 2: OTP Generation & Storage
┌────────────────────────────┐
│ Generate: Random 6-digit   │
│ Store: In DB with expiry   │
│ Timeout: 10 minutes        │
│ One-use: Cleared after use │
└────────────────────────────┘
           ↓
Layer 3: Email Delivery Security
┌────────────────────────────┐
│ SMTP: TLS encryption       │
│ Password: App-specific (not plain) │
│ From: Verified email       │
└────────────────────────────┘
           ↓
Layer 4: Verification Flag
┌────────────────────────────┐
│ isEmailVerified: boolean   │
│ Required for login         │
│ Prevents unauthorized use  │
└────────────────────────────┘
           ↓
Layer 5: JWT Token & Session
┌────────────────────────────┐
│ Token: Signed with secret  │
│ Expiry: 7 days             │
│ Cookie: HTTP-only (XSS)    │
│ Transport: HTTPS           │
└────────────────────────────┘
```

---

## 📱 Mobile UI Preview

```
┌─────────────────┐
│ Login with OTP  │
├─────────────────┤
│                 │
│ Your email?     │
│ [user@ex...]    │
│ [SEND OTP]      │
│                 │
│ Back to login   │
└─────────────────┘

         ↓

┌─────────────────┐
│ Check Email     │
├─────────────────┤
│ 📧              │
│ Code sent to    │
│ user@ex...      │
│ [ENTER CODE]    │
│ ← Back          │
└─────────────────┘

         ↓

┌─────────────────┐
│ Enter Code      │
├─────────────────┤
│ 📧              │
│ [2][4][5][8][9] │
│ [1]             │
│ 9:45 remaining  │
│ [VERIFY]        │
│ Resend ← Back   │
└─────────────────┘

         ↓

┌─────────────────┐
│ Success!        │
├─────────────────┤
│ ✓               │
│ Email verified  │
│ [CONTINUE]      │
└─────────────────┘

         ↓

Home Page (Logged in!)
```

---

## 🧪 Testing Matrix

```
Test Case          | Input                | Expected Output
───────────────────┼──────────────────────┼──────────────────────
Valid Email        | user@example.com     | OTP sent, email received
Invalid Email      | notanemail           | Error message shown
Empty Email        | (blank)              | Input required error
Valid OTP          | 245891               | Success screen shown
Invalid OTP        | 999999               | Invalid OTP error
Expired OTP        | (after 10 min)       | OTP expired + Resend btn
Paste Support      | Ctrl+V (6 digits)    | All fields auto-filled
Back Navigation    | ← button             | Return to prev screen
Mobile Responsive  | iPhone 12 size       | Layout adjusts properly
Multiple Users     | Different emails     | Each works independently
```

---

## 🚀 Deployment Architecture

```
                    Frontend
        ┌──────────────────────────────┐
        │  React SPA (Next.js/Vite)   │
        │  ├─ /otp-login route        │
        │  ├─ OtpAuthFlow component   │
        │  └─ Axios API client        │
        └────────────────┬─────────────┘
                         │
                  API Calls (HTTPS)
                         │
        ┌────────────────▼─────────────┐
        │     Backend (Express)        │
        │  ├─ /send-otp endpoint      │
        │  ├─ /verify-otp endpoint    │
        │  └─ /login-with-otp endpoint│
        └────────────────┬─────────────┘
                         │
                    Data Access
                         │
        ┌────────────────▼─────────────┐
        │    Database (MongoDB)        │
        │  User collection with:       │
        │  ├─ otp field               │
        │  ├─ otpExpiry field         │
        │  └─ isEmailVerified field   │
        └──────────────────────────────┘

        ┌────────────────────────────────┐
        │  Email Service (Gmail SMTP)    │
        │  ├─ Connected from Backend     │
        │  ├─ App-specific password     │
        │  └─ HTML email template       │
        └────────────────────────────────┘
```

---

## ✅ Completion Checklist

- [x] Backend OTP service created
- [x] Database schema updated
- [x] Auth controller functions added
- [x] Routes configured
- [x] Frontend components created/updated
- [x] API integration complete
- [x] Error handling implemented
- [x] Loading states added
- [x] Mobile responsive design
- [x] Security measures in place
- [x] Documentation complete
- [x] Ready for testing

