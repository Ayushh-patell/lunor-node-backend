// routes/MinOrder.js
// URL: BACKEND_URL/MinOrder
// Assumptions per request:
// - subscription is ALWAYS false (no subscription lookup, no premium_notification call)
// - settings not used; sound ALWAYS defaults to "order"

const express = require("express");
const router = express.Router();

const admin = require("../lib/firebase"); // adjust path
const LZString = require("lz-string");
const User = require("../models/User"); // adjust path

const validMetaKeys = [
  "Spicy Level",
  "Choice",
  "Choose",
  "spice-level",
  "choice-of-protein",
  "Select Size",
  "Select a option",
  "select-type",
  "Select Pizza",
  "select item",
  "select-item",
  "choose naan",
  "choose-naan",
  "Nhoose Naan",
  "Choose-Naan",
  "Dipping Sauce",
  "Select Pop",
  "Select First Pizza",
  "Select Second Pizza",
  "Select First Pop",
  "Select Second Pop",
  "First Dipping Sauce",
  "Second Dipping Sauce",
  "Select Spice Level",
  "select-spice-level",
  "select spice level",
  "Choose Spice Level",
  "Spicy Level",
  "Half & Half",
  "Select First Finisher",
  "Select Second Finisher",
  "Select Sauce",
  "Add Extra Meat Toppings",
  "Add Extra Veggie Toppings",
  "Select Item",
  "Select Spice Level",
  "Add-Ons",
  "Add-On",
  "Choose Flavour",
  "Choose Dip",
  "Choose Naan",
  "SP Starter Options",
  "Choose Meat",
  "Choose Ingredients",
  "Add-On",
  "Choose Size",
  "Choose Style",
  "Choose Pop",
  "Select Spicy Level",
  "Indo Chinese Options",
  "Choices",
  "Manchurian Add-on"
];

router.post("/MinOrder", async (req, res) => {
  try {
    // 1) Extract lunar_username
    const lunar_username = req.query.lunar_username;
    if (!lunar_username) {
      return res
        .status(400)
        .json({ error: "Lunar username is missing in the URL" });
    }

    // 2) Parse JSON body once (Express already parsed via express.json())
    const orderData = req.body;
    if (!orderData || typeof orderData !== "object") {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const payload = orderData.payload;
    if (!payload) {
      return res.status(400).json({ error: "No data" });
    }

    // 3) Skip unwanted statuses
    if (["checkout-draft", "failed", "wc-cancelled"].includes(payload.status)) {
      console.log("Skipping notification for status:", payload.status);
      return res.status(200).json({
        message: `Order status "${payload.status}" skipped.`
      });
    }

    // 4) No subscription logic (assumed always false)

    // 5) No settings lookup; always default sound
    const soundName = "order";

    // 6) Destructure order fields
    const {
      total,
      total_tax,
      discount_total,
      customer_note: customerNoteRaw,
      billing = {},
      line_items = []
    } = payload;

    const customerNote =
      customerNoteRaw && typeof customerNoteRaw === "string"
        ? customerNoteRaw.trim() || null
        : null;

    // 7) Fetch and parse FCM tokens safely
    const userDoc = await User.findOne({ username: lunar_username })
      .select("fcm_tokens")
      .lean();

    if (!userDoc) {
      return res.status(404).json({ error: "User not found" });
    }

    let rawTokens = userDoc.fcm_tokens;
    let tokensObj;

    if (rawTokens && typeof rawTokens === "object") {
      tokensObj = rawTokens;
    } else if (typeof rawTokens === "string") {
      try {
        tokensObj = JSON.parse(rawTokens);
      } catch (err) {
        console.error("❌ FCM token JSON parsing failed:", err);
        return res.status(400).json({ error: "Malformed FCM token data" });
      }
    } else {
      return res.status(400).json({ error: "Unexpected FCM token format" });
    }

    const fcm_tokensArr = Object.values(tokensObj).filter(
      (t) => typeof t === "string" && t.trim()
    );

    if (fcm_tokensArr.length === 0) {
      return res.status(404).json({ error: "No valid FCM tokens found" });
    }

    // 8) Build cleaned-up line-items array
    const order = line_items.map((item) => {
      const filteredMeta = (item.meta_data || [])
        .filter((m) => validMetaKeys.includes(m.display_key))
        .map((m) => ({
          display_key: m.display_key,
          display_value: m.display_value
        }));

      return {
        n: item.name,
        q: item.quantity,
        m: filteredMeta.length ? filteredMeta : null
      };
    });

    // 9) Format address & customer info
    const { first_name, last_name, email, phone } = billing;
    const { address_1, city, state, postal_code } = billing;

    const address = [address_1, city, [state, postal_code].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

    // 10) Build the compressed payload
    const orderPayload = {
      s: payload.status,
      t: total,
      tt: total_tax,
      d: discount_total,
      da: payload.date_created || payload.date_created_gmt,
      n: `${first_name} ${last_name}`,
      a: address,
      m: email,
      p: phone,
      o: order,
      cn: customerNote
    };

    const compressedPayload = LZString.compressToBase64(
      JSON.stringify(orderPayload)
    );
    const notificationBody = `Order total: $${total}.`;

    // 11) Construct FCM message
    const message = {
      tokens: fcm_tokensArr,
      data: {
        title: "🛒 New Order",
        body: notificationBody,
        compressedPayload,
        notification_id: `${payload.id}`,
        sound: soundName
      },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
      content_available: true,
      priority: "high"
    };

    // 12) Send the multicast and collect failures
    const response = await admin.messaging().sendEachForMulticast(message);

    const failedResponses = response.responses
      .map((r, i) =>
        !r.success ? { token: fcm_tokensArr[i], error: r.error.message } : null
      )
      .filter(Boolean);

    console.log(
      `✅ Order acknowledged. Notifications sent to ${response.successCount} devices.`,
      lunar_username,
      fcm_tokensArr
    );
    console.log(response);

    return res.status(200).json({
      message: `Notifications sent to ${response.successCount} devices.`,
      failedTokens: failedResponses,
      incoming: orderData,
      outgoing: orderPayload,
      outStr: compressedPayload
    });
  } catch (error) {
    console.error("❌ Error processing order:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
});

module.exports = router;
module.exports.validMetaKeys = validMetaKeys;
