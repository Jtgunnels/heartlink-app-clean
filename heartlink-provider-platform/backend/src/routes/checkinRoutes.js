import express from "express";
import { receiveCheckin } from "../controllers/checkinController.js";
const router = express.Router();
router.post("/", receiveCheckin);
export default router;
