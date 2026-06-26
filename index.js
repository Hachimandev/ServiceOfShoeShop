const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); 

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});


io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);


  socket.on('chat_message', (data) => {
    console.log(`Message from ${socket.id}:`, data);
    
 
    io.emit('chat_message', {
      senderId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });


  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Chat service is running' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat service is running on port ${PORT}`);
});
