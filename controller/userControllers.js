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
  // This controller reconstructs user from token/header if needed, but usually middleware does this.
  // The original logic manually verified token again which is redundant if 'protect' middleware is used,
  // BUT this endpoint might be called to "get current user" based on token in header without intermediate middleware in some routes?
  // Let's keep logic but use Service for DB fetch.
  // Actually, looking at original code: it verifies token and fetches user.
  // Ideally this should use the 'protect' middleware attached to the route, then just return req.user.
  // However, keeping behavior consistent for now.

  // Original code checks headers.authorization manually.
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).send('Access denied');

  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).send('Access denied');

  // We can't easily move jwt.verify to service without passing the secret, 
  // or we can import jwt in service. Let's just use the service to get user by ID after decoding.
  try {
    const jwt = require('jsonwebtoken'); // Import here or top level
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserService.getUserById(decoded.userId);
    res.status(200).send(user);
  } catch (err) {
    return res.status(401).send('Access denied');
  }
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
