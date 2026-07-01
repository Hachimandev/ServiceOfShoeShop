require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./src/config/db');
const socketRoutes = require('./src/routes/socket.routes');
const userRoutes = require('./src/routes/user.routes');

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json()); // For parsing application/json

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST']
  }
});

// Initialize socket routes
socketRoutes(io);

// Initialize REST routes
app.use('/api/users', userRoutes(io));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Chat service is running with MongoDB' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chat service is running on port ${PORT}`);
});
