const Message = require('../models/message.model');

class ChatController {
  constructor(io) {
    this.io = io;
  }

  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);
  }

  async handleChatMessage(socket, data) {
    try {
      console.log(`Message from ${socket.id}:`, data);
      
      const { senderId, receiverId, message } = data;
      
      // Save to MongoDB
      const newMessage = await Message.create({
        senderId,
        receiverId,
        message
      });

      // Emit to receiver (assuming receiverId is the socket.id or they join a room with their userId)
      // Usually, users join a room named by their userId when they connect
      this.io.to(receiverId).emit('chat_message', newMessage);
      // Also emit to sender so their UI can update if needed
      socket.emit('chat_message', newMessage);

    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.id}`);
  }
}

module.exports = ChatController;
