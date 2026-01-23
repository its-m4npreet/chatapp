const express = require('express');
const { signUp, signIn, logout, updateProfile, getAllUsers, getUserById, getFriends, addFriend, removeFriend, googleAuth, resendOtpCode, verifyOtpCode, loginWithVerifiedEmail, sendResetPasswordEmail, resetPassword, sendBugReport } = require('../controllers/auth');
const authMiddleware = require('../middleware/authMiddleware');

const userRouter = express.Router();


userRouter.post('/signup', signUp);
userRouter.post('/signin', signIn);
userRouter.post('/google-auth', googleAuth);
userRouter.post('/logout', logout);
userRouter.put('/updateProfile',authMiddleware, updateProfile);

// Email verification OTP routes (used during signup)
userRouter.post('/verify-otp', verifyOtpCode);
userRouter.post('/resend-otp', resendOtpCode);

// Password reset routes
userRouter.post('/send-reset-password-email', sendResetPasswordEmail);
userRouter.post('/reset-password', resetPassword);

// Bug report route
userRouter.post('/send-bug-report', sendBugReport);

// Get all users except current user
userRouter.get('/users', authMiddleware, getAllUsers);

// Get a specific user by ID
userRouter.get('/users/:userId', getUserById);

// Friend management routes
userRouter.get('/friends', authMiddleware, getFriends);
userRouter.post('/friends/add', authMiddleware, addFriend);
userRouter.post('/friends/remove', authMiddleware, removeFriend);

module.exports = userRouter;