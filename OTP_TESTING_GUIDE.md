# OTP Authentication - Testing & Deployment Guide

## Pre-Deployment Checklist

### Backend Setup
- [ ] Install dependencies: `npm install`
- [ ] Add to `.env`:
  ```
  EMAIL_USER=your-email@gmail.com
  EMAIL_PASSWORD=16-char-app-password
  JWT_SECRET=your-secret-key
  MONGODB_URI=your-mongo-url
  ```
- [ ] Verify Gmail credentials work
- [ ] Test nodemailer configuration
- [ ] Database migrations (if needed)

### Frontend Setup
- [ ] Install dependencies: `npm install`
- [ ] Verify axios baseURL points to backend
- [ ] Check all component imports are correct
- [ ] Verify ButtonLoading component exists

---

## Step-by-Step Testing

### Test 1: Basic OTP Generation & Email Sending

**Objective:** Verify OTP is generated and email is sent

**Steps:**
1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Navigate to: `http://localhost:5173/otp-login`
4. Enter test email: `your-test-email@gmail.com`
5. Click "Send OTP"

**Expected Result:**
- ✅ No error message appears
- ✅ Screen changes to "Check your email"
- ✅ Email address is displayed correctly
- ✅ Email received in inbox within 5 seconds
- ✅ Email contains 6-digit code

**If Failed:**
- Check `.env` EMAIL_USER and EMAIL_PASSWORD
- Verify Gmail 2FA is enabled
- Check app-specific password format (16 chars)
- Check spam folder
- View backend console for error logs

---

### Test 2: OTP Verification (Success Case)

**Objective:** Verify correct OTP is accepted

**Prerequisites:** Completed Test 1, have OTP from email

**Steps:**
1. From "Check your email" screen
2. Click "Enter code manually"
3. Receive email with OTP (e.g., "245891")
4. Enter in 6 fields: 2 → 4 → 5 → 8 → 9 → 1
5. Click "Verify email"

**Expected Result:**
- ✅ Auto-focus moves between fields
- ✅ No error appears
- ✅ Screen changes to "Email verified" success screen
- ✅ Shows checkmark icon
- ✅ Message says "Your email has been successfully verified"

**If Failed:**
- Check OTP in email matches what you entered
- Check OTP hasn't expired (10-minute limit)
- View browser console for detailed error
- Check backend logs for verification issues

---

### Test 3: OTP Verification (Invalid OTP)

**Objective:** Verify incorrect OTP is rejected

**Prerequisites:** On "Enter OTP" screen with timer running

**Steps:**
1. Enter wrong code: 000000
2. Click "Verify email"

**Expected Result:**
- ✅ Error message appears: "Invalid OTP"
- ✅ Input fields clear
- ✅ Focus returns to first field
- ✅ Timer continues counting down

---

### Test 4: OTP Expiry

**Objective:** Verify OTP expires after 10 minutes

**Prerequisites:** Generated OTP but NOT verified yet

**Steps:**
1. Note the timer on OTP entry screen
2. Wait until timer reaches 0:00
3. Try to submit expired OTP

**Expected Result:**
- ✅ Timer reaches 0:00
- ✅ "OTP Expired" message appears
- ✅ Input fields become disabled (grayed out)
- ✅ "Resend OTP" button appears
- ✅ Cannot submit expired code

**To speed up testing:**
- Edit frontend `enterOtp.jsx` line 33: `const [timeLeft, setTimeLeft] = useState(60);` (1 minute)
- Edit backend `otpService.js` line 31: Change `10 * 60 * 1000` to `1 * 60 * 1000`

---

### Test 5: Resend OTP

**Objective:** Verify resend functionality works

**Prerequisites:** OTP expired (from Test 4)

**Steps:**
1. After OTP expires, click "Click to resend"
2. Check email for new OTP code
3. Enter new code and verify

**Expected Result:**
- ✅ Alert shows "OTP sent to your email"
- ✅ Timer resets to 10:00
- ✅ New OTP code sent to email
- ✅ New code is different from first
- ✅ New code works for verification

