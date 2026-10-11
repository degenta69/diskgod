const Chat = require("../models/chatModel");
const User = require("../models/UserModel");
const { isChatMember, isGroupAdmin, sameId } = require("../utils/access");

function fail(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function findChatById(chatId) {
    try {
        return await Chat.findById(chatId);
    } catch (error) {
        if (error.name === "CastError") throw fail(400, "Invalid chat id");
        throw error;
    }
}

class ChatService {
    async assertParticipant(chatId, userId) {
        if (!chatId || !userId) throw fail(400, "Chat and user are required");

        const chat = await findChatById(chatId);
        if (!chat) throw fail(404, "Chat not found");
        if (!isChatMember(chat.users, userId)) {
            throw fail(403, "You are not a participant in this chat");
        }
        return chat;
    }

    async accessChat(currentUserId, targetUserId) {
        if (currentUserId === targetUserId) {
            // Personal self-chat logic
            const chatData = {
                chatName: "Personal Chat",
                users: [targetUserId, currentUserId],
                isGroupChat: false,
            };
            const createdChat = await Chat.create(chatData);
            return await Chat.findById(createdChat._id)
                .populate("users", "-password")
                .populate("latestMessage");
        }

        let chats = await Chat.find({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: currentUserId } } },
                { users: { $elemMatch: { $eq: targetUserId } } },
            ],
        })
            .populate("users", "-password")
            .populate("latestMessage");

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "-password",
        });

        if (chats.length > 0) {
            return chats[0]; // Return the first matching chat (should be only one)
        } else {
            const chatData = {
                chatName: "new Chat",
                users: [currentUserId, targetUserId],
                isGroupChat: false,
            };
            const createdChat = await Chat.create(chatData);
            return await Chat.findById(createdChat._id)
                .populate("users", "-password")
                .populate("latestMessage");
        }
    }

    async fetchChats(userId) {
        let chats = await Chat.find({
            users: { $elemMatch: { $eq: userId } },
        })
            .populate("users", "-password")
            .populate("latestMessage")
            .populate("groupAdmin", "-password")
            .sort({ createdAt: -1 })
            .lean();

        chats = await User.populate(chats, {
            path: "latestMessage.sender",
            select: "-password",
        });

        // CALCULATE UNREAS MESSAGES
        // Efficient way: Aggregation is better, but since we have the list, we can do a parallel count query
        // or iterate. For scalability, we should use aggregation in the future.
        // For now, let's execute a count query for each chat (N+1 but N is small: user's chat list).
        // Or better: Fetch all unread messages for this user grouped by chat.

        const Message = require("../models/messageModel");
        const mongoose = require("mongoose");
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const unreadCounts = await Message.aggregate([
            {
                $match: {
                    chat: { $in: chats.map(c => c._id) },
                    readBy: { $ne: userObjectId }, // Messages NOT read by user
                    sender: { $ne: userObjectId }  // AND NOT sent by user (Self-sent messages are read)
                }
            },
            { $group: { _id: "$chat", count: { $sum: 1 } } }
        ]);

        // Map counts to chats
        const countMap = {};
        unreadCounts.forEach(c => { countMap[c._id.toString()] = c.count });

        chats.forEach(chat => {
            chat.unreadCount = countMap[chat._id.toString()] || 0;
        });

        return chats;
    }

    async fetchChatIds(userId) {
        const chats = await Chat.find({
            users: { $elemMatch: { $eq: userId } },
        }).select("_id");
        return chats.map(c => c._id.toString());
    }

    async createGroupChat(chatName, users, adminUser, image, banner, description) {
        const groupChat = await Chat.create({
            chatName: chatName,
            users: users,
            isGroupChat: true,
            groupAdmin: adminUser,
            Image: image || "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg",
            banner: banner || "",
            description: description || "Welcome to the group!",
        });

        return await Chat.findById(groupChat._id)
            .populate("users", "-password")
            .populate("groupAdmin", "-password");
    }

    async renameGroupChat(chatId, updateData, requesterId) {
        const chat = await findChatById(chatId);
        if (!chat) throw fail(404, "Chat not found");
        if (!chat.isGroupChat) throw fail(400, "Not a group chat");
        if (!isGroupAdmin(chat, requesterId)) {
            throw fail(403, "Only the group admin can update this chat");
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            updateData,
            { new: true }
        )
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage");

        return updatedChat;
    }

    async addToGroup(chatId, userId, requesterId) {
        const findChat = await findChatById(chatId);
        if (!findChat) throw fail(404, "Chat not found");
        if (!findChat.isGroupChat) throw fail(400, "Not a group chat");
        if (!isGroupAdmin(findChat, requesterId)) {
            throw fail(403, "Only the group admin can add members");
        }
        if (findChat.users.length >= 10) throw fail(400, "Group Chat cannot have more than 10 users");
        if (isChatMember(findChat.users, userId)) throw fail(400, "User already added to the group");

        try {
            const userExists = await User.exists({ _id: userId });
            if (!userExists) throw fail(404, "User not found");
        } catch (error) {
            if (error.statusCode) throw error;
            if (error.name === "CastError") throw fail(400, "Invalid user id");
            throw error;
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $push: { users: userId } },
            { new: true }
        )
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage");

        return updatedChat;
    }

    async removeFromGroup(chatId, userId, requesterId) {
        const findChat = await findChatById(chatId);
        if (!findChat) throw fail(404, "Chat not found");

        const isAdminRemove = isGroupAdmin(findChat, requesterId);
        const isSelfLeave = sameId(requesterId, userId);

        if (!isSelfLeave && !isAdminRemove) {
            throw fail(403, "Not authorized to remove user");
        }

        if (isGroupAdmin(findChat, userId) && !isSelfLeave) {
            throw fail(400, "Cannot remove the admin");
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { $pull: { users: userId } },
            { new: true }
        )
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage");

        return updatedChat;
    }
}

module.exports = new ChatService();
