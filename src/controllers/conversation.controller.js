const Conversation = require('../models/conversation.model');
const User = require('../models/user.model');

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
}

module.exports = new ConversationController();
