const User = require('../models/user.model');
const FriendRequest = require('../models/friendRequest.model');

class UserController {
  // Mock function to register/login a user easily for testing
  async loginOrRegister(req, res) {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ message: 'Username is required' });

      let user = await User.findOne({ username });
      if (!user) {
        user = await User.create({ username });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get list of all users (for testing)
  async getAllUsers(req, res) {
    try {
      const users = await User.find().select('-friends');
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Send friend request
  async sendFriendRequest(req, res) {
    try {
      const { senderId, receiverId } = req.body;
      
      if (senderId === receiverId) {
        return res.status(400).json({ message: 'Cannot send friend request to yourself' });
      }

      // Check if already friends
      const sender = await User.findById(senderId);
      if (sender.friends.includes(receiverId)) {
        return res.status(400).json({ message: 'Already friends' });
      }

      // Check if request already exists
      const existingRequest = await FriendRequest.findOne({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId }
        ],
        status: 'pending'
      });

      if (existingRequest) {
        return res.status(400).json({ message: 'Friend request already exists' });
      }

      const friendRequest = await FriendRequest.create({ sender: senderId, receiver: receiverId });
      
      // Emit via socket if needed. (Handled via REST for now, socket will trigger in socket.routes or we can inject io here)
      // If we want REST to trigger socket, we need to pass `io` to controller. Let's do that in routes.
      if (req.io) {
        req.io.emit(`friend_request_to_${receiverId}`, friendRequest);
      }

      res.status(201).json(friendRequest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Respond to friend request
  async respondToFriendRequest(req, res) {
    try {
      const { requestId, status } = req.body; // status: 'accepted' or 'rejected'
      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const friendRequest = await FriendRequest.findById(requestId);
      if (!friendRequest) {
        return res.status(404).json({ message: 'Friend request not found' });
      }

      if (friendRequest.status !== 'pending') {
        return res.status(400).json({ message: 'Request already responded to' });
      }

      friendRequest.status = status;
      await friendRequest.save();

      if (status === 'accepted') {
        // Add to friends list
        await User.findByIdAndUpdate(friendRequest.sender, { $addToSet: { friends: friendRequest.receiver } });
        await User.findByIdAndUpdate(friendRequest.receiver, { $addToSet: { friends: friendRequest.sender } });
      }

      if (req.io) {
        req.io.emit(`friend_request_update_${friendRequest.sender}`, friendRequest);
      }

      res.status(200).json(friendRequest);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get user's friends
  async getFriends(req, res) {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).populate('friends', 'username');
      if (!user) return res.status(404).json({ message: 'User not found' });

      res.status(200).json(user.friends);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
