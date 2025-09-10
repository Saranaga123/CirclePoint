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

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
