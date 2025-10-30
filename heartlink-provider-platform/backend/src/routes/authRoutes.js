import express from "express";
import { loginProvider } from "../controllers/authController.js";
const router = express.Router();
router.post("/login", loginProvider);
export default router;
