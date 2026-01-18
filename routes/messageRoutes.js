const express = require("express");
const { sendMessage, allMessages } = require("../controller/messageControllers");
const protect = require("../middlewares/authMiddleware");
const routes = express.Router();

routes.post("/", protect, sendMessage);
routes.get("/:chatId", protect, allMessages);
routes.delete("/clear/:chatId", protect, require("../controller/messageControllers").clearChatMessages); // require needed since I haven't destructured it above yet
// routes.get("/:id",protect,singleUser);

// routes.post("/login",authUser);

module.exports = routes;