---

### Test 6: Login After Verification

**Objective:** Verify successful login after OTP verification

**Prerequisites:** Completed Test 2 (verified email)

**Steps:**
1. From "Email verified" screen
2. Click "Continue" button
3. Wait for redirect

**Expected Result:**
- ✅ Loading state shows briefly
- ✅ No error appears
- ✅ Redirects to home page (/)
- ✅ User data in localStorage
- ✅ JWT token in localStorage
- ✅ Logged in successfully (check navbar)

**To verify storage:**
- Open DevTools → Application → LocalStorage
- Check `user` key has user data
- Check `jwt_token` key has JWT

---

### Test 7: Multiple Users

**Objective:** Verify system works for different emails

**Prerequisites:** Tests 1-6 passed

**Steps:**
1. Logout
2. Go to Sign In → Login with OTP
3. Enter different email
4. Complete full flow again
5. Verify each user can login

**Expected Result:**
- ✅ Each email gets unique OTP
- ✅ Each can login independently
- ✅ User data correct for each

---

### Test 8: Back Navigation

**Objective:** Verify back buttons work correctly

**Prerequisites:** On any OTP flow screen

**Steps:**
1. From "Check your email" → Click "Back to log in"
2. Should return to email input
3. From "Enter OTP" → Click back arrow
4. Should return to "Check your email"

**Expected Result:**
- ✅ Navigation is smooth
- ✅ Previous inputs are cleared
- ✅ Can restart flow from email input

---

### Test 9: Paste Support

**Objective:** Verify pasting OTP code works

**Prerequisites:** Have OTP code copied to clipboard

**Steps:**
1. On "Enter OTP" screen
2. Click on first input field
3. Right-click → Paste (or Ctrl+V)

**Expected Result:**
- ✅ All 6 digits auto-fill
- ✅ Focus moves to last field
- ✅ Code is ready to verify

---

### Test 10: Responsive Design

**Objective:** Verify design works on mobile

**Prerequisites:** All tests passed on desktop

**Steps:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select mobile device (iPhone 12)
4. Repeat Tests 1-6 on mobile

**Expected Result:**
- ✅ Layout is responsive
- ✅ Inputs are properly sized
- ✅ Buttons are touchable
- ✅ No horizontal scrolling
- ✅ All features work same as desktop

---

## Performance Testing

### Email Sending Speed
```
Metric: Time from "Send OTP" click to email received
Target: < 5 seconds
Measurement: Use email timestamp vs click time
```

### OTP Verification Speed
```
Metric: Time from "Verify" click to success screen
Target: < 2 seconds
Measurement: Network tab in DevTools
```

### Login Process Speed
```
Metric: Time from "Continue" to home page loaded
Target: < 3 seconds
Measurement: Full page load time
```

---

## Security Testing

### Test: OTP Can't Be Used Twice

**Steps:**
1. Verify OTP successfully
2. Go to enter-otp screen again
3. Try to use same OTP code

**Result:** Should fail - OTP cleared after use ✓

### Test: Session Timeout

**Steps:**
1. Login via OTP
2. Wait 7 days (or edit JWT expiry to 1 min for testing)
3. Try to access protected route

**Result:** Token expired, redirect to login ✓

### Test: Email Validation

**Steps:**
1. Try invalid email: "notanemail"
2. Try SQL injection: `'; DROP TABLE--`
3. Try XSS: `<script>alert('xss')</script>`

**Result:** All rejected with validation error ✓

### Test: Rate Limiting (Optional)

**Steps:**
1. Click "Send OTP" 5 times rapidly
2. Check if rate limiting applies

**Current:** No rate limiting
**To Add:** Use `express-rate-limit` package

---

## Troubleshooting Guide

### Email Not Received

| Problem | Solution |
|---------|----------|
| App password wrong | Regenerate from Gmail settings |
| Email in spam | Add to contacts or whitelist |
| 2FA not enabled | Enable in Google Account |
| Connection timeout | Check internet, verify SMTP settings |

