const expressAsyncHandler = require('express-async-handler')
const UserService = require('../services/userService');

const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, password, dob } = req.body;
  try {
    const user = await UserService.registerUser(name, email, password, dob);
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

const authUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send('Please fill all the fields');
  }

  try {
    const result = await UserService.authenticateUser(email, password);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send("Please try to login with the correct credentials");
  }
});

const allUsers = expressAsyncHandler(async (req, res) => {
  try {
    const users = await UserService.searchUsers(req.query.search, req.user._id);
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

const singleUser = expressAsyncHandler(async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.status(200).send(user);
  } catch (error) {
    res.status(404).send(error.message);
  }
});

const currentLoggedInUser = expressAsyncHandler(async (req, res) => {
  res.status(200).send(req.user);
});

const updateUser = expressAsyncHandler(async (req, res) => {
  try {
    const updatedUser = await UserService.updateUserProfile(req.user._id, req.body);
    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

module.exports = { registerUser, authUser, allUsers, singleUser, currentLoggedInUser, updateUser };
