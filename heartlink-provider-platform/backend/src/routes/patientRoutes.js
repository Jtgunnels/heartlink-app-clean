import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getPatients, getPatientByCode } from "../controllers/patientController.js";

const router = express.Router();
router.use(verifyToken);
router.get("/:providerID", getPatients);
router.get("/code/:patientCode", getPatientByCode);

export default router;
