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

// CORS origins for both Express and Socket.IO
const allowedOrigins = [
  'https://vibemessage.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173'
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
    const cachePersistenceWorker = new CachePersistenceWorker(3000); // Check every 3 seconds
    cachePersistenceWorker.setSocketIO(io); // Pass Socket.IO for status updates
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

// In-memory socket tracking (for disconnect handling)
const socketToUser = new Map(); // socketId → userId
const userToSocket = new Map(); // userId → socketId

// Helper function to broadcast online users from Redis
const broadcastOnlineUsers = async () => {
  try {
    const onlineUsers = await cacheService.getOnlineUsers();
    io.emit('onlineUsers', onlineUsers);
  } catch (error) {
    console.error('Error broadcasting online users:', error.message);
  }
};

io.on('connection', (socket) => {
  // Join room by userId for bi-directional messaging
  socket.on('join', async ({ userId, onlineStatus }) => {
    socket.join(userId);
    socket.userId = userId;
    socketToUser.set(socket.id, userId);
    userToSocket.set(userId, socket.id);
    
    const showOnline = onlineStatus === true;
    
    // Store in Redis with TTL (60s - requires heartbeat)
    await cacheService.userOnline(userId, socket.id, showOnline);
    
    // Broadcast updated online users
    await broadcastOnlineUsers();
  });

  // Heartbeat to refresh presence TTL (called every 30s from client)
  socket.on('heartbeat', async () => {
    const userId = socket.userId || socketToUser.get(socket.id);
    if (userId) {
      await cacheService.refreshPresence(userId);
    }
  });

  // Update online status setting
  socket.on('updateOnlineStatus', async ({ userId, onlineStatus }) => {
    const showOnline = onlineStatus === true;
    const socketId = userToSocket.get(userId) || socket.id;
    await cacheService.updateOnlineStatus(userId, socketId, showOnline);
    await broadcastOnlineUsers();
  });

  // Handle typing events
  socket.on('typing', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('userTyping', { senderId });
  });

  socket.on('stopTyping', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('userStopTyping', { senderId });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    const userId = socket.userId || socketToUser.get(socket.id);
    
    if (userId) {
      socketToUser.delete(socket.id);
      userToSocket.delete(userId);
      
      // Remove from Redis presence
      await cacheService.userOffline(userId);

      // Update last seen timestamp in MongoDB
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (error) {
        console.error('Error updating last seen on disconnect:', error.message);
      }

      // Broadcast updated online users
      await broadcastOnlineUsers();
    }
  });

  // Real-time message sending (Redis-first, write-behind pattern)
  socket.on('sendMessage', async (msg) => {
    try {
      const { sender, receiver, content, image, audio, tempId, replyTo, isForwarded } = msg;
      
      if (!receiver || (!content?.trim() && !image && !audio)) {
        return;
      }

      let messageType = 'text';
      if (content?.trim() && (image || audio)) messageType = 'mixed';
      else if (image) messageType = 'image';
      else if (audio) messageType = 'audio';

      // Prepare message data
      const messageData = {
        sender,
        receiver,
        content: content?.trim() || '',
        image: image ? { url: image, public_id: '' } : null,
        audio: audio ? { url: audio, public_id: '' } : null,
        messageType,
        tempId,
        replyTo: replyTo || null,
        isForwarded: isForwarded || false
      };

      // Store in Redis first (fast write) - Worker will persist to MongoDB
      const cachedMessage = await cacheService.storeMessage(messageData);
      
      // If Redis is unavailable, fall back to direct MongoDB write
      if (cachedMessage._redisSkipped) {
        // Fallback: Direct MongoDB write
        const newMessage = new Message({
          sender,
          receiver,
          content: content?.trim() || '',
          image: image ? { url: image, public_id: '' } : null,
          audio: audio ? { url: audio, public_id: '' } : null,
          messageType,
          status: 'sent',
          replyTo: replyTo || null,
          isForwarded: isForwarded || false
        });
        await newMessage.save();
        await newMessage.populate('sender', 'name profilePicture');
        
        if (newMessage.replyTo) {
          await newMessage.populate({
            path: 'replyTo',
            select: 'content messageType sender',
            populate: { path: 'sender', select: 'name profilePicture' }
          });
        }

        const messageToEmit = newMessage.toObject();
        if (tempId) messageToEmit.tempId = tempId;

        // Cache for sidebar preview
        cacheService.cacheLastMessage(sender, receiver, newMessage);

        // Emit to both parties
        io.to(receiver).emit('newMessage', messageToEmit);
        io.to(sender).emit('newMessage', messageToEmit);

        // Check if receiver is online
        const isReceiverOnline = await cacheService.isUserOnline(receiver);
        if (isReceiverOnline) {
          newMessage.status = 'delivered';
          await newMessage.save();
          io.to(sender).emit('messageStatusUpdate', {
            messageId: newMessage._id,
            status: 'delivered'
          });
        } else {
          await cacheService.incrementUnread(receiver, sender);
        }
        return;
      }

      // Redis write successful - emit immediately for instant delivery
      // Fetch sender info from DB for the emit (cached in practice)
      const senderUser = await User.findById(sender).select('name profilePicture').lean();
      
      const messageToEmit = {
        ...cachedMessage,
        sender: senderUser || { _id: sender },
        status: 'pending' // Will update to 'sent' after MongoDB persistence
      };

      // Emit immediately (before MongoDB persistence)
      io.to(receiver).emit('newMessage', messageToEmit);
      io.to(sender).emit('newMessage', messageToEmit);

      // Cache last message for sidebar preview
      cacheService.cacheLastMessage(sender, receiver, cachedMessage);

    } catch (error) {
      console.error('Socket sendMessage error:', error.message);
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
      console.error('markMessageRead error:', error.message);
    }
  });

  // Mark all messages from a user as read
  socket.on('markAllMessagesRead', async ({ senderId, receiverId }) => {
    try {
      const result = await Message.updateMany(
        { sender: senderId, receiver: receiverId, status: { $ne: 'read' } },
        { status: 'read', readAt: new Date() }
      );
      
      // Clear unread count in Redis
      await cacheService.clearUnread(receiverId, senderId);
      
      if (result.modifiedCount > 0) {
        io.to(senderId).emit('messagesMarkedRead', { receiverId });
      }
    } catch (error) {
      console.error('markAllMessagesRead error:', error.message);
    }
  });

  // Handle reaction updates and broadcast to both users
  socket.on('reactionUpdated', ({ messageId, userId, reaction, reactions }) => {
    try {
      // Get the message to find both sender and receiver
      Message.findById(messageId).then((message) => {
        if (!message) return;

        // Broadcast reaction update to both users in the conversation
        const receiverId = message.receiver.toString();
        const senderId = message.sender.toString();

        // Send to both the person who reacted and the other user
        io.to(senderId).emit('messageReactionUpdated', {
          messageId,
          reactions,
          userId
        });
        io.to(receiverId).emit('messageReactionUpdated', {
          messageId,
          reactions,
          userId
        });
      }).catch((error) => {
        console.error('Error finding message for reaction:', error);
      });
    } catch (error) {
      console.error('reactionUpdated socket error:', error);
    }
  });
});