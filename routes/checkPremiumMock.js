// routes/checkPremiumMock.js
// URL: BACKEND_URL/check-premium
// Mock: always returns isPremium: false with fake data

const express = require("express");
const router = express.Router();

const planId = {
  monthly: {
    id: "price_1RasysE8oCbJZBwh3tD7owoD",
    label: "$5 / month",
    displayPrice: 5,
    desc: "Billed monthly. Cancel anytime."
  },
  annually: {
    id: "price_1RhQMpE8oCbJZBwhVrTCoo6l",
    label: "$48 / year",
    displayPrice: 48,
    desc: "Best value – save 20% compared to monthly billing."
  }
};

router.post("/check-premium", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Missing `username` in request body." });
    }

    // Always return non-premium mock response (false data)
    return res.json({
      isPremium: false,
      status: null,
      subscription: null,
      settingsData: null,
      plans: planId
    });
  } catch (err) {
    console.error("[/check-premium] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
