import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getPatients,
  getPatientByCode,
  createPatient,
} from "../controllers/patientController.js";

const router = express.Router();
// router.use(verifyToken); //

// list patients for a provider
router.get("/:providerID", getPatients);
// find patient by code
router.get("/code/:patientCode", getPatientByCode);
// create/register new patient
router.post("/", createPatient);

export default router;
