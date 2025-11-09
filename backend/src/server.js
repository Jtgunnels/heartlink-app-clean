// ---------------------------------------------------------------------------
// HeartLink Provider Platform — Server Entry Point (Production Ready)
// ---------------------------------------------------------------------------
// Purpose: Initializes environment variables and starts the Express app.
// ---------------------------------------------------------------------------

import dotenv from "dotenv";
import app from "./app.js"; // app.js is in same folder

dotenv.config();

const MODE = process.env.FIREBASE_MODE || "production";
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("===============================================");
  console.log("✅ Firebase Admin initialized for provider platform");
  console.log(`🚀 HeartLink Provider API running on http://localhost:${PORT}`);
  console.log(`🌐 Mode: ${MODE}`);
  console.log("===============================================");
});
