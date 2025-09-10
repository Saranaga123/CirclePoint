import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// ✅ Allow Angular dev server & others
app.use(cors({
  origin: [
    'http://localhost:4200',   // Angular dev
    'https://sarabe.onrender.com' // your deployed frontend if needed
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:4200', 'https://sarabe.onrender.com'],
    methods: ['GET', 'POST']
  }
});

// ✅ Simple ping route
app.get('/ping', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', socket => {
  console.log('New client connected');
  
  socket.on('setUsername', (username) => {
    socket.data.username = username;
  });

  socket.on('chatMessage', (msg) => {
    io.emit('chatMessage', {
      user: socket.data.username || 'Anonymous',
      text: msg,
      time: new Date().toLocaleTimeString()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
