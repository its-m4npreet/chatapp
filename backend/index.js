const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const userRouter = require("./routes/user.Route");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const createMessageController = require('./controllers/message.controller');
const createGroupController = require('./controllers/group.controller');
const createNotificationController = require('./controllers/notification.controller');
const CachePersistenceWorker = require('./workers/cachePersistenceWorker');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

const PORT = process.env.PORT;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use('/api', userRouter);

// Make io accessible to routes
app.set('io', io);

// Use message controller with io
const messageController = createMessageController(io);
const messageRouter = require('./routes/message.routes')(messageController);
app.use('/api/messages', messageRouter);

// Use group controller with io
const groupController = createGroupController(io);
const groupRouter = require('./routes/group.routes')(groupController);
app.use('/api/groups', groupRouter);

// Use notification controller with io
const notificationController = createNotificationController(io);
const notificationRouter = require('./routes/notification.routes')(notificationController);
app.use('/api/notifications', notificationRouter);

app.get('/', (req, res) => {
  res.send('chatApp is running ....');
});

server.listen(PORT, () => {
  try {
    console.log('Database is connecting...');
    connectDB();
    console.log('Database is connected');
    console.log(`Server is running on  http://localhost:${PORT}`);

    // Initialize Redis and Cache Persistence Worker
    const cachePersistenceWorker = new CachePersistenceWorker(1000); // Check every 1 second
    cachePersistenceWorker.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down gracefully...');
      cachePersistenceWorker.stop();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
  }
});

// Socket.IO connection handler
const Message = require('./model/message');
const User = require('./model/user');
const cacheService = require('./services/cacheService');

// Track online users: { odId: odId }
const onlineUsers = new Map();

io.on('connection', (socket) => {
  // Join room by userId for bi-directional messaging
  socket.on('join', (userId) => {
    socket.join(userId);
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    // Broadcast updated online users list to all connected clients
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  // Handle typing events
  socket.on('typing', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('userTyping', { senderId });
  });

  socket.on('stopTyping', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('userStopTyping', { senderId });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
  });

  // Real-time message sending
  socket.on('sendMessage', async (msg) => {
    try {
      const { sender, receiver, content, image, tempId } = msg;
      if (!receiver || (!content?.trim() && !image)) return;

      let messageType = 'text';
      if (content?.trim() && image) messageType = 'mixed';
      else if (image) messageType = 'image';

      const newMessage = new Message({
        sender,
        receiver,
        content: content?.trim() || '',
        image: image ? { url: image, public_id: '' } : null,
        messageType,
        status: 'sent'
      });
      await newMessage.save();
      await newMessage.populate('sender', 'name profilePicture');

      // Attach tempId for client-side optimistic update reconciliation (not stored in DB)
      if (tempId) newMessage.tempId = tempId;

      // Cache the message with 5-second TTL
      const cacheKey = `message:${newMessage._id}`;
      await cacheService.setCache(cacheKey, newMessage, 5);

      // Emit to both sender and receiver rooms
      io.to(receiver).emit('newMessage', newMessage);
      io.to(sender).emit('newMessage', newMessage);

      // Update status to delivered if receiver is online
      if (onlineUsers.has(receiver)) {
        newMessage.status = 'delivered';
        await newMessage.save();
        io.to(sender).emit('messageStatusUpdate', {
          messageId: newMessage._id,
          status: 'delivered'
        });
      }
    } catch (error) {
      console.error('Socket sendMessage error:', error);
    }
  });

  // Mark message as read
  socket.on('markMessageRead', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message && message.receiver.toString() === userId) {
        message.status = 'read';
        message.readAt = new Date();
        await message.save();
        
        // Notify sender about read status
        io.to(message.sender.toString()).emit('messageStatusUpdate', {
          messageId: message._id,
          status: 'read'
        });
      }
    } catch (error) {
      console.error('markMessageRead error:', error);
    }
  });

  // Mark all messages from a user as read
  socket.on('markAllMessagesRead', async ({ senderId, receiverId }) => {
    try {
      const result = await Message.updateMany(
        { sender: senderId, receiver: receiverId, status: { $ne: 'read' } },
        { status: 'read', readAt: new Date() }
      );
      
      if (result.modifiedCount > 0) {
        io.to(senderId).emit('messagesMarkedRead', { receiverId });
      }
    } catch (error) {
      console.error('markAllMessagesRead error:', error);
    }
  });
});