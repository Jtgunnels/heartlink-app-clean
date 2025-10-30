import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { receiveCheckin } from "../controllers/checkinController.js";

const router = express.Router();
router.use(verifyToken);

router.post("/", receiveCheckin);

export default router;
