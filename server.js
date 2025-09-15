const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// ✅ MongoDB connection
const MONGO_URI = 'mongodb+srv://Saranga:bamboos4pandas@mongodbatlas.b08etuk.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Message schema
const messageSchema = new mongoose.Schema({
  user: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: String, required: true },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// Socket.IO
const io = new Server(httpServer, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('setUsername', (username) => {
    socket.username = username;
  });

  socket.on('chat:message', async (msg) => {
    const chatMessage = {
      user: socket.username || 'Anonymous',
      text: msg,
      time: new Date().toLocaleTimeString()
    };

    // ✅ Save message to MongoDB
    try {
      await Message.create(chatMessage);
      io.emit('chat:message', chatMessage);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('chat:typing', (isTyping) => {
    socket.broadcast.emit('chat:typing', {
      user: socket.username || 'Anonymous',
      isTyping
    });
  });
});

app.get('/ping', (req, res) => res.json({ status: 'ok' }));

// ✅ API: Fetch messages by user
app.get('/messages/:user', async (req, res) => {
  try {
    const user = req.params.user;
    const messages = await Message.find({ user }).sort({ createdAt: 1 }); // oldest first
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ API: Optional: save message manually
app.post('/messages', async (req, res) => {
  const { user, text, time } = req.body;
  if (!user || !text || !time) return res.status(400).json({ error: 'Missing fields' });

  try {
    const message = await Message.create({ user, text, time });
    res.json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
