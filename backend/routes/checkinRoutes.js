// backend/routes/checkinRoutes.js
import express from "express";
import { receiveCheckin } from "../src/controllers/checkinController.js";

const router = express.Router();

// POST /api/checkins
router.post("/", receiveCheckin);

export default router;
