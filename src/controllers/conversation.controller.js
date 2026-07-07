const Conversation = require('../models/conversation.model');
const User = require('../models/user.model');
const Message = require('../models/message.model');
const { uploadToS3 } = require('../config/s3');

class ConversationController {
  // Create or get 1vs1 conversation
  async createOrGet1vs1Conversation(req, res) {
    try {
      const { userId1, userId2 } = req.body;

      if (!userId1 || !userId2) {
        return res.status(400).json({ message: 'Both userId1 and userId2 are required' });
      }

      if (userId1 === userId2) {
        return res.status(400).json({ message: 'Cannot create conversation with yourself' });
      }

      // Check if both users exist
      const users = await User.find({ _id: { $in: [userId1, userId2] } });
      if (users.length !== 2) {
        return res.status(404).json({ message: 'One or both users not found' });
      }

      // Check if 1vs1 conversation already exists
      let conversation = await Conversation.findOne({
        type: '1vs1',
        participants: { $all: [userId1, userId2], $size: 2 }
      });

      if (!conversation) {
        // Create new conversation
        conversation = await Conversation.create({
          participants: [userId1, userId2],
          type: '1vs1'
        });
      }

      // Populate participants info before sending
      await conversation.populate('participants', 'username');

      res.status(200).json(conversation);
    } catch (error) {
      console.error('Error in createOrGet1vs1Conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create group conversation
  async createGroupConversation(req, res) {
    try {
      const { name, participants, adminId } = req.body;

      if (!name || !participants || participants.length < 2) {
        return res.status(400).json({ message: 'Name and at least 2 participants are required' });
      }

      // Check if all users exist
      const users = await User.find({ _id: { $in: participants } });
      if (users.length !== participants.length) {
        return res.status(404).json({ message: 'One or more users not found' });
      }

      const conversation = await Conversation.create({
        name,
        participants,
        admin: adminId || participants[0], // default to first participant if no adminId provided
        type: 'group'
      });

      await conversation.populate('participants', 'username');

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Error in createGroupConversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get user's conversations
  async getUserConversations(req, res) {
    try {
      const { userId } = req.params;

      const conversations = await Conversation.find({
        participants: userId
      })
      .populate('participants', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

      res.status(200).json(conversations);
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Send a message via REST
  async sendMessage(req, res) {
    try {
      const { senderId, receiverId, message, conversationId } = req.body;
      
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
        return res.status(400).json({ message: 'Invalid conversation data' });
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
          if (participantId.toString() !== senderId.toString() && req.io) {
            req.io.to(participantId.toString()).emit('chat_message', newMessage);
          }
        });
      } else if (receiverId && req.io) {
        req.io.to(receiverId.toString()).emit('chat_message', newMessage);
      }

      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Send an image message via REST
  async sendImageMessage(req, res) {
    try {
      const { senderId, receiverId, conversationId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'Image file is required' });
      }

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
        return res.status(400).json({ message: 'Invalid conversation data' });
      }

      // Upload image to S3
      const imageUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype);

      // Save to MongoDB
      const newMessage = await Message.create({
        senderId,
        receiverId: receiverId || null,
        message: imageUrl,
        type: 'image',
        conversationId: targetConversationId
      });

      // Update the last message of the conversation
      await Conversation.findByIdAndUpdate(targetConversationId, {
        lastMessage: newMessage._id
      });

      // Emit messages
      if (targetConversation && targetConversation.type === 'group') {
        targetConversation.participants.forEach(participantId => {
          if (participantId.toString() !== senderId.toString() && req.io) {
            req.io.to(participantId.toString()).emit('chat_message', newMessage);
          }
        });
      } else if (receiverId && req.io) {
        req.io.to(receiverId.toString()).emit('chat_message', newMessage);
      }

      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error in sendImageMessage:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get messages for a conversation
  async sendFileMessage(req, res) {
    try {
      const { senderId, receiverId, conversationId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'File is required' });
      }

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
        return res.status(400).json({ message: 'Invalid conversation data' });
      }

      // Upload file to S3
      const fileUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype, 'chat-files');

      // Save to MongoDB
      const newMessage = await Message.create({
        senderId,
        receiverId: receiverId || null,
        message: fileUrl,
        type: 'file',
        conversationId: targetConversationId
      });

      // Update the last message of the conversation
      await Conversation.findByIdAndUpdate(targetConversationId, {
        lastMessage: newMessage._id
      });

      // Emit messages
      if (targetConversation && targetConversation.type === 'group') {
        targetConversation.participants.forEach(participantId => {
          if (participantId.toString() !== senderId.toString() && req.io) {
            req.io.to(participantId.toString()).emit('chat_message', newMessage);
          }
        });
      } else if (receiverId && req.io) {
        req.io.to(receiverId.toString()).emit('chat_message', newMessage);
      }

      res.status(201).json({ ...newMessage._doc, originalName: file.originalname });
    } catch (error) {
      console.error('Error in sendFileMessage:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get messages for a conversation
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;

      const messages = await Message.find({ conversationId })
        .populate('senderId', 'username')
        .sort({ createdAt: 1 });

      res.status(200).json(messages);
    } catch (error) {
      console.error('Error in getMessages:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ConversationController();
