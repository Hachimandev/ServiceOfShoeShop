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
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'emoji', 'file', 'video', 'audio'],
    default: 'text'
  }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
