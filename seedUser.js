// seedUsers.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");



// ✅ Put your seed data right here in this file
// password should already be hashed if you're using auth in production
const data = [
  {
    username: "Ayush",
    password: "asdf1234",
    fcm_tokens: {"0": null},
    premium: 1,
    restaurant_address: "4406 49 Ave, Lloydminster, SK S9V 0S8, Canada"
  },
  {
    username: "babachicken",
    password: "babaChickenLunor@6246",
    fcm_tokens: {"0": "fQTS43ZxTo6xQS2TOPcbPw:APA91bHLxI-8Fc3iIyRAmeH2Q4cDOlnJR_Z2G6xwTMEbhE78tm1wcnc7MHoMXvtoLAzbsanGFeSEceNlK-u3VdVc1ehnfMiZq7Z4Z3Cve_zzeOZ3i7T-nxk"},
    premium: 0,
    restaurant_address: ""
  },
  {
    username: "chatkharaCurryHouse",
    password: "$2b$10$REPKHtTrii9FT7S7T2MbXe7N9MSMpC3GWPGsWITFRmJ7V.kdO72Qm",
    fcm_tokens: {"0": "dEeSJwP7RQaENvpl_PY7jl:APA91bEWJ4QSjZ-OUugMmrYj8HKedzfx3BUO8xW1JmGOztBAAAg47jTgEmA-GNYeXUq9Tm5MNj08BXg12Mh7VORYxz_zdo_glSU9D5BbhDT_wmilLJly6dU", "1": "ce8OPE8rSyi47bVJAeoa0L:APA91bGNxC9wlO7wfmjCwOhBcfh_L9-lG9OyNNNovvF4hhYsMAj5GouY4sCeULH69iQtie9CUr0jtg7OKnPoHZta-99aKbOsCR_7dDQaBl4q7MB-aWYoKzE", "2": "dsPhLBIqSWqyZD2UERzikM:APA91bFhkA02Q7cAsc-h6r8SRwQXRBj83Fi-lZ096c8XjSjQWiDW2MAJpKTg-ZOovBfOHg-oDIQkJrB6_71pVzwKy7imVMCTjlqkWR9_lQ44Q12i-kKyL7U", "3": null},
    premium: 0,
    restaurant_address: ""
  },
  {
    username: "chatkharaKrishna",
    password: "ChatkharaKrishnaLunor@8525",
    fcm_tokens: {"0": null},
    premium: 0,
    restaurant_address: ""
  },
  {
    username: "baba_chicken",
    password: "babaLunorChicken@8173",
    fcm_tokens: {"0": "dxN7bO6DSOqNsjqfW4ljY2:APA91bFeL03Cvb2AkLQlPIkP133oKjElM8hxnhEhLS1nhrJEeZDKAWzLFz-fLYtd5lhqBRalY3Z9gwdlUm2oxL3HWRivYVVwAmIye0oM6zCSmB6q4CwTj40", "1": "cAQTivXPTeePYw3ZEOEneN:APA91bFRRLCuyXv2QqbrkCE7XBXRxHFVVGEI66CDsKkDC609XQSazUwW-mRdnp2H__mvxsq4jBqy-8Af7gacB0ir0cjWiEARHRbpvAYSJyK9WwSNDEH_DJE", "2": "d8ukdxfxS9SZUiTVIDC8JE:APA91bH0c7iwz-jKI0bpeBSpngcrjP4UwipW-_81DY8XFVv70QYPiDXOQb-LyzUA2Yw-enth_Mlp3OQOUwmk9zLzCzVwIzuAzl5uLufpJjL4NTUe2bD3t-c"},
    premium: 0,
    restaurant_address: ""
  },
];

/**
 * Call this to populate users.
 * - upserts by username (insert if missing, update if exists)
 * - returns summary
 */
async function populateUsers(seedArray = data) {
  if (!Array.isArray(seedArray)) {
    throw new Error("populateUsers expects an array");
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is missing in .env");

  await mongoose.connect(mongoUri);

  try {
    const ops = seedArray.map((u) => ({
      updateOne: {
        filter: { username: u.username },
        update: {
          $set: {
            username: u.username,
            password: u.password,
            premium: u.premium ?? 0,
            restaurant_address: u.restaurant_address ?? ""
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await User.bulkWrite(ops, { ordered: false });

    // fcm_tokens is a Map in the schema, so set it separately per doc (clean + predictable)
    for (const u of seedArray) {
      if (u.fcm_tokens && typeof u.fcm_tokens === "object") {
        await User.updateOne(
          { username: u.username },
          { $set: { fcm_tokens: u.fcm_tokens } }
        );
      }
    }

    return {
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
      upserted: result.upsertedCount ?? 0
    };
  } finally {
    await mongoose.disconnect();
  }
}

// ✅ Option A: export it to call from elsewhere
module.exports = { populateUsers };

// ✅ Option B: run directly with `node seedUsers.js`
if (require.main === module) {
  populateUsers()
    .then((summary) => {
      console.log("✅ Seed done:", summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed:", err);
      process.exit(1);
    });
}
