// src/App.jsx
// ---------------------------------------------
// HeartLink Clinical Summary — Main Application Router
// Handles page-level routing for provider-facing components.
// ---------------------------------------------

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Pages
import DashboardPage from "./pages/DashboardPage.jsx";
// Future expansions can include:
// import PatientsPage from "./pages/PatientsPage.jsx";
// import ProgressPage from "./pages/ProgressPage.jsx";
// import SettingsPage from "./pages/SettingsPage.jsx";

function App() {
  return (
    <>
      {/* App Routes */}
      <Routes>
        {/* Default route → Dashboard */}
        <Route path="/" element={<DashboardPage />} />

        {/* Example of future expansion */}
        {/* <Route path="/patients" element={<PatientsPage />} /> */}
        {/* <Route path="/progress" element={<ProgressPage />} /> */}
        {/* <Route path="/settings" element={<SettingsPage />} /> */}

        {/* Catch-all → redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
