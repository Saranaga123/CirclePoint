// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = "mongodb+srv://Saranga:bamboos4pandas@mongodbatlas.b08etuk.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Message schema
const messageSchema = new mongoose.Schema({
  messageId: String,
  senderId: String,
  receiverId: String,
  messageType: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['failed','sent','delivered','seen'], default: 'sent' },
  reaction: { type: String, default: null },
});

const Message = mongoose.model('Message', messageSchema);

// Routes

// 1️⃣ Send a message
app.post('/messages', async (req, res) => {
  try {
    const msg = new Message(req.body);
    await msg.save();
    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2️⃣ Fetch messages between two users
app.get('/messages', async (req, res) => {
  try {
    const { user1, user2 } = req.query;
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3️⃣ Seed dummy messages
app.post('/seed', async (req, res) => {
  try {
    const dummyMessages = [
      {
        messageId: 'msg001',
        senderId: 'Asad',
        receiverId: 'Kylie',
        messageType: 'text',
        content: 'Hey Kylie! How are you?',
        status: 'delivered'
      },
      {
        messageId: 'msg002',
        senderId: 'Kylie',
        receiverId: 'Asad',
        messageType: 'text',
        content: 'Hi Asad! I am good, thanks. How about you?',
        status: 'delivered',
        reaction: '👍'
      },
      {
        messageId: 'msg003',
        senderId: 'Asad',
        receiverId: 'Kylie',
        messageType: 'text',
        content: 'Doing great!',
        status: 'seen'
      }
    ];
    await Message.insertMany(dummyMessages);
    res.json({ success: true, message: 'Dummy messages inserted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4️⃣ Clean all messages
app.delete('/messages', async (req, res) => {
  try {
    await Message.deleteMany({});
    res.json({ success: true, message: 'All messages deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5️⃣ Keep-alive endpoint
app.get('/keepalive', (req, res) => {
  res.json({ success: true, message: 'Server is alive!' });
});
app.get('/messages/unread-count', async (req, res) => {
  try {
    const { userId } = req.query; // the user who wants to know unread messages
    if (!userId) return res.status(400).json({ success: false, error: 'userId query param required' });

    const count = await Message.countDocuments({
      receiverId: userId,
      status: { $ne: 'seen' }  // status not equal to "seen"
    });

    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
