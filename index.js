const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const cors = require('cors')
const { chats } = require('./dummyData')

const connectToMongoDB = require('./config/db')

connectToMongoDB()

app = express()

app.use(express.json()) // for parsing application/json

app.use(cors())

const server = require('http').createServer(app)

const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')
const messageRoutes = require('./routes/messageRoutes')
const { errorHandler, notFound } = require('./middlewares/errorMiddleware')
const path = require('path')
const { sendMessageFromSocketToDB } = require('./controller/messageControllers')
app.use('/api/user', userRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/message', messageRoutes)
//  deployment code

const __dirname1 = path.resolve()

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(__dirname1 + '/build'))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname1, 'build', 'index.html'))
  })
} else {
  app.use(express.static(__dirname1 + '/vc-front/public'))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname1, 'vc-front', 'public', 'index.html'))
  })
}

// deployment code
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 6453

server.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`.yellow.bold)
})

const io = require('socket.io')(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("setup", (userData) => {
    socket.join(userData.id);
    socket.emit("connected");
  });

  socket.on("join room", (room) => {
    socket.join(room);
  });

  socket.on("typing", (room) => {
    console.log(room,'test')
    socket.in(room.serverDetail).emit("typing", room.user);
  });

  socket.on("stop typing", (room) => {
    socket.in(room).emit("stop typing");
  });

  socket.on("new message", async (messageFromSocket) => {
    try {
      const newMessageReceived = await sendMessageFromSocketToDB(messageFromSocket);
      if (newMessageReceived.chat) {
        newMessageReceived.chat.users.forEach((user) => {
          // if (user._id.toString() !== newMessageReceived.sender._id.toString()) {
          // }
          io.in(user._id.toString()).emit("message received", newMessageReceived);
        });
      }
    } catch (error) {
      console.error("Error processing new message:", error);
      socket.emit("message error", { message: "Failed to process the message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});