const { red } = require("colors");
const expressAsyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/UserModel");
const jwt = require("jsonwebtoken");
// controller for fetching chat with one person only always sends the same chat with the same pair of user
const accessChats = expressAsyncHandler(async (req, res) => {
  const { userId } = req.body;
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(400).send("Token is required");
  }
  if (req.user.id === userId) {
    let chatData = {
      chatName: "Personal Chat",
      users: [userId, req.user.id],
      isGroupChat: false,
    };
    try {
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findById({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("latestMessage");
      return res.status(200).send(fullChat);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  var chats = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user.id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");
  chats = await User.populate(chats, {
    path: "latestMessage.sender",
    select: "-password",
  });
  if (chats.length > 0) {
    return res.status(200).send(chats);
  } else {
    const chatData = {
      chatName: "new Chat",
      users: [req.user.id, userId],
      isGroupChat: false,
    };
    try {
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findById({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("latestMessage");
      return res.status(200).send(fullChat);
    } catch (error) {
      return res.status(500).send(error);
    }
  }
});

// controller for getting all the chats for the logged in user
const fetchChats = expressAsyncHandler(async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(400).send("Token is required");
  }
  const decode = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decode.userId;
  const id = req.user.id?req.user.id:userId; 
  var chats = await Chat.find({
    users: { $elemMatch: { $eq: id } },
  })
    .populate("users", "-password")
    .populate("latestMessage")
    .populate("groupAdmin", "-password")
    .sort({ createdAt: -1 });
  chats = await User.populate(chats, {
    path: "latestMessage.sender",
    select: "-password",
  });
  return res.status(200).send(chats);
});

// can be used for creating group chat or for creating a chat with one person
const createGroupChats = expressAsyncHandler(async (req, res) => {
  if (!req.body.chatName || !req.body.users) {
    return res.status(400).send("Group Name and Users are required");
  }
  var users = req.body.users;
  const decode = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET);
  const userId = decode.userId;
  users.push(req.user.id?req.user.id:userId);
  var chatName = req.body.chatName;
  // console.log(users, chatName, req.user.id);
  if (users.length < 2) {
    return res.status(400).send("Group Chat must have atleast 2 users");
  }
  if (users.length > 10) {
    return res.status(400).send("Group Chat cannot have more than 10 users");
  }
  if (users.length === 2) {
    let chatData = {
      chatName: chatName,
      users: users,
      Image: req.body.Image?req.body.Image:"",
      banner: req.body.banner?req.body.banner:"",
      isGroupChat: false,
    };
    try {
      const createdChat = await Chat.create(chatData);
      var fullChat = await Chat.findById({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("latestMessage");
      fullChat = await User.populate(fullChat, {
        path: "latestMessage.sender",
        select: "-password",
      });
      return res.status(200).send(fullChat);
    } catch (error) {
      return res.status(500).send(error);
    }
  }
  let chatData = {
    chatName: chatName,
    users: users,
    groupAdmin: req.user.id?req.user.id:userId,
    Image: req.body.Image?req.body.Image:"",
    banner: req.body.banner?req.body.banner:"",
    isGroupChat: true,
  };
  // console.log(chatData);
  try {
    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById({ _id: createdChat._id.toString() })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");
    // fullChat = await User.populate(fullChat, {
    //     path: "latestMessage.sender",
    //     select: "-password",
    //   });
    // console.log(fullChat,'fullchat');
    return res.status(200).send(fullChat);
  } catch (error) {
    // console.log(error);
    return res.status(500).send(error);
  }
});

const renameGroupChat = expressAsyncHandler(async (req, res) => {
  if (!req.body.chatName) {
    return res.status(400).send("Chat Name is required");
  }
  var chatName = req.body.chatName;
  var chatId = req.body.chatId;
  try {
    let chatData = {
      chatName: chatName,
    }
    if(req.body.Image){
      chatData ={...chatData,Image:req.body.Image}
    }
    if(req.body.banner){
      chatData = {...chatData,banner:req.body.banner}
    }
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {...chatData},
      { new: true }
    );
    const fullChat = await Chat.findById({ _id: updatedChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");
    // fullChat = await User.populate(fullChat, {
    //     path: "latestMessage.sender",
    //     select: "-password",

    // });
    return res.status(200).send(fullChat);
  } catch (error) {
    return res.status(500).send(error);
  }
});

const addGroupChat = expressAsyncHandler(async (req, res) => {
  if (!req.body.chatId) {
    return res.status(400).send("Chat Id is required");
  }
  if (!req.body.userId) {
    return res.status(400).send("User Id is required");
  }
  var chatId = req.body.chatId;
  var userId = req.body.userId;
  try {
    const findChat = await Chat.findById(chatId);
    if (!findChat) {
      return res.status(400).send("Chat not found");
    }
    if (findChat.users.length === 10) {
      return res
        .status(200)
        .send({ error: "Group Chat cannot have more than 10 users" });
    }
    if (findChat.users.includes(userId)) {
      return res
        .status(200)
        .send({ error: "User already added to the group", userId: userId });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      findChat._id,
      { $push: { users: userId } },
      { new: true }
    );
    const fullChat = await Chat.findById({ _id: updatedChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");
    // fullChat = await User.populate(fullChat, {
    //     path: "latestMessage.sender",
    //     select: "-password",

    // });
    // console.log(userId, "fullchat");
    return res.status(200).send(fullChat);
  } catch (error) {
    return res.status(500).send(error);
  }
});

const removeGroupChat = expressAsyncHandler(async (req, res) => {
  if (!req.body.chatId) {
    return res.status(400).send("Chat Id is required");
  }
  if (!req.body.userId) {
    return res.status(400).send("User Id is required");
  }
  var chatId = req.body.chatId;
  var userId = req.body.userId;
  const findChat = await Chat.findById(chatId);
  if (!findChat) {
    return res.status(400).send("Chat not found");
  }
  if (!findChat.users.includes(userId)) {
    return res
      .status(200)
      .send({ error: "There's no user with that id in the group" });
  }
  if (findChat.users.length === 2) {
    const delte = await Chat.findByIdAndDelete({ _id: chatId });
    // console.log("delted chAT");
    return res.status(200).send({ error: delte });
  }
  if (findChat.groupAdmin.toString().search(userId) === 0) {
    // console.log(findChat.groupAdmin.toString().search(userId),'useris',userId,'adminis',findChat.groupAdmin.toString())
    if ((req.user.id = userId)) {
      const delte = await Chat.findByIdAndDelete({ _id: chatId });
      return res
        .status(200)
        .send({ error: "you are admin buddy", delete: delte });
    }
    return res
      .status(403)
      .send({ error: "Sorry you can't remove the admin", delete: delte });
  }
  if (req.user.id === userId) {
    let updatedChat = await Chat.findByIdAndUpdate(
      findChat._id,
      { $pull: { users: userId } },
      { new: true }
    );
    return res.status(200).send({
      error: "you are removed from that group",
      updatedChat: updatedChat,
    });
  }

  try {
    let updatedChat = await Chat.findByIdAndUpdate(
      findChat._id,
      { $pull: { users: userId } },
      { new: true }
    );
    const fullChat = await Chat.findById({ _id: updatedChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage");
    // fullChat = await User.populate(fullChat, {
    //     path: "latestMessage.sender",
    //     select: "-password",

    // });
    // console.log(updatedChat, "fullchat");
    return res.status(200).send(fullChat);
  } catch (error) {
    return res.status(500).send(error);
  }
});

module.exports = {
  accessChats,
  fetchChats,
  createGroupChats,
  renameGroupChat,
  addGroupChat,
  removeGroupChat,
};
