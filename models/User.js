// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },

    password: {
      type: String,
      required: true
      // store a HASH here (bcrypt/argon2), not a plain password
    },

    // object with key -> value (string) pairs
    // e.g. { "android_device_1": "fcmTokenHere", "ios_device_2": "tokenHere" }
    fcm_tokens: {
      type: Map,
      of: String,
      default: {}
    },

    // 0 or 1
    premium: {
      type: Number,
      enum: [0, 1],
      default: 0
    },

    restaurant_address: {
      type: String,
      default: "",
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
