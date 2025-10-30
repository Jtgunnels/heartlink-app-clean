import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import providerSummaryRoutes from "./routes/providerSummary.js";
import helmet from "helmet";

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("HeartLink Provider API active ✅"));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/providers", providerSummaryRoutes);
app.use("/api/checkins", checkinRoutes);

export default app;
