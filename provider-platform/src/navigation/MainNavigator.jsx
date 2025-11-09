// src/navigation/MainNavigator.jsx — Final (surgically corrected)
import React from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import PatientsPage from "../pages/PatientsPage";
import ReportsPage from "../pages/ReportsPage";
import LoginPage from "../pages/LoginPage";
import SettingsPage from "../pages/SettingsPage";
import { Colors } from "../theme/colors";
import { useAuth } from "../context/AuthProvider";

// -----------------------------------------------------------------------------
// Shell Layout — shared top navigation and logout handler
// -----------------------------------------------------------------------------
function Shell({ children }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ✅ Centralized logout handler (syncs with AuthProvider)
  const handleLogout = async () => {
    try {
      await logout(); // calls signOut(auth), clears providerId/token, redirects
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: Colors.bg }}>
      {/* 🔹 Top Navigation Bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: Colors.brandBlue,
            }}
            title="HeartLink"
          />
          <div style={{ color: Colors.brandBlue, fontWeight: 700 }}>
            HeartLink Provider Platform
          </div>
        </div>

        <nav style={{ display: "flex", gap: 16 }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/patients">Patients</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/settings">Settings</Link>
          <button
            onClick={handleLogout}
            style={{
              background: Colors.brandBlue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </nav>
      </header>

      {/* 🔹 Main Page Content */}
      <main style={{ padding: "20px 24px" }}>{children}</main>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Navigator — all routes + auth gating
// -----------------------------------------------------------------------------
export default function MainNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // Optional: show spinner while loading auth
  const isAuthed = !!user;

  return (
    <Routes>
      {/* 🔹 Root always redirects to /login to prevent auto-dashboard loop */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 🔸 Protected Routes */}
      <Route
        path="/dashboard"
        element={
          isAuthed ? (
            <Shell>
              <DashboardPage />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/patients"
        element={
          isAuthed ? (
            <Shell>
              <PatientsPage />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/reports"
        element={
          isAuthed ? (
            <Shell>
              <ReportsPage />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/settings"
        element={
          isAuthed ? (
            <Shell>
              <SettingsPage />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 🔸 Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* 🔹 Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
