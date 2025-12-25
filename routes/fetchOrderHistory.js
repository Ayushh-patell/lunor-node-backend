// routes/fetchOrderHistory.js
const express = require("express");
const router = express.Router();
const { Agent } = require("undici");

router.post("/fetchOrderHistory", async (req, res) => {
  try {
    const { userName, range } = req.body;

    if (!userName || !range) {
      return res.status(400).json({
        message: "Required data not found",
        data: { userName, range }
      });
    }

    const backend = process.env.BACKEND;
    if (!backend) return res.status(500).json({ message: "BACKEND env is missing" });

    const apiKey = process.env.REMOTE_API_KEY;
    if (!apiKey) return res.status(500).json({ message: "REMOTE_API_KEY env is missing" });

    // ✅ set the alternate domain (no trailing slash needed)
    const babachickenBackend = "https://babachicken.ca" ;
    if (!babachickenBackend) {
      return res.status(500).json({ message: "BABACHICKEN_BACKEND env is missing" });
    }

    const agent = new Agent({ connect: { timeout: 300000 } });

    // ✅ switch domain only for "babachicken"
    const base =
      String(userName).toLowerCase() === "babachicken"
        ? babachickenBackend
        : backend;

    const proxyUrl = `${base.replace(/\/$/, "")}/db_proxy.php`;

    console.log("[fetchOrderHistory] calling:", proxyUrl, { userName, range });

    const r = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      },
      body: JSON.stringify({ userName, range }),
      dispatcher: agent
    });

    console.log("[fetchOrderHistory] final url:", r.url);

    const rawText = await r.text();
    console.log("[fetchOrderHistory] backend status:", r.status, rawText);

    let responseData;
    try {
      responseData = JSON.parse(rawText);
    } catch (e) {
      return res.status(502).json({
        message: "Backend did not return valid JSON",
        status: r.status,
        raw: rawText
      });
    }

    const formattedData = {
      data: (responseData?.data || []).map((order) => {
        order.products = (order.products || []).map((item) => {
          const qty = Number(item.product_qty) || 0;
          const gross = Number(item.product_gross_revenue) || 0;

          // avoid division by zero
          item.product_gross_revenue = qty ? gross / qty : 0;
          return item;
        });
        return order;
      })
    };

    return res.status(r.status).json(formattedData);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message
    });
  }
});

module.exports = router;
