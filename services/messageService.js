const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const User = require("../models/UserModel");
const {
    DEFAULT_PAGE_SIZE,
    isBlank,
    parsePageLimit,
    parseObjectId,
    parseCursorId,
    buildOlderThanFilter,
    shapeMessagePage,
} = require("./messagePagination");

const SENDER_FIELDS = "name profilepic banner email createdAt";
const CHAT_USER_FIELDS = "name profilepic banner email createdAt";

class MessageService {
    async sendMessage(userId, chatId, content) {
        const messageData = {
            content: content,
            sender: userId,
            chat: chatId,
            readBy: [userId] // Sender has read their own message
        };

        try {
            let message = await Message.create(messageData);

            message = await message.populate("sender", "name profilepic banner email createdAt");
            message = await message.populate("chat");
            message = await User.populate(message, {
                path: "chat.users",
                select: "name profilepic banner email createdAt",
            });

            await Chat.findByIdAndUpdate(chatId, { latestMessage: message });
            return message;
        } catch (error) {
            throw error;
        }
    }

    async getAllMessages(chatId) {
        const messages = await Message.find({ chat: chatId })
            .populate("sender", "name profilepic email createdAt")
            .populate("chat")
            .lean(); // Optimization

        // We still need to populate detailed nested fields if frontend expects them
        // But .lean() returns POJO, so we can't use .populate() on it directly unless we use chain.
        // Mongoose 6+ supports deep populate better, but let's stick to reliable manual populate if needed or standard chain.
        // Wait, User.populate() works on POJOs too in recent Mongoose versions.

        // Reverting lean() for safety on complex nested population chains unless we test thoroughly.
        // sticking to standard query for complex population just to be safe.

        let populatedMessages = await Message.find({ chat: chatId })
            .populate("sender", "name profilepic banner email createdAt")
            .populate("chat");

        populatedMessages = await User.populate(populatedMessages, {
            path: "chat.users",
            select: "name profilepic banner email createdAt",
        });

        return populatedMessages;
    }

    async getMessagePage(chatId, userId, options = {}) {
        parseObjectId(chatId, "chatId");
        if (!userId) {
            const error = new Error("Access denied");
            error.statusCode = 401;
            throw error;
        }

        const limit = isBlank(options.limit) ? DEFAULT_PAGE_SIZE : parsePageLimit(options.limit);
        const cursorId = parseCursorId(options.before);

        const chat = await Chat.findById(chatId).select("users");
        if (!chat) {
            const error = new Error("Chat not found");
            error.statusCode = 404;
            throw error;
        }
        const isMember = chat.users.some((id) => String(id) === String(userId));
        if (!isMember) {
            const error = new Error("You are not a participant in this chat");
            error.statusCode = 403;
            throw error;
        }

        let cursor = null;
        if (cursorId) {
            cursor = await Message.findById(cursorId).select("createdAt chat");
            if (!cursor || String(cursor.chat) !== String(chatId)) {
                const error = new Error("before does not match a message in this chat");
                error.statusCode = 400;
                throw error;
            }
        }

        let messages = await Message.find(buildOlderThanFilter(chatId, cursor))
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1)
            .populate("sender", SENDER_FIELDS)
            .populate("chat");

        messages = await User.populate(messages, {
            path: "chat.users",
            select: CHAT_USER_FIELDS,
        });

        return shapeMessagePage(messages, limit);
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
