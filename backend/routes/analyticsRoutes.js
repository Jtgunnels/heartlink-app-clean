import express from "express";
import { getAnalyticsSummary } from "../src/controllers/analyticsController.js";

const router = express.Router();
router.get("/summary", getAnalyticsSummary);

export default router;
