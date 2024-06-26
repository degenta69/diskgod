const expressAsyncHandler = require('express-async-handler')
const jwt = require('jsonwebtoken');

const color = require('colors')

const User = require('../models/UserModel')

const generateAuthToken = require('../config/generateAuthToken')
const bcrypt = require('bcryptjs')

const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, password, dob } = req.body

  if (!name || !email || !password || !dob) {
    return res.status(400).send('Please fill all the fields')
    // throw new Error("Please fill all the fields");
  }

  const userExist = await User.findOne({ email })

  if (userExist) {
    return res.status(400).send('User already exist')
  }

  const user = await User.create({
    name,
    email,
    password,
    dob
    // profilepic: req.file?.buffer? req.file.buffer.toString('base64') : null,
  })

  if (user) {
    const token = generateAuthToken(user._id)
    const sendUser = {
      name: user.name,
      email: user.email,
      profilepic: user.profilepic,
      id: user._id,
      dob: user.dob
    }
    return res.status(201).send({ ...sendUser, token })
  } else {
    return res.status(400).send('User not created')
  }
  return null
  // res.status(200).send("User created successfully");
})

const authUser = expressAsyncHandler(async (req, res, next) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).send('Please fill all the fields')
  }
  const user = await User.findOne({ email })
  try {
    // console.log(isCorrect);
    if (!user) {
      return res.status(404).send('User not found.')
    }
    const isCorrect = await bcrypt.compare(password, user.password)
    if (user) {
      if (isCorrect) {
        const sendUser = {
          name: user.name,
          email: user.email,
          profilepic: user.profilepic,
          id: user._id,
          dob: user.dob
        }
        req.user = sendUser
        return res
          .status(200)
          .send({ user: { ...sendUser }, token: generateAuthToken(user._id) })
      }
      return res
        .status(400)
        .json('please try to login with the correct credentials')
    }
    next()
  } catch (ex) {
    // console.log(ex, "ex");
    if (ex.message.indexOf('password') > -1) {
      return res
        .status(400)
        .send('Please try to login with the correct credentials')
    }
    if (ex.message.indexOf('email') > -1) {
      return res
        .status(400)
        .send('Please try to login with the correct credentials')
    }
    if (!user) {
      return res.status(404).send('User not found.')
    }
    return res.status(500).send('Something went wrong')
  }
})

const allUsers = expressAsyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ]
      }
    : {}
  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select('-password')

  // const users = await User.find();
  res.status(200).send(users)
})

const singleUser = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password')
  console.log(user,'user')
  if (!user) {
    return res.status(404).send('User not found')
  }
  res.status(200).send(user)
})

const currentLoggedInUser = expressAsyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).send('Access denied')
  }
  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).send('Access denied')
  }
  try {
    console.log(token,'ssss')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(401).send('Access denied')
    }
    // req.user = user
    res.status(200).send(user)
  } catch (err) {
    return res.status(401).send('Access denied')
  }
})

module.exports = { registerUser, authUser, allUsers, singleUser,currentLoggedInUser }
