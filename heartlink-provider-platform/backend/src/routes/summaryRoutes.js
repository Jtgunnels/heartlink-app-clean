import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getSummary } from "../controllers/summaryController.js";

const router = express.Router();
// router.use(verifyToken); //

// GET /api/summary/:providerID
router.get("/:providerID", getSummary);

export default router;
