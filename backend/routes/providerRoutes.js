import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Logflare helper
const sendLogToLogflare = async (message, metadata = {}) => {
  try {
    const res = await fetch(
      `https://api.logflare.app/api/logs?source=${process.env.LOGFLARE_SOURCE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.LOGFLARE_API_KEY,
        },
        body: JSON.stringify({
          message,
          metadata: { ...metadata, env: process.env.NODE_ENV || "production" },
        }),
      }
    );

    if (!res.ok) {
      console.error("❌ Logflare error:", await res.text());
    }
  } catch (error) {
    console.error("⚠️ Logflare network error:", error);
  }
};

// test endpoint
router.get("/test", async (req, res) => {
  res.json({ message: "Provider API online" });
  await sendLogToLogflare("✅ Provider API test route hit", {
    route: "/api/providers/test",
    method: "GET",
    status: 200,
  });
});

export default router;
