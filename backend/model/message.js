const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, trim: true, default: "" },
    image: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    messageType: {
      type: String,
      enum: ["text", "image", "mixed"],
      default: "text",
    },
    readAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
