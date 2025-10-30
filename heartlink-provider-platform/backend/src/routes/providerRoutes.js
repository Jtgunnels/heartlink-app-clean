import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

// router.use(verifyToken); //

// Health check for frontend
router.get("/test", (req, res) => {
  res.json({ ok: true, message: "Provider API online" });
});

export default router;
