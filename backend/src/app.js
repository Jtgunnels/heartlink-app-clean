// ---------------------------------------------------------------------------
// HeartLink Provider Platform — Express App Configuration
// ---------------------------------------------------------------------------

import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

// ✅ Routes are one level up from /src
import authRoutes from "../routes/authRoutes.js";
import patientRoutes from "../routes/patientRoutes.js";
import checkinRoutes from "../routes/checkinRoutes.js";
import providerRoutes from "../routes/providerRoutes.js";
import providerSummaryRoutes from "../routes/providerSummary.js";
//import summaryRoutes from "../routes/summaryRoutes.js";

// ✅ Firebase client config is one level up (if used here)
import { db } from "../config/firebaseConfig.js";

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));

// ---------- Root test route ----------
app.get("/", (req, res) => res.send("HeartLink Provider API active ✅"));

// ---------- Route groups ----------
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/providers", providerSummaryRoutes);
//app.use("/api/summary", summaryRoutes);

export default app;
