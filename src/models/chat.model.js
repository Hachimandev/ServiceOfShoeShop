class ChatMessage {
  constructor(senderId, message) {
    this.senderId = senderId;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  // Placeholder for future database methods
  // static async save(messageData) { ... }
  // static async getHistory() { ... }
}

module.exports = ChatMessage;
