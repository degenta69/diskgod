const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const User = require("../models/UserModel");

const SENDER_FIELDS = "name profilepic banner email createdAt";
const CHAT_USER_FIELDS = "name profilepic banner email createdAt";

async function hydrateMessages(target) {
    const populated = await Message.populate(target, [
        { path: "sender", select: SENDER_FIELDS },
        { path: "chat" },
    ]);
    return User.populate(populated, {
        path: "chat.users",
        select: CHAT_USER_FIELDS,
    });
}

class MessageService {
    async sendMessage(userId, chatId, content) {
        const message = await Message.create({
            content: content,
            sender: userId,
            chat: chatId,
            readBy: [userId],
        });

        const hydrated = await hydrateMessages(message);
        await Chat.findByIdAndUpdate(chatId, { latestMessage: hydrated });
        return hydrated;
    }

    async getAllMessages(chatId) {
        const messages = await Message.find({ chat: chatId });
        return hydrateMessages(messages);
    }

    async markChatAsRead(chatId, userId) {
        if (!chatId || !userId) throw new Error("Invalid params");

        // Update all messages in this chat where 'readBy' does NOT contain userId
        await Message.updateMany(
            { chat: chatId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );

        // Return success to trigger socket emission
        return { chatId, userId };
    }

    async clearMessages(chatId) {
        await Message.deleteMany({ chat: chatId });
        await Chat.findByIdAndUpdate(chatId, { latestMessage: null });
        return { message: "Chat cleared successfully" };
    }
}

module.exports = new MessageService();
