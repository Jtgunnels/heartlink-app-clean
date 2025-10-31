// src/app.js
import providerRoutes from "./routes/providerRoutes.js";
import providerSummaryRoutes from "./routes/providerSummary.js";

app.use("/api/providers", providerRoutes);
app.use("/api/providers", providerSummaryRoutes);
