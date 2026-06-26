const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow CORS for all origins

const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this to match your frontend origin in production
    methods: ['GET', 'POST']
  }
});

// Handle connection events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle incoming chat messages
  socket.on('chat_message', (data) => {
    console.log(`Message from ${socket.id}:`, data);
    
    // Broadcast the message to all connected clients (including sender)
    io.emit('chat_message', {
      senderId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// A simple API route to check if server is running
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Chat service is running' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat service is running on port ${PORT}`);
});
