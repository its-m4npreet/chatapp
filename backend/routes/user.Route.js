const express = require('express');
const { signUp, signIn, logout, updateProfile, getAllUsers, getFriends, addFriend, removeFriend } = require('../controllers/auth');
const authMiddleware = require('../middleware/authMiddleware');

const userRouter = express.Router();


userRouter.post('/signup', signUp);
userRouter.post('/signin', signIn);
userRouter.post('/logout', logout);
userRouter.put('/updateProfile',authMiddleware, updateProfile);

// Get all users except current user
userRouter.get('/users', authMiddleware, getAllUsers);

// Friend management routes
userRouter.get('/friends', authMiddleware, getFriends);
userRouter.post('/friends/add', authMiddleware, addFriend);
userRouter.post('/friends/remove', authMiddleware, removeFriend);

module.exports = userRouter;