const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

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
      
      const { senderId, receiverId, message, conversationId } = data;
      let targetConversationId = conversationId;

      // If conversationId is not provided, try to find or create a 1vs1 conversation
      if (!targetConversationId && senderId && receiverId) {
        let conversation = await Conversation.findOne({
          type: '1vs1',
          participants: { $all: [senderId, receiverId], $size: 2 }
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [senderId, receiverId],
            type: '1vs1'
          });
        }
        targetConversationId = conversation._id;
      }
      
      // Save to MongoDB
      const newMessage = await Message.create({
        senderId,
        receiverId,
        message,
        conversationId: targetConversationId
      });

      // Update the last message of the conversation
      if (targetConversationId) {
        await Conversation.findByIdAndUpdate(targetConversationId, {
          lastMessage: newMessage._id
        });
      }

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
