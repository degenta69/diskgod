const express = require("express");
const { authUser, singleUser } = require("../controller/userControllers");
const { registerUser, allUsers } = require("../controller/userControllers");
const protect = require("../middlewares/authMiddleware");
const routes = express.Router();

routes.post("/signup",registerUser);
routes.get("/",protect,allUsers);
routes.get("/:id",protect,singleUser);

routes.post("/login",authUser);

module.exports = routes;
