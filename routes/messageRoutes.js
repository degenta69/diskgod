const express = require("express");
const { sendMessage, allMessages, clearChatMessages } = require("../controller/messageControllers");
const protect = require("../middlewares/authMiddleware");
const routes = express.Router();

routes.post("/", protect, sendMessage);
routes.get("/:chatId", protect, allMessages);
routes.delete("/clear/:chatId", protect, clearChatMessages);

module.exports = routes;
