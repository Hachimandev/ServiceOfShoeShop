const ChatController = require('../controllers/chat.controller');

module.exports = (io) => {
  const chatController = new ChatController(io);

  io.on('connection', (socket) => {
    chatController.handleConnection(socket);

    socket.on('chat_message', (data) => {
      chatController.handleChatMessage(socket, data);
    });

    socket.on('disconnect', () => {
      chatController.handleDisconnect(socket);
    });
  });
};
