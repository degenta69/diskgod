const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const Chat = require("../models/chatModel");
const Message = require("../models/MessageModal");
const User = require("../models/UserModel");

//@description     Create New Message
//@route           POST /api/Message/
//@access          Protected
const sendMessage = expressAsyncHandler(async (req, res) => {
  const { chatId, content } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(400).send("Token is required");
  }
  if (!chatId || !content) {
    return res.status(400).send("chatId and content is required");
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.userId;
  const messageData = {
    content: content,
    sender: userId,
    chat: chatId,
  };
  try {
    var message = await Message.create(messageData);

    message = await message.populate("sender", "-password");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "-password",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    // console.log(error, "messageData");
    return res.status(500).send(error);
  }
});

const sendMessageFromSocketToDB = async(messageFromSocket)=>{
  const messageData = {
    content: messageFromSocket.content,
    sender: messageFromSocket.userId,
    chat: messageFromSocket.chatId,
  }
  try {
    var message = await Message.create(messageData);

    message = await message.populate("sender", "-password");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "-password",
    });

    await Chat.findByIdAndUpdate(messageData.chat, { latestMessage: message });

    return message
  } catch (error) {
    // console.log(error, "messageData");
    return error;
  }
}

//@description     Get all Messages
//@route           GET /api/Message/:chatId
//@access          Protected
const allMessages = expressAsyncHandler(async (req, res) => {
  const { chatId } = req.params;
  try {
    var messages = await Message.find({ chat: chatId })
      .populate("sender", "name profilepic email")
      .populate("chat");
    messages = await User.populate(messages, {
      path: "chat.users",
      select: "-password",
    });
    messages = await Chat.populate(messages, {
      path: "chat.latestMessage",
      select: "",
    });

    res.json(messages);
    // return res.status(200).send(messages);
  } catch (error) {
    // console.log(error);
    return res.status(500).send(error);
  }
});

module.exports = { sendMessage, allMessages, sendMessageFromSocketToDB };
