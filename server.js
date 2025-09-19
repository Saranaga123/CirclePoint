// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: '*',
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type']
};

// Global CORS middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection
const MONGO_URI = "mongodb+srv://Saranga:bamboos4pandas@mongodbatlas.b08etuk.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true }, // store hashed passwords
  email: { type: String, required: false },
  profileImage: { type: String, default: null }, // URL of image
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
app.post('/seed-users', async (req, res) => {
  try {
    const users = [
      { userId: 'Asad', username: 'Asad', password: 'password123', profileImage: null },
      { userId: 'Kylie', username: 'Kylie', password: 'password123', profileImage: null }
    ];
    await User.insertMany(users, { ordered: false }); // ignore duplicates
    res.json({ success: true, message: 'Users seeded' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find by userId (exact) or by username (with emojis)
    const user = await User.findOne({ userId: username }); 
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

app.patch('/messages/mark-seen', async (req, res) => {
  try {
    const { userId, fromUser } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const query = {
      receiverId: userId,
      status: { $ne: 'seen' }
    };
    if (fromUser) query.senderId = fromUser;

    const result = await Message.updateMany(query, { $set: { status: 'seen' } });

    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/messages/unread', async (req, res) => {
  try {
    const { userId, fromUser } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    // Only get unread messages for this user, optionally filter by sender
    const query = {
      receiverId: userId,
      status: { $ne: 'seen' }
    };
    if (fromUser) query.senderId = fromUser;

    const unreadMessages = await Message.find(query).sort({ timestamp: 1 });

    res.json({ success: true, messages: unreadMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// 6️⃣ Delete messages by date range (only Asad can do this)
app.delete('/messages/by-date', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;

    if (userId !== 'Asad') {
      return res.status(403).json({ success: false, error: 'Only Asad can delete messages' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = await Message.deleteMany({
      timestamp: { $gte: start, $lte: end }
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} messages between ${startDate} and ${endDate}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body; // e.g., { username: "NewName", profileImage: "url" }

    const user = await User.findOneAndUpdate({ userId }, updateData, { new: true });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Message schema
const messageSchema = new mongoose.Schema({
  messageId: String,
  senderId: String,
  receiverId: String,
  messageType: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['failed', 'sent', 'delivered', 'seen'], default: 'sent' },
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
