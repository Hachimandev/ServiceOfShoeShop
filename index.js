const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const socketRoutes = require('./src/routes/socket.routes');

const app = express();
app.use(cors()); 

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});

// Initialize socket routes
socketRoutes(io);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Chat service is running' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat service is running on port ${PORT}`);
});
