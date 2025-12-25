// routes/login.js
// URL: BACKEND/login
// Keeps the same response shape + logic as your Next.js route (invalid creds msg, temp password flow, plaintext fallback).

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();

const User = require("../models/User"); // adjust path if needed

const INVALID_MSG = "Invalid credentials";

router.post("/login", async (req, res) => {
  console.log('called')
  try {
    // Config sanity check (fail fast)
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set");
      return res.status(500).json({ error: "Server misconfiguration" });
    }

    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const { username, password } = body || {};

    // Basic validation (strict; no trim/lowercasing)
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length === 0 ||
      password.length === 0
    ) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Case-sensitive lookup (Mongo is case-sensitive by default)
    // Select only what we need (matching SQL query intent)
    const user = await User.findOne({ username })
      .select("_id username password premium temp_password")
      .lean();

    if (!user) {
      // Avoid user enumeration
      return res.status(401).json({ error: INVALID_MSG });
    }

    let ok = false;
    let isTempFlow = false;

    if (user.password === null || typeof user.password === "undefined") {
      // Permanent password not set: only check temp_password (exact match)
      if (typeof user.temp_password === "string" && user.temp_password.length > 0) {
        ok = password === user.temp_password;
      } else {
        ok = false;
      }
      isTempFlow = ok;
    } else {
      // Permanent password exists: ONLY check main password (not temp_password)
      try {
        ok = await bcrypt.compare(password, user.password);
      } catch {
        ok = false;
      }

      // Legacy plaintext fallback (if some rows still store plaintext)
      if (!ok && typeof user.password === "string") {
        ok = password === user.password;

        // Optional: migrate plaintext to bcrypt on-the-fly (same behavior as your code)
        if (ok) {
          try {
            const newHash = await bcrypt.hash(password, 10);
            await User.updateOne({ _id: user._id }, { $set: { password: newHash } });
          } catch (e) {
            console.error(
              "Password migration failed for user id",
              String(user._id),
              e?.message || e
            );
          }
        }
      }

      isTempFlow = false;
    }

    if (!ok) {
      return res.status(401).json({ error: INVALID_MSG });
    }

    // Build JWT (same payload fields)
    const jwtPayload = {
      sub: String(user._id),
      userId: String(user._id),
      username: user.username,
      premium: user.premium
    };

    const jwtOptions = {
      algorithm: "HS256",
      expiresIn: "30d",
      issuer: "blue-boxx"
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, jwtOptions);

    return res.status(200).json({
      message: "Login successful",
      token,
      premium: user.premium,
      tempPassword: isTempFlow
    });
  } catch (error) {
    console.error("login error:", error?.message || error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;
