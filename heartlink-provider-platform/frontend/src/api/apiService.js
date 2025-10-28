// ---------------------------------------------------------------------------
// HeartLink Provider Platform — API Service (Production Ready)
// ---------------------------------------------------------------------------
// Centralized API handler for frontend to communicate with backend (Render).
// Reads base URL from Vite environment variable (VITE_API_BASE_URL).
// ---------------------------------------------------------------------------

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: 15000, // slightly extended for cloud requests
});

// Log the active backend URL for verification
console.log("🌐 Using Backend Base URL:", api.defaults.baseURL);

// ---------------------- API ROUTES ---------------------- //

// ✅ Fetch all patients for a provider
export const fetchPatients = async (providerID) => {
  try {
    const response = await api.get(`/api/patients/${encodeURIComponent(providerID)}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching patients:", error);
    throw new Error("Could not load patient data. Please try again.");
  }
};

// ✅ Add a new patient (optional future feature)
export const addPatient = async (patientData) => {
  try {
    const response = await api.post("/api/patients", patientData);
    return response.data;
  } catch (error) {
    console.error("❌ Error adding patient:", error);
    throw new Error("Failed to add new patient record.");
  }
};

// ✅ Test backend connectivity
export const testConnection = async () => {
  try {
    const response = await api.get("/api/providers/test");
    return response.data;
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
    throw new Error("Unable to reach backend service.");
  }
};

export default api;
