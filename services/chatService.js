const Chat = require("../models/chatModel");
const User = require("../models/UserModel");
const Message = require("../models/messageModel");
const mongoose = require("mongoose");

const PUBLIC_USER = "-password";

function withChatDetails(query, options = {}) {
    let next = query.populate("users", PUBLIC_USER);
    if (options.latestMessage) next = next.populate("latestMessage");
    if (options.groupAdmin) next = next.populate("groupAdmin", PUBLIC_USER);
    if (options.sort) next = next.sort(options.sort);
    if (options.lean) next = next.lean();
    return next;
}

function withLatestSender(docs) {
    return User.populate(docs, {
        path: "latestMessage.sender",
        select: PUBLIC_USER,
    });
}

class ChatService {
    async accessChat(currentUserId, targetUserId) {
        if (currentUserId === targetUserId) {
            // Personal self-chat logic
            const chatData = {
                chatName: "Personal Chat",
                users: [targetUserId, currentUserId],
                isGroupChat: false,
            };
            const createdChat = await Chat.create(chatData);
            return withChatDetails(Chat.findById(createdChat._id), { latestMessage: true });
        }

        let chats = await withChatDetails(
            Chat.find({
                isGroupChat: false,
                $and: [
                    { users: { $elemMatch: { $eq: currentUserId } } },
                    { users: { $elemMatch: { $eq: targetUserId } } },
                ],
            }),
            { latestMessage: true }
        );

        chats = await withLatestSender(chats);

        if (chats.length > 0) {
            return chats[0]; // Return the first matching chat (should be only one)
        } else {
            const chatData = {
                chatName: "new Chat",
                users: [currentUserId, targetUserId],
                isGroupChat: false,
            };
            const createdChat = await Chat.create(chatData);
            return withChatDetails(Chat.findById(createdChat._id), { latestMessage: true });
        }
    }

    async fetchChats(userId) {
        let chats = await withChatDetails(
            Chat.find({
                users: { $elemMatch: { $eq: userId } },
            }),
            {
                latestMessage: true,
                groupAdmin: true,
                sort: { createdAt: -1 },
                lean: true,
            }
        );

        chats = await withLatestSender(chats);

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

        return withChatDetails(Chat.findById(groupChat._id), { groupAdmin: true });
    }

    async renameGroupChat(chatId, updateData) {
        return withChatDetails(
            Chat.findByIdAndUpdate(chatId, updateData, { new: true }),
            { groupAdmin: true, latestMessage: true }
        );
    }

    async addToGroup(chatId, userId) {
        const findChat = await Chat.findById(chatId);
        if (!findChat) throw new Error("Chat not found");
        if (findChat.users.length >= 10) throw new Error("Group Chat cannot have more than 10 users"); // Configurable limit
        if (findChat.users.includes(userId)) throw new Error("User already added to the group");

        return withChatDetails(
            Chat.findByIdAndUpdate(chatId, { $push: { users: userId } }, { new: true }),
            { groupAdmin: true, latestMessage: true }
        );
    }

    async removeFromGroup(chatId, userId, requesterId) {
        const findChat = await Chat.findById(chatId);
        if (!findChat) throw new Error("Chat not found");

        // Logic extraction from controller
        const isAdminRemove = findChat.groupAdmin.toString() === requesterId;
        const isSelfLeave = requesterId === userId;

        if (!isSelfLeave && !isAdminRemove) {
            throw new Error("Not authorized to remove user");
        }

        // If admin is leaving (and rules say admin can't be removed/leave without transfer - simplified here as per existing logic)
        if (findChat.groupAdmin.toString() === userId && !isSelfLeave) {
            throw new Error("Cannot remove the admin");
        }

        return withChatDetails(
            Chat.findByIdAndUpdate(chatId, { $pull: { users: userId } }, { new: true }),
            { groupAdmin: true, latestMessage: true }
        );
    }
}

module.exports = new ChatService();
