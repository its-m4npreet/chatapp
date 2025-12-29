const express = require('express');
const { signUp, signIn, logout, updateProfile } = require('../controllers/auth');
const authMiddleware = require('../middleware/authMiddleware');

const userRouter = express.Router();

userRouter.post('/signup', signUp);
userRouter.post('/signin', signIn);
userRouter.post('/logout', logout);
userRouter.put('/updateProfile',authMiddleware, updateProfile);

module.exports = userRouter;