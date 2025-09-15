const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

app.use(cors()); // allow all origins for now

const io = new Server(httpServer, {
  cors: { origin: "*" } // same
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('setUsername', (username) => {
    socket.username = username;
  });

  socket.on('chat:message', (msg) => {
    io.emit('chat:message', {
      user: socket.username || 'Anonymous',
      text: msg,
      time: new Date().toLocaleTimeString()
    });
  });

  // ✅ New: typing indicator
  socket.on('chat:typing', (isTyping) => {
    socket.broadcast.emit('chat:typing', {
      user: socket.username || 'Anonymous',
      isTyping
    });
  });
});


app.get('/ping', (req, res) => res.json({ status: 'ok' }));
app.post('/messages', (req, res) => {
  const { user, text, time } = req.body;
  if (!user || !text || !time) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (!userMessages[user]) {
    userMessages[user] = [];
  }
  userMessages[user].push({ user, text, time });

  res.json({ success: true });
});

// ✅ API: Fetch user’s chat history
app.get('/messages/:user', (req, res) => {
  const user = req.params.user;
  res.json(userMessages[user] || []);
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
