const express = require('express');
const conversationController = require('../controllers/conversation.controller');
const { uploadImage, uploadFile, handleUploadError } = require('../middlewares/upload.middleware');

module.exports = (io) => {
  const router = express.Router();

  // Inject io into request for REST routes to emit events if necessary
  router.use((req, res, next) => {
    req.io = io;
    next();
  });

  router.post('/1vs1', conversationController.createOrGet1vs1Conversation);
  router.post('/group', conversationController.createGroupConversation);
  router.get('/:userId', conversationController.getUserConversations);
  router.post('/message', conversationController.sendMessage);
  router.post('/message/image', uploadImage.array('image', 5), handleUploadError, conversationController.sendImageMessage);
  router.post('/message/file', uploadFile.array('file', 5), handleUploadError, conversationController.sendFileMessage);
  router.get('/:conversationId/messages', conversationController.getMessages);

  return router;
};
