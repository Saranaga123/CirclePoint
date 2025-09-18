// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// 1️⃣ CORS Setup
// ========================
const corsOptions = {
  origin: ['http://localhost:4200'], // Add your Angular dev URL or mobile app origin
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions)); // ✅ global CORS middleware

// Allow OPTIONS preflight for all routes
app.options('*', cors(corsOptions));

// ========================
// 2️⃣ Middleware
// ========================
app.use(express.json());

// ========================
// 3️⃣ MongoDB connection
// ========================
const MONGO_URI = "mongodb+srv://Saranga:bamboos4pandas@mongodbatlas.b08etuk.mongodb.net/?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ========================
// 4️⃣ User schema & model
// ========================
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String },
  profileImage: { type: String, default: null }, // base64 or URL
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ========================
// 5️⃣ Message schema & model
// ========================
const messageSchema = new mongoose.Schema({
  messageId: String,
  senderId: String,
  receiverId: String,
  messageType: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['failed','sent','delivered','seen'], default: 'sent' },
  reaction: { type: String, default: null }
});

const Message = mongoose.model('Message', messageSchema);

// ========================
// 6️⃣ Routes
// ========================

// Seed users
app.post('/seed-users', async (req, res) => {
  try {
    const users = [
      { userId: 'Asad', username: 'Asad', password: '1995', profileImage: null },
      { userId: 'Kylie', username: 'Kylie', password: '1995', profileImage: null }
    ];
    await User.insertMany(users, { ordered: false }); // ignore duplicates
    res.json({ success: true, message: 'Users seeded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user
app.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    const user = await User.findOneAndUpdate({ userId }, updateData, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send message
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

// Fetch messages between two users
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

// Seed dummy messages
app.post('/seed', async (req, res) => {
  try {
    const dummyMessages = [
      { messageId:'msg001', senderId:'Asad', receiverId:'Kylie', messageType:'text', content:'Hey Kylie! How are you?', status:'delivered' },
      { messageId:'msg002', senderId:'Kylie', receiverId:'Asad', messageType:'text', content:'Hi Asad! I am good, thanks.', status:'delivered', reaction:'👍' },
      { messageId:'msg003', senderId:'Asad', receiverId:'Kylie', messageType:'text', content:'Doing great!', status:'seen' }
    ];
    await Message.insertMany(dummyMessages);
    res.json({ success: true, message: 'Dummy messages inserted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete all messages
app.delete('/messages', async (req, res) => {
  try {
    await Message.deleteMany({});
    res.json({ success: true, message: 'All messages deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Keep-alive
app.get('/keepalive', (req, res) => {
  res.json({ success: true, message: 'Server is alive!' });
});

// Unread messages count
app.get('/messages/unread-count', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId query param required' });

    const count = await Message.countDocuments({ receiverId: userId, status: { $ne: 'seen' } });
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========================
// 7️⃣ Start server
// ========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
