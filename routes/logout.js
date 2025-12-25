// routes/logout.js
// URL: BACKEND_URL/logout

const express = require("express");
const router = express.Router();
const User = require("../models/User"); // adjust path if needed

router.post("/logout", async (req, res) => {
  const { username, index } = req.body;
  console.log(username, index);

  try {
    // Fetch the user by username
    const user = await User.findOne({ username }).select("fcm_tokens");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Parse fcm_tokens as an object
    let fcm_tokens = user.fcm_tokens ? user.fcm_tokens : {};

    // If it's a Mongoose Map, convert to plain object
    if (fcm_tokens && typeof fcm_tokens === "object" && typeof fcm_tokens.get === "function") {
      fcm_tokens = Object.fromEntries(fcm_tokens.entries());
    }

    // Check if the index exists in the tokens and set it to null
    if (Object.prototype.hasOwnProperty.call(fcm_tokens, index)) {
      fcm_tokens[index] = null;
    } else {
      console.log("invalid index detected");

      return res.status(200).json({ message: "Invalid token index" });
    }

    // Update the database
    user.fcm_tokens = fcm_tokens;
    await user.save();

    return res.status(200).json({ message: "Logout Successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
