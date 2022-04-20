const expressAsyncHandler = require("express-async-handler");

const color = require("colors");

const User = require("../models/UserModel");

const generateAuthToken = require("../config/generateAuthToken");
const bcrypt = require("bcryptjs");

const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, password, dob } = req.body;

  if (!name || !email || !password || !dob) {
    return res.status(400).send("Please fill all the fields");
    // throw new Error("Please fill all the fields");
  }

  const userExist = await User.findOne({ email });

  if (userExist) {
    return res.status(400).send("User already exist");
  }

  const user = await User.create({
    name,
    email,
    password,
    dob,
    // profilepic: req.file?.buffer? req.file.buffer.toString('base64') : null,
  });

  if (user) {
    const token = generateAuthToken(user._id);
    const sendUser = {
      name: user.name,
      email: user.email,
      profilepic: user.profilepic,
      id: user._id,
      dob: user.dob,
    };
    return res.status(201).send({ ...sendUser, token });
  } else {
    return res.status(400).send("User not created");
  }
  return null;
  // res.status(200).send("User created successfully");
});

const authUser = expressAsyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send("Please fill all the fields");
  }
  try {
    const user = await User.findOne({ email });

    const isCorrect = await bcrypt.compare(password, user.password);
    // console.log(isCorrect);

    if (user) {
      if (isCorrect) {
        const sendUser = {
          name: user.name,
          email: user.email,
          profilepic: user.profilepic,
          id: user._id,
          dob: user.dob,
        };
        req.user = sendUser;
        return res
          .status(200)
          .send({ user: { ...sendUser }, token: generateAuthToken(user._id) });
      }
      return res
        .status(400)
        .json("please try to login with the correct credentials");
    }
    if (!user) {
      return res.status(404).send("User not found.");
    }
    next();
  } catch (ex) {
    // console.log(ex, "ex");
    return res.status(500).send("Something went wrong");
  }
});

const allUsers = expressAsyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};
  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select("-password");

  // const users = await User.find();
  res.status(200).send(users);
});

const singleUser = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    return res.status(404).send("User not found");
  }
  res.status(200).send(user);
});


module.exports = { registerUser, authUser, allUsers, singleUser };
