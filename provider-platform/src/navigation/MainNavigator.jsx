import React from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import PatientsPage from "../pages/PatientsPage";
import ReportsPage from "../pages/ReportsPage";
import Settings from "../pages/Settings";
import Login from "../pages/Login";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { Colors } from "../theme/colors";

function Shell({ children, isAuthed }) {
  const nav = useNavigate();
  const logout = async () => {
    await signOut(auth);
    nav("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: Colors.bg }}>
      {/* Top Nav */}
      <div
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

        <div style={{ display: "flex", gap: 16 }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/patients">Patients</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/settings">Settings</Link>
          {!isAuthed ? (
            <Link to="/login">Login</Link>
          ) : (
            <button
              onClick={logout}
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
          )}
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

export default function MainNavigator({ isAuthed }) {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthed ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="/dashboard"
        element={
          isAuthed ? (
            <Shell isAuthed={isAuthed}>
              <Dashboard />
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
            <Shell isAuthed={isAuthed}>
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
            <Shell isAuthed={isAuthed}>
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
            <Shell isAuthed={isAuthed}>
              <Settings />
            </Shell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
