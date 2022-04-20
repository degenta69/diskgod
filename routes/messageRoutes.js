const express = require("express");
const { sendMessage, allMessages } = require("../controller/messageControllers");
const protect = require("../middlewares/authMiddleware");
const routes = express.Router();

routes.post("/",protect,sendMessage);
routes.get("/:chatId",protect,allMessages);
// routes.get("/:id",protect,singleUser);

// routes.post("/login",authUser);

module.exports = routes;
