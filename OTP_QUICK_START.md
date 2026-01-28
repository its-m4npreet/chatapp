# OTP Authentication - Quick Reference

## Setup Checklist

- [ ] Add `EMAIL_USER` and `EMAIL_PASSWORD` to `.env`
- [ ] Get Gmail app password from account settings
- [ ] Verify backend services/otpService.js exists
- [ ] Check auth controller has OTP functions
- [ ] Verify routes include OTP endpoints
- [ ] Frontend OTP components are in place
- [ ] App.jsx includes `/otp-login` route
- [ ] Signin.jsx has "Login with OTP" button

## User Flow

```
User clicks "Login with OTP"
         ↓
Enter email → Send OTP button
         ↓
Check email screen (shows sent email address)
         ↓
Click "Enter code manually"
         ↓
Enter 6 digits → Verify button
         ↓
Success screen
         ↓
Click Continue → Login & Redirect to Home
```

## Environment Variables

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=16-character-app-password
```

## API Endpoints

| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/send-otp` | `{email}` | `{message, email, expiresIn}` |
| POST | `/verify-otp` | `{email, otp}` | `{message, user}` |
| POST | `/login-with-otp` | `{email}` | `{message, token, user}` |

## Key Features

✅ 6-digit OTP code
✅ 10-minute expiration
✅ Email verification via Gmail SMTP
✅ JWT token generation
✅ Responsive UI design
✅ Auto-focus between fields
✅ Paste support (6 digits at once)
✅ Countdown timer
✅ Resend OTP option
✅ Error handling

## Frontend Components

1. **OtpAuthFlow.jsx** - Orchestrator (routes between steps)
2. **chekingMail.jsx** - After OTP sent screen
3. **enterOtp.jsx** - 6-digit input screen
4. **success.jsx** - Verification success screen
5. **Signin.jsx** - Updated with OTP button

## Testing

1. Go to `/signin` → Click "Login with OTP"
2. Enter email → Receive OTP
3. Enter 6 digits → See success screen
4. Click Continue → Logged in!

## Gmail Setup

1. Enable 2-Step Verification
2. Go to App passwords
3. Select Mail & Windows
4. Generate new password
5. Copy 16-character password to .env

## Customization Points

- **OTP Length:** Change from 6 to any number (otpService.js)
- **Expiry Time:** Default 10 minutes (otpService.js line 31)
- **Email Template:** HTML in sendOTP() function (otpService.js)
- **Styling:** Tailwind classes in each component

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check EMAIL_USER/PASSWORD in .env |
| "Invalid OTP" | Check OTP hasn't expired (10 min limit) |
| CORS errors | Verify backend CORS config |
| No email received | Check spam folder, verify app password format |

## Files Changed

**Backend (4 files):**
- model/user.js
- services/otpService.js
- controllers/auth.js
- routes/user.Route.js

**Frontend (6 files):**
- components/OtpAuthFlow.jsx (NEW)
- components/chekingMail.jsx
- components/enterOtp.jsx
- components/success.jsx
- components/Signin.jsx
- App.jsx

