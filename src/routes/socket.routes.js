const ChatController = require('../controllers/chat.controller');
const FriendRequest = require('../models/friendRequest.model');
const User = require('../models/user.model');

module.exports = (io) => {
  const chatController = new ChatController(io);

  io.on('connection', (socket) => {
    chatController.handleConnection(socket);

    // Users should emit 'join' with their userId to receive private messages and friend notifications
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined room ${userId}`);
    });

    socket.on('chat_message', (data) => {
      chatController.handleChatMessage(socket, data);
    });

    // Socket event for sending friend request
    socket.on('send_friend_request', async (data) => {
      try {
        const { senderId, receiverId } = data;
        const friendRequest = await FriendRequest.create({ sender: senderId, receiver: receiverId });
        io.to(receiverId).emit('friend_request_received', friendRequest);
      } catch (error) {
        socket.emit('error', { message: 'Error sending friend request' });
      }
    });

    // Socket event for responding to friend request
    socket.on('respond_friend_request', async (data) => {
      try {
        const { requestId, status } = data;
        const friendRequest = await FriendRequest.findById(requestId);
        if (friendRequest && friendRequest.status === 'pending') {
          friendRequest.status = status;
          await friendRequest.save();

          if (status === 'accepted') {
            await User.findByIdAndUpdate(friendRequest.sender, { $addToSet: { friends: friendRequest.receiver } });
            await User.findByIdAndUpdate(friendRequest.receiver, { $addToSet: { friends: friendRequest.sender } });
          }
          io.to(friendRequest.sender.toString()).emit('friend_request_status', friendRequest);
        }
      } catch (error) {
        socket.emit('error', { message: 'Error responding to friend request' });
      }
    });

    socket.on('disconnect', () => {
      chatController.handleDisconnect(socket);
    });
  });
};
