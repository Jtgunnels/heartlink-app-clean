// ---------------------------------------------------------------------------
// HeartLink Provider Platform – Backend API Server  (v1.0)
// ---------------------------------------------------------------------------
// Purpose: Secure, de-identified API layer for provider dashboards.
// ---------------------------------------------------------------------------

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fetch from "node-fetch";
import providerRoutes from "./routes/providerRoutes.js";
import providerSummaryRoutes from "./routes/providerSummary.js";

// Load environment variables (.env)
dotenv.config();

// Initialize Firebase only once
if (!admin.apps.length) {
  const serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  if (!serviceAccount.project_id) {
    console.error("❌ Missing FIREBASE_PROJECT_ID — check your .env");
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
}

export const db = admin.firestore();

// Logflare Logging Helper
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
          metadata,
        }),
      }
    );

    if (!res.ok) {
      console.error("❌ Logflare error:", await res.text());
    } else {
      console.log("✅ Log sent to Logflare:", message);
    }
  } catch (error) {
    console.error("⚠️ Logflare network error:", error);
  }
};

// ---------- Create the Express app ----------
const app = express();

// ---------- Middleware ----------
app.use(cors()); // Allow cross-origin requests (frontend ↔ backend)
app.use(express.json()); // Parse JSON request bodies
app.use(morgan("dev")); // Log requests in dev mode
app.use("/api/patients", patientRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/providers", providerSummaryRoutes);

// ---------- Basic route ----------
app.get("/", (req, res) => {
  res.send("✅ HeartLink Provider API is running.");
});

// ---------- Test route for providers ----------
app.get("/api/providers/test", (req, res) => {
  res.json({ message: "Provider API online" });
});

// ---------- Patient routes (write/read Firebase data) ----------
import patientRoutes from "./routes/patientRoutes.js";
app.use("/api/patients", patientRoutes);

// ---------- Error handling ----------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---------- Start server ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
