const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pinnedConversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
