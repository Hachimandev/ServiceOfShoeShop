const ChatMessage = require('../models/chat.model');

class ChatController {
  constructor(io) {
    this.io = io;
  }

  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);
  }

  handleChatMessage(socket, data) {
    console.log(`Message from ${socket.id}:`, data);
    
    const message = new ChatMessage(socket.id, data.message);

    this.io.emit('chat_message', message);
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.id}`);
  }
}

module.exports = ChatController;
