// routes/addToken.js
// URL: BACKEND_URL/addToken

const express = require("express");
const router = express.Router();
const User = require("../models/User"); // adjust path if needed

router.post("/addToken", async (req, res) => {
  const { token, username, index } = req.body;
  let keyIndex = index;

  if (!token || !username) {
    return res.status(400).json({ error: "Token and Username are required" });
  }

  try {
    // Check if the user exists
    const user = await User.findOne({ username }).select("fcm_tokens");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Parse fcm_tokens as an object (Map in schema, but can be treated like an object)
    let fcm_tokens = user.fcm_tokens ? user.fcm_tokens : {};

    // If it's a Mongoose Map, convert to plain object
    if (fcm_tokens && typeof fcm_tokens === "object" && typeof fcm_tokens.get === "function") {
      fcm_tokens = Object.fromEntries(fcm_tokens.entries());
    }

    // Keep same keyIndex resolution logic as your original code
    keyIndex =
      keyIndex ??
      Object.keys(fcm_tokens).find((key) => !fcm_tokens[key]) ??
      Object.keys(fcm_tokens).length;

    // If token already same
    if (fcm_tokens[keyIndex] === token) {
      return res.status(200).json({ message: "Token up-to-date" });
    }

    fcm_tokens[keyIndex] = token;

    // Update the database (store back into Map field)
    user.fcm_tokens = fcm_tokens;
    await user.save();

    return res.status(200).json({ message: "Token updated successfully", key: keyIndex });
  } catch (error) {
    console.error("Error updating FCM token:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
