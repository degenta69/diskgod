const express = require("express");
const {
  authUser,
  singleUser,
  currentLoggedInUser,
  registerUser,
  allUsers,
  updateUser,
} = require("../controller/userControllers");
const protect = require("../middlewares/authMiddleware");
const routes = express.Router();

routes.post("/signup", registerUser);
routes.post("/login", authUser);
routes.get("/getUser", protect, currentLoggedInUser);
routes.get("/", protect, allUsers);
routes.get("/:id", protect, singleUser);
routes.put("/update", protect, updateUser);

module.exports = routes;
