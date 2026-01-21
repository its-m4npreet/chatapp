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
  console.log('Backend: New socket connection:', socket.id);
  
  // Join room by userId for bi-directional messaging
  socket.on('join', (userId) => {
    console.log('Backend: Join event received:', { userId, socketId: socket.id });
    socket.join(userId);
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    console.log('Backend: User joined room:', { userId, socketId: socket.id });
    console.log('Backend: Online users now:', Array.from(onlineUsers.keys()));
    // Broadcast updated online users list to all connected clients
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));
  });

  // Update lastSeen when user is actively using the app
  socket.on('updateActivity', async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      console.log('Backend: Updated activity/lastSeen for user:', userId);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
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
    if (socket.userId) {
      console.log('Backend: User disconnected:', { userId: socket.userId, socketId: socket.id });
      onlineUsers.delete(socket.userId);

      // Update last seen timestamp
      try {
        await User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() });
        console.log('Backend: Updated last seen for user:', socket.userId);
      } catch (error) {
        console.error('Error updating last seen on disconnect:', error);
      }

      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
  });

  // Real-time message sending
  socket.on('sendMessage', async (msg) => {
    try {
      const { sender, receiver, content, image, audio, tempId, replyTo } = msg;
      console.log('Backend: Received sendMessage:', { tempId, sender, receiver, hasContent: !!content, senderSocketId: socket.id, replyTo });
      console.log('Backend: Online users:', Array.from(onlineUsers.keys()));
      console.log('Backend: Is receiver online?', onlineUsers.has(receiver));
      
      if (!receiver || (!content?.trim() && !image && !audio)) {
        console.warn('Backend: Invalid message - missing receiver or content');
        return;
      }

      let messageType = 'text';
      if (content?.trim() && (image || audio)) messageType = 'mixed';
      else if (image) messageType = 'image';
      else if (audio) messageType = 'audio';

      const newMessage = new Message({
        sender,
        receiver,
        content: content?.trim() || '',
        image: image ? { url: image, public_id: '' } : null,
        audio: audio ? { url: audio, public_id: '' } : null,
        messageType,
        status: 'sent',
        replyTo: replyTo || null
      });
      await newMessage.save();
      await newMessage.populate('sender', 'name profilePicture');
      
      // Populate replyTo if it exists
      if (newMessage.replyTo) {
        await newMessage.populate({
          path: 'replyTo',
          select: 'content messageType sender',
          populate: {
            path: 'sender',
            select: 'name profilePicture'
          }
        });
      }

      // Convert to plain object and attach tempId for client-side optimistic update reconciliation
      const messageToEmit = newMessage.toObject();
      if (tempId) messageToEmit.tempId = tempId;

      // Cache the message with 5-second TTL
      const cacheKey = `message:${newMessage._id}`;
      await cacheService.setCache(cacheKey, newMessage, 5);

      console.log('Backend: Emitting newMessage to rooms:', { 
        messageId: messageToEmit._id,
        tempId: messageToEmit.tempId,
        sender,
        receiver,
        status: messageToEmit.status,
        receiverSocketId: onlineUsers.get(receiver)
      });

      // Emit to both sender and receiver rooms
      console.log(`Backend: io.to('${receiver}').emit('newMessage', ...)`);
      io.to(receiver).emit('newMessage', messageToEmit);
      
      console.log(`Backend: io.to('${sender}').emit('newMessage', ...)`);
      io.to(sender).emit('newMessage', messageToEmit);

      // Update status to delivered if receiver is online
      if (onlineUsers.has(receiver)) {
        newMessage.status = 'delivered';
        await newMessage.save();
        console.log('Backend: Receiver online, updating status to delivered for message:', newMessage._id);
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
      console.log('Backend: Marking message as read:', { messageId, userId });
      const message = await Message.findById(messageId);
      if (message && message.receiver.toString() === userId) {
        message.status = 'read';
        message.readAt = new Date();
        await message.save();
        
        console.log('Backend: Emitting messageStatusUpdate (read) to sender:', message.sender.toString());
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