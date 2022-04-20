const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');
const expressAsyncHandler = require("express-async-handler");

const protect = expressAsyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send("Access denied");
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).send("Access denied");
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).send("Access denied");
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).send("Access denied");
    }
    }
);

module.exports = protect;