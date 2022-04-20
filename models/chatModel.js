const mongoose = require("mongoose");
const Schema = mongoose.Schema(
  {
    chatName: {
      type: String,
      required: true,
      trim: true,
    },

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    Image: {
      type: String,
      data: Buffer,
      contentType: String,
    },
    banner: {
      type: String,
      data: Buffer,
      contentType: String,
    },
    // createdAt: {
    //     type: Date,
    //     default: Date.now,
    // },
    // updatedAt: {    // for chat update  //
    //     type: Date,

    // },
    // deletedAt: {
    //     type: Date,
    // },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", Schema);

module.exports = Chat;
