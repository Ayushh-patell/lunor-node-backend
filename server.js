// server.js (mount the route) - only what you need to make it work
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { connectDB } = require("./db");
const addTokenRoute = require("./routes/addToken");
const checkPremiumMockRoute = require("./routes/checkPremiumMock");
const fetchOrderHistoryRoute = require("./routes/fetchOrderHistory");
const loginRoute = require("./routes/login");
const logoutRoute = require("./routes/logout");
const minOrderRoute = require("./routes/MinOrder");
const sendEmailRoute = require("./routes/sendEmail");





async function start() {
  const app = express();
  app.use(cors());
  app.use(express.json());
   // ✅ serve ./public as-is (e.g. GET /file.png -> ./public/file.png)
  app.use(express.static(path.join(__dirname, "public")));

  app.use("/", addTokenRoute); // POST /addToken
  app.use("/", checkPremiumMockRoute); // POST /check-premium
  app.use("/", fetchOrderHistoryRoute); // POST /fetchOrderHistory
  app.use("/", logoutRoute); // POST /logout
  app.use("/", minOrderRoute); // POST /MinOrder?lunar_username=...
  app.use("/", sendEmailRoute); // POST /sendEmail


  app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  next(err);
});

app.use("/", loginRoute); // POST /login



  await connectDB(process.env.MONGO_URI);

  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => console.log(`Server running on ${port}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
