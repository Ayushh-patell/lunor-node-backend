const mongoose = require("mongoose");

async function connectDB(mongoUri) {
  if (!mongoUri) throw new Error("MONGO_URI is missing");

  mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
  mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err));
  mongoose.connection.on("disconnected", () => console.log("⚠️ MongoDB disconnected"));

  await mongoose.connect(mongoUri, {
    autoIndex: true
  });
}

module.exports = { connectDB };
