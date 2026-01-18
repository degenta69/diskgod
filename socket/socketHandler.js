const { sendMessageFromSocketToDB } = require('../controller/messageControllers');
const ChatService = require('../services/chatService');
const MessageService = require('../services/messageService');

const socketHandler = (io) => {
    io.on("connection", (socket) => {

        socket.on("setup", async (userData) => {
            socket.join(userData.id);

            let chatIds = [];
            // OPTIMIZATION: Fan-out on Connect
            // Join all chat rooms immediately so we can use O(1) broadcasting
            try {
                chatIds = await ChatService.fetchChatIds(userData.id);
                if (chatIds && Array.isArray(chatIds)) {
                    chatIds.forEach(roomId => {
                        socket.join(roomId);
                    });
                }
            } catch (e) {
                console.error("Socket Setup Error", e);
            }

            socket.emit("connected");

            // OPTIMIZATION: Initial Online Status Sync
            // 1. Identify all users in these chats
            // 2. Check if they are online (i.e., if their personal room 'userId' exists in adapter)
            // This ensures the connecting user sees who is ALREADY online.
            try {
                if (!chatIds) chatIds = await ChatService.fetchChatIds(userData.id); // Ensure we have them
                const onlineFriends = [];

                // We need to fetch the actual members of these chats to know who to check?
                // ChatService.fetchChatIds only returns IDs.
                // Let's use a specialized method or just iterate assuming we can't easily get member lists from IDs without DB hit.
                // Alternative: We can check if *any* room we just joined has other people? 
                // BUT, socket.io rooms don't list users by DB ID.

                // Better approach: 
                // Fetch chats with 'users' populated.
                const userChats = await ChatService.fetchChats(userData.id);
                const uniqueUserIds = new Set();

                userChats.forEach(chat => {
                    chat.users.forEach(u => {
                        if (u._id.toString() !== userData.id) {
                            uniqueUserIds.add(u._id.toString());
                        }
                    });
                });

                uniqueUserIds.forEach(friendId => {
                    // Check if room 'friendId' has any sockets
                    const room = io.sockets.adapter.rooms.get(friendId);
                    if (room && room.size > 0) {
                        onlineFriends.push(friendId);
                    }
                });

                socket.emit("online users list", onlineFriends);

            } catch (e) {
                console.error("Online Status Sync Error", e);
            }
        });

        socket.on("join room", (room) => {
            // Still useful for new chats created while online
            socket.join(room);
        });

        socket.on("typing", (room) => {
            if (room.serverDetail) {
                socket.in(room.serverDetail).emit("typing", room.user);
            } else {
            }
        });

        socket.on("stop typing", (room) => {
            socket.in(room).emit("stop typing");
        });

        socket.on("new message", async (messageFromSocket) => {
            try {
                let newMessageReceived;

                // FIX for Double Send/Undefined Logic:
                // If message has _id, it came from API (already saved). Just broadcast it.
                if (messageFromSocket._id) {
                    newMessageReceived = messageFromSocket;
                } else {
                    // Raw socket message - save to DB first
                    newMessageReceived = await sendMessageFromSocketToDB(messageFromSocket);
                }

                if (newMessageReceived && newMessageReceived.chat) {
                    const roomId = newMessageReceived.chat._id.toString();
                    // OPTIMIZED: Room-based Emission (O(1))
                    // We emit to the Chat Room ID.
                    // All users (including sender) are in this room if they are online.
                    // Frontend 'useSocketEvents' will handle filtering active vs notification.

                    // CRITICAL FIX: Use socket.in() instead of io.in() to EXCLUDE the sender.
                    // The sender already has the optimistic update. sending it back causes duplicates.
                    socket.in(roomId).emit("message received", newMessageReceived);

                    // OPTIMIZATION: Notify users personally to update their Chat List (Sidebar)
                    // This fixes the "New Chat" sync issue where a user isn't in the room yet.
                    newMessageReceived.chat.users.forEach(user => {
                        if (user._id == messageFromSocket.userId) return; // Don't notify sender

                        // FIX: Ensure ID is string to match the room name from 'setup'
                        const userRoomId = user._id.toString();

                        // Emit to user's personal room (joined in setup)
                        io.in(userRoomId).emit("chat list update", newMessageReceived);
                    });
                }
            } catch (error) {
                console.error("Error processing new message:", error);
                socket.emit("message error", { message: "Failed to process the message" });
            }
        });

        // FIX: Read Receipt Listener
        socket.on("mark chat read", async ({ chatId, userId }) => {
            if (!chatId || !userId) return;
            try {
                // 1. Update DB (Bulk update messages)
                await MessageService.markChatAsRead(chatId, userId);

                // 2. Broadcast to Room (Everyone needs to know, including sender to update their own 'readBy' for consistency)
                io.in(chatId).emit("chat read update", { chatId, userId });
            } catch (e) {
                console.error("Mark Read Error", e);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    });
};

module.exports = socketHandler;
