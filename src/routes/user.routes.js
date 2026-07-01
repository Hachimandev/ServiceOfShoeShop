const express = require('express');
const userController = require('../controllers/user.controller');

module.exports = (io) => {
  const router = express.Router();

  // Inject io into request for REST routes to emit events
  router.use((req, res, next) => {
    req.io = io;
    next();
  });

  router.post('/login', userController.loginOrRegister);
  router.get('/', userController.getAllUsers);
  router.post('/friend-request', userController.sendFriendRequest);
  router.post('/friend-request/respond', userController.respondToFriendRequest);
  router.get('/:userId/friends', userController.getFriends);

  return router;
};
