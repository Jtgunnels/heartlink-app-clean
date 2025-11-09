// src/routes/authRoutes.js
// ---------------------------------------------------------------------------
// HeartLink Provider Platform — Authentication Routes
// ---------------------------------------------------------------------------

import express from "express";
import { loginProvider } from "../src/controllers/authController.js";

const router = express.Router();

// 🔹 POST /api/auth/login
router.post("/login", loginProvider);

export default router;
