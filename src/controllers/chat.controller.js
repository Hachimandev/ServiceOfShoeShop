const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

class ChatController {
  constructor(io) {
    this.io = io;
  }

  handleConnection(socket) {
    console.log(`User connected: ${socket.id}`);
  }

  isConversationParticipant(conversation, userId) {
    return conversation.participants.some(participantId => participantId.toString() === userId.toString());
  }

  emitToConversation(conversation, event, payload) {
    conversation.participants.forEach(participantId => {
      this.io.to(participantId.toString()).emit(event, payload);
    });
  }

  async populatePinnedMessage(message) {
    await message.populate([
      { path: 'senderId', select: 'username' },
      { path: 'pinnedBy', select: 'username' }
    ]);

    return message;
  }

  async findMessageConversation(messageId) {
    const message = await Message.findById(messageId);

    if (!message) {
      return { message: null, conversation: null };
    }

    const conversation = message.conversationId
      ? await Conversation.findById(message.conversationId)
      : null;

    return { message, conversation };
  }

  async handleChatMessage(socket, data) {
    try {
      console.log(`Message from ${socket.id}:`, data);
      
      const { senderId, receiverId, message, conversationId, type = 'text' } = data;
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
        type,
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

  async handlePinMessage(socket, data) {
    try {
      const { messageId, userId } = data;

      if (!messageId || !userId) {
        return socket.emit('error', { message: 'messageId and userId are required' });
      }

      const { message, conversation } = await this.findMessageConversation(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      if (!this.isConversationParticipant(conversation, userId)) {
        return socket.emit('error', { message: 'User is not a participant of this conversation' });
      }

      if (!message.isPinned) {
        message.isPinned = true;
        message.pinnedBy = userId;
        message.pinnedAt = new Date();
        await message.save();

        if (!conversation.pinnedMessages) {
          conversation.pinnedMessages = [];
        }
        if (!conversation.pinnedMessages.includes(message._id)) {
          conversation.pinnedMessages.push(message._id);
          await conversation.save();
        }
      }

      const pinnedMessage = await this.populatePinnedMessage(message);
      this.emitToConversation(conversation, 'message_pinned', pinnedMessage);
    } catch (error) {
      console.error('Error pinning message:', error);
      socket.emit('error', { message: 'Failed to pin message' });
    }
  }

  async handleUnpinMessage(socket, data) {
    try {
      const { messageId, userId } = data;

      if (!messageId || !userId) {
        return socket.emit('error', { message: 'messageId and userId are required' });
      }

      const { message, conversation } = await this.findMessageConversation(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      if (!this.isConversationParticipant(conversation, userId)) {
        return socket.emit('error', { message: 'User is not a participant of this conversation' });
      }

      if (message.isPinned) {
        message.isPinned = false;
        message.pinnedBy = null;
        message.pinnedAt = null;
        await message.save();

        if (conversation.pinnedMessages) {
          conversation.pinnedMessages = conversation.pinnedMessages.filter(
            id => id.toString() !== message._id.toString()
          );
          await conversation.save();
        }
      }

      const unpinnedMessage = await this.populatePinnedMessage(message);
      this.emitToConversation(conversation, 'message_unpinned', unpinnedMessage);
    } catch (error) {
      console.error('Error unpinning message:', error);
      socket.emit('error', { message: 'Failed to unpin message' });
    }
  }

  async handleAddReaction(socket, data) {
    try {
      const { messageId, userId, emoji, icon } = data;

      if (!messageId || !userId || (!emoji && !icon)) {
        return socket.emit('error', { message: 'messageId, userId, and either emoji or icon are required' });
      }

      const { message, conversation } = await this.findMessageConversation(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      if (!this.isConversationParticipant(conversation, userId)) {
        return socket.emit('error', { message: 'User is not a participant of this conversation' });
      }

      // Check if user already reacted with this emoji or icon
      const existingReactionIndex = message.reactions.findIndex(
        r => r.userId.toString() === userId.toString() && 
             ((emoji && r.emoji === emoji) || (icon && r.icon === icon))
      );

      if (existingReactionIndex === -1) {
        message.reactions.push({ userId, emoji, icon });
        await message.save();
      }

      this.emitToConversation(conversation, 'reaction_added', {
        messageId,
        userId,
        emoji,
        icon,
        reactions: message.reactions
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  async handleRemoveReaction(socket, data) {
    try {
      const { messageId, userId, emoji, icon } = data;

      if (!messageId || !userId || (!emoji && !icon)) {
        return socket.emit('error', { message: 'messageId, userId, and either emoji or icon are required' });
      }

      const { message, conversation } = await this.findMessageConversation(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      if (!this.isConversationParticipant(conversation, userId)) {
        return socket.emit('error', { message: 'User is not a participant of this conversation' });
      }

      const initialLength = message.reactions.length;
      message.reactions = message.reactions.filter(
        r => !(r.userId.toString() === userId.toString() && 
               ((emoji && r.emoji === emoji) || (icon && r.icon === icon)))
      );

      if (message.reactions.length !== initialLength) {
        await message.save();
      }

      this.emitToConversation(conversation, 'reaction_removed', {
        messageId,
        userId,
        emoji,
        icon,
        reactions: message.reactions
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.id}`);
  }
}

module.exports = ChatController;
