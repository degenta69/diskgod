const expressAsyncHandler = require("express-async-handler");
const MessageService = require("../services/messageService");
const jwt = require("jsonwebtoken");

const sendMessage = expressAsyncHandler(async (req, res) => {
  const { chatId, content } = req.body;
  if (!chatId || !content) {
    return res.status(400).send("chatId and content is required");
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const message = await MessageService.sendMessage(userId, chatId, content);
    res.json(message);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const allMessages = expressAsyncHandler(async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await MessageService.getAllMessages(chatId);
    res.json(messages);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Used by Socket Handler - We can export the Service method directly or wrap it.
// The SocketHandler imports 'sendMessageFromSocketToDB'.
// We should update SocketHandler to import MessageService instead.
const sendMessageFromSocketToDB = async (messageFromSocket) => {
  try {
    // Adapt socket message object to service args
    // messageFromSocket: { userId, chatId, content }
    return await MessageService.sendMessage(
      messageFromSocket.userId,
      messageFromSocket.chatId,
      messageFromSocket.content
    );
  } catch (error) {
    return error;
  }
}

const clearChatMessages = expressAsyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id; // From authMiddleware

  const Chat = require("../models/chatModel");

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).send("Chat not found");

    if (chat.isGroupChat) {
      // Group: Admin Only
      if (chat.groupAdmin.toString() !== userId) {
        return res.status(403).send("Only admin can clear group chat");
      }
    } else {
      // 1:1: Any participant
      const isParticipant = chat.users.some(u => u.toString() === userId);
      if (!isParticipant) {
        return res.status(403).send("You are not part of this chat");
      }
    }

    await MessageService.clearMessages(chatId);
    res.status(200).send("Chat Cleared");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = { sendMessage, allMessages, sendMessageFromSocketToDB, clearChatMessages };
