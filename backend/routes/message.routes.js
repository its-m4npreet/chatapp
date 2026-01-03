const express = require('express');
const messageRouter = express.Router();
const { sendMessage, getMessages } = require('../controllers/message.controller');
const authMiddleware = require('../middleware/authMiddleware');

// const multer = require('multer');
// const upload = multer({ storage: multer.memoryStorage() });

messageRouter.post('/send', authMiddleware, sendMessage); // No multer!
messageRouter.post('/:receiverId', authMiddleware, getMessages);

module.exports = messageRouter;