**Debug:**
```javascript
// In otpService.js, add logging:
console.log('Sending email from:', process.env.EMAIL_USER);
console.log('SMTP response:', result);
```

### OTP Not Verifying

| Problem | Solution |
|---------|----------|
| Different code received | Wait 5 sec, use latest OTP |
| Expired (red timer) | Click resend button |
| Wrong digits entered | Copy from email and paste |
| Database connection | Check MongoDB connection string |

**Debug:**
```javascript
// In controller, log OTP comparison:
console.log('User OTP:', userOTP);
console.log('Stored OTP:', user.otp);
console.log('Expiry:', user.otpExpiry);
console.log('Now:', new Date());
```

### Login Not Working

| Problem | Solution |
|---------|----------|
| Not redirecting | Check network tab for errors |
| Token not saved | Check localStorage key names |
| Can't access home | Check auth middleware |
| Logged out immediately | Check JWT expiry time |

**Debug:**
```javascript
// In browser console:
localStorage.getItem('jwt_token');
localStorage.getItem('user');
// Should both have values
```

---

## Deployment Checklist

### Environment Variables
- [ ] Set EMAIL_USER to production email
- [ ] Set EMAIL_PASSWORD to app password
- [ ] Set JWT_SECRET to strong random string
- [ ] Set NODE_ENV=production
- [ ] Set MONGODB_URI to production database
- [ ] Set FRONTEND_URL correctly for CORS

### Backend
- [ ] Run tests: `npm test`
- [ ] Check logs for errors
- [ ] Verify CORS settings
- [ ] Enable HTTPS (secure cookies)
- [ ] Set cookie sameSite='strict'
- [ ] Add rate limiting to OTP endpoints
- [ ] Set up email queue (Bull Redis) for scale

### Frontend
- [ ] Build: `npm run build`
- [ ] Check for console errors
- [ ] Verify API endpoints match production
- [ ] Test with production backend
- [ ] Check mobile responsiveness
- [ ] Verify all assets load

### Monitoring
- [ ] Set up email delivery tracking
- [ ] Monitor API response times
- [ ] Track failed OTP attempts
- [ ] Log user authentication events
- [ ] Monitor database queries
- [ ] Set up error tracking (Sentry)

---

## Performance Optimization Tips

1. **Email Queue:** Use Bull with Redis for async email sending
2. **Caching:** Cache verified users temporarily
3. **Rate Limiting:** Add limits to prevent abuse
4. **Database Indexing:** Index email and otp fields
5. **Compression:** Enable gzip on backend
6. **CDN:** Serve frontend from CDN
7. **Database Replication:** Multiple replicas for availability

---

## Rollback Plan

If issues occur in production:

1. **Stop:** Remove OTP button from Signin.jsx
2. **Revert:** Revert to previous Git commit
3. **Analyze:** Check logs and error tracking
4. **Fix:** Apply hotfix
5. **Test:** Full regression testing
6. **Deploy:** Gradual rollout to users

```bash
# Rollback command:
git revert HEAD
git push production
```

---

## Monitoring & Analytics

### Key Metrics to Track

| Metric | Target | Alert If |
|--------|--------|----------|
| Email delivery time | < 5s | > 10s |
| OTP verification success rate | > 95% | < 90% |
| API response time | < 500ms | > 1s |
| Database response time | < 100ms | > 200ms |
| Failed login attempts | < 5% | > 10% |

### Logging

```javascript
// Log important events
console.log(`[OTP] Sent to ${email} at ${new Date()}`);
console.log(`[OTP] Verified for ${email} at ${new Date()}`);
console.log(`[OTP] Login completed for ${email} at ${new Date()}`);
```

---

## Next Steps

1. ✅ Complete all tests
2. ✅ Fix any issues found
3. ✅ Deploy to staging
4. ✅ Full UAT (User Acceptance Testing)
5. ✅ Deploy to production
6. ✅ Monitor for 24 hours
7. ✅ Gather user feedback
8. ✅ Plan improvements

