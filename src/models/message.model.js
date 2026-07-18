const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: false // Optional for backward compatibility with existing tests/apps
  },
  message: {
    type: String,
    required: false
  },
  images: {
    type: [String],
    default: []
  },
  type: {
    type: String,
    enum: ['text', 'image', 'emoji', 'file', 'video', 'audio'],
    default: 'text'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  pinnedAt: {
    type: Date,
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: false
    },
    icon: {
      type: String,
      required: false
    }
  }],
  isUnsent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

messageSchema.index({ conversationId: 1, isPinned: 1, pinnedAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
