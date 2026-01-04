const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');

// Export a function that takes the controller
module.exports = (messageController) => {
  const messageRouter = express.Router();

  messageRouter.post('/send', authMiddleware, messageController.sendMessage);
  messageRouter.post('/upload', authMiddleware, messageController.uploadImage);
  messageRouter.get('/:receiverId', authMiddleware, messageController.getMessages);

  return messageRouter;
};