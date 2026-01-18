const express = require('express')
const dotenv = require('dotenv')
dotenv.config()
const cors = require('cors')
require('colors') // Enable color extensions
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
  app.use(express.static(__dirname1 + '/../diskgod-front/build'))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname1, '..', 'diskgod-front', 'build', 'index.html'))
  })
} else {
  app.use(express.static(__dirname1 + '/../diskgod-front/public'))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname1, '..', 'diskgod-front', 'public', 'index.html'))
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

const socketHandler = require('./socket/socketHandler');
socketHandler(io);