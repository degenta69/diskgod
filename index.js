const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const { chats } = require("./dummyData");

const connectToMongoDB = require("./config/db");

connectToMongoDB();

app = express();

app.use(express.json()); // for parsing application/json

app.use(cors());

const server = require("http").createServer(app);


const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { errorHandler, notFound } = require("./middlewares/errorMiddleware");
const path  = require("path");
app.use('/api/user',userRoutes);
app.use('/api/chats',chatRoutes);
app.use('/api/message',messageRoutes);
//  deployment code

const __dirname1 = path.resolve();

if(process.env.NODE_ENV === "production"){
    app.use(express.static(__dirname1 + "/build"));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname1, "build","index.html"));
    });
}else{
    app.use(express.static(__dirname1 + "/vc-front/public"));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname1, "vc-front","public","index.html"));
    });

}

// deployment code
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 6453;



server.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`.yellow.bold);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`New client connected`.america.italic);

  socket.on("setup", (userData)=>{
    console.log(`this user ${userData.id} is connected`.padStart(30, " ").green.bold)
    socket.join(userData.id)
    socket.emit("connected")
  })

  socket.on("join room", (room)=>{
    console.log(`connected to room ${room}`.padStart(30, " ").green.bold)
    socket.join(room)
    // socket.emit("joined room")
  })

socket.on("typing", (room)=>{socket.in(room.serverDetail).emit("typing", room.user)})
socket.on("stop typing", (room)=>{socket.in(room).emit("stop typing")})

  socket.on("new message", (newMessageRecieved)=>{
    var chat = newMessageRecieved.chat;
    
    if(!(chat.users)) return console.log("no users in chat")
    chat.users.forEach((user) => {
      if(user._id !== newMessageRecieved.sender._id){
        // io.to(user._id).emit("new message", newMessageRecieved)
        socket.in(user._id).emit("message received", newMessageRecieved)
      }
    });

  })

  socket.off("setup", ()=>{
    console.log(`this user ${userData.id} is disconnected`.padStart(30, " ").green.bold)
    socket.leave(userData.id)
  }
  )
});
