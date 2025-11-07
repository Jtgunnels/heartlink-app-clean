// src/App.jsx
// ---------------------------------------------
// HeartLink Clinical Summary — Main Application Router
// Handles page-level routing for provider-facing components.
// ---------------------------------------------

import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PatientsPage from "./pages/PatientsPage.jsx";
import PatientDetailPage from "./pages/PatientDetailPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import ClinicalReviewHub from "./pages/ClinicalReviewHub.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

function App() {
  const location = useLocation();
  const hideNav = location.pathname === "/login";

  return (
    <div className="app-shell">
      {!hideNav && <NavBar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/clinical-review" element={<ClinicalReviewHub embedded={false} />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
