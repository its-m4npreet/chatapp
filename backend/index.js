const express = require("express");
require("dotenv").config();
const connectDB = require("./config/db");
const userRouter = require("./routes/user.Route");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const createMessageController = require('./controllers/message.controller');

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

// Use message controller with io
const messageController = createMessageController(io);
const messageRouter = require('./routes/message.routes')(messageController);
app.use('/api/messages', messageRouter);

app.get('/', (req, res) => {
  res.send('chatApp is running ....');
});

server.listen(PORT, () => {
  try {
    console.log('Database is connecting...');
    connectDB();
    console.log('Database is connected');
    console.log(`Server is running on  http://localhost:${PORT}`);
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
  }
});

// Socket.IO connection handler
const Message = require('./model/message');
const User = require('./model/user');

io.on('connection', (socket) => {
  // Join room by userId for bi-directional messaging
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  // Real-time message sending
  socket.on('sendMessage', async (msg) => {
    try {
      const { sender, receiver, content, image } = msg;
      if (!receiver || (!content?.trim() && !image)) return;

      let messageType = 'text';
      if (content?.trim() && image) messageType = 'mixed';
      else if (image) messageType = 'image';

      const newMessage = new Message({
        sender,
        receiver,
        content: content?.trim() || '',
        image: image ? { url: image, public_id: '' } : null,
        messageType
      });
      await newMessage.save();
      await newMessage.populate('sender', 'name profilePicture');

      // Emit to both sender and receiver rooms
      io.to(receiver).emit('newMessage', newMessage);
      io.to(sender).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Socket sendMessage error:', error);
    }
  });
});