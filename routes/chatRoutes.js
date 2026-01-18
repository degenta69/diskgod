const express = require("express");
const {
  accessChats,
  fetchChats,
  createGroupChat,
  renameGroupChat,
  addGroupChat,
  removeGroupChat,
} = require("../controller/chatControllers");
const protect = require("../middlewares/authMiddleware");
const routes = express.Router();

routes.post("/", protect, accessChats);
routes.get("/", protect, fetchChats);
routes.post("/group", protect, createGroupChat);
routes.put("/group/rename", protect, renameGroupChat);
routes.put("/group/add", protect, addGroupChat);
routes.put("/group/remove", protect, removeGroupChat);

module.exports = routes;
