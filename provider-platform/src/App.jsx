// src/App.jsx
// HeartLink Provider Platform – Secure Routing Logic (final refinement)

import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import NavBar from "./components/NavBar.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PatientsPage from "./pages/PatientsPage.jsx";
import PatientDetailPage from "./pages/PatientDetailPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import ClinicalReviewHub from "./pages/ClinicalReviewHub.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CreateAgency from "./pages/Admin/CreateAgency.jsx";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  const hideNav = location.pathname === "/login" || location.pathname === "/create-agency";

  useEffect(() => {
    const auth = getAuth();

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // refresh token to load provider claims
        const token = await user.getIdTokenResult(true);
        const providerId = token.claims.provider_id;
        if (providerId) {
          localStorage.setItem("providerId", providerId);
        }
        setUser(user);
      } else {
        // clear on logout
        localStorage.removeItem("providerId");
        setUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsub();
  }, []);

  // Show nothing until auth state resolves
  if (!authChecked) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <span>Loading HeartLink Provider Platform…</span>
      </div>
    );
  }

  // If user is not logged in and not on /login or /create-agency → redirect
  if (!user && !["/login", "/create-agency"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  // If user is logged in and still on /login → redirect to dashboard
  if (user && location.pathname === "/login") {
    return <Navigate to="/dashboard" replace />;
  }

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
          <Route path="/create-agency" element={<CreateAgency />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
