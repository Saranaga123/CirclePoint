const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:4200", // your Angular frontend
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // assign username
  socket.on('setUsername', (username) => {
    socket.username = username;
    console.log(`User ${socket.id} set username: ${username}`);
  });

  // receive messages
  socket.on('chat:message', (msg) => {
    const data = {
      user: socket.username || 'Anonymous', // fallback
      text: msg,
      time: new Date().toLocaleTimeString()
    };
    io.emit('chat:message', data);
  });
});
app.get('/ping', (req, res) => {
  res.json({ status: 'ok' });
});
httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
