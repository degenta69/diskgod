# DiskGod

Backend for the DiskGod text chat app. Express exposes the HTTP API, MongoDB stores users, chats, and messages, and Socket.IO delivers typing and new-message events.

## Prerequisites

- Node.js 18 or newer
- A running MongoDB instance

## Setup

```bash
npm install
cp .env.example .env
```

Set `JWT_SECRET` in `.env` before starting. Tokens are signed with that value.

```bash
npm start
```

`npm run dev` restarts the process when a file changes. The server listens on `PORT`, or 6453 when `PORT` is unset.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | HTTP port. Defaults to 6453. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Secret for 7-day bearer tokens. |
| `NODE_ENV` | No | `production` serves the frontend build. Any other value serves the frontend public directory. |

Both frontend paths are resolved next to this repo, under `diskgod-front`, not from the `build/` directory checked in here.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Run the API. |
| `npm run dev` | Run the API and restart on file changes. |
| `npm test` | Run `node --test`. |

## HTTP API

Signup and login are public. Every other route expects `Authorization: Bearer <token>`.

### Users

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/user/signup` | Body: `name`, `email`, `password`, `dob`. Returns a token. |
| `POST` | `/api/user/login` | Body: `email`, `password`. Returns `{ user, token }`. |
| `GET` | `/api/user/getUser` | The user for the bearer token. |
| `GET` | `/api/user` | Search with `?search=`. Omits the caller. |
| `GET` | `/api/user/:id` | One user, without the password. |
| `PUT` | `/api/user/update` | Updates `name`, `about`, `banner`, or `profilepic` for the caller. |

### Chats

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/chats` | Body: `userId`. Opens the direct chat, creating it if needed. |
| `GET` | `/api/chats` | Chats for the caller, including `unreadCount`. |
| `POST` | `/api/chats/group` | Body: `chatName`, `users` (at least two other people). |
| `PUT` | `/api/chats/group/rename` | Body: `chatId` plus any of `chatName`, `Image`, `banner`, `description`. |
| `PUT` | `/api/chats/group/add` | Body: `chatId`, `userId`. |
| `PUT` | `/api/chats/group/remove` | Body: `chatId`, `userId`. |

### Messages

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/message` | Body: `chatId`, `content`. |
| `GET` | `/api/message/:chatId` | Messages in that chat. |
| `DELETE` | `/api/message/clear/:chatId` | Clears the chat. Group chats require the admin. |

## Realtime

The Socket.IO server accepts connections from any origin. Events used by the app:

- `setup` joins the user's room and their existing chat rooms, then emits `connected` and `online users list`.
- `join room` joins a chat room created after connect.
- `typing` / `stop typing` relay typing state.
- `new message` saves a raw payload or rebroadcasts a message that already has an `_id`.
- `mark chat read` marks the chat read and emits `chat read update`.

## Layout

`routes/` maps URLs to `controller/`, which calls `services/` and the Mongoose models in `models/`. `middlewares/authMiddleware.js` checks bearer tokens. `socket/socketHandler.js` owns the realtime events.
