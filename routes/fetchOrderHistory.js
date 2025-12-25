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

    const agent = new Agent({ connect: { timeout: 30000 } });

    const proxyUrl = `${backend.replace(/\/$/, "")}/db_proxy.php`;

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

    // ✅ if there was a redirect, this will show the final URL
    console.log("[fetchOrderHistory] final url:", r.url);

    const rawText = await r.text();
    console.log("[fetchOrderHistory] backend status:", r.status);

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

    let formattedData = {};
    formattedData.data = (responseData?.data || []).map((order) => {
      order.products = (order.products || []).map((item) => {
        item.product_gross_revenue = parseFloat(
          item.product_gross_revenue / item.product_qty
        );
        return item;
      });
      return order;
    });

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
