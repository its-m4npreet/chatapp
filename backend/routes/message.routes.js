const express = require('express');
const messageRouter = express.Router();
const { sendMessage } = require('../controllers/message.controller');
const authMiddleware = require('../middleware/auth.middleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

messageRouter.post('/send', authMiddleware, sendMessage); // No multer!

module.exports = messageRouter;

