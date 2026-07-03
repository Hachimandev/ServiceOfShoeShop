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
      let targetConversation = null;

      if (targetConversationId) {
        targetConversation = await Conversation.findById(targetConversationId);
      } else if (senderId && receiverId) {
        targetConversation = await Conversation.findOne({
          type: '1vs1',
          participants: { $all: [senderId, receiverId], $size: 2 }
        });

        if (!targetConversation) {
          targetConversation = await Conversation.create({
            participants: [senderId, receiverId],
            type: '1vs1'
          });
        }
        targetConversationId = targetConversation._id;
      }
      
      if (!targetConversationId) {
        return socket.emit('error', { message: 'Invalid conversation data' });
      }
      
      // Save to MongoDB
      const newMessage = await Message.create({
        senderId,
        receiverId: receiverId || null,
        message,
        conversationId: targetConversationId
      });

      // Update the last message of the conversation
      await Conversation.findByIdAndUpdate(targetConversationId, {
        lastMessage: newMessage._id
      });

      // Emit messages
      if (targetConversation && targetConversation.type === 'group') {
        targetConversation.participants.forEach(participantId => {
          if (participantId.toString() !== senderId.toString()) {
            this.io.to(participantId.toString()).emit('chat_message', newMessage);
          }
        });
      } else if (receiverId) {
        this.io.to(receiverId).emit('chat_message', newMessage);
      }
      
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
