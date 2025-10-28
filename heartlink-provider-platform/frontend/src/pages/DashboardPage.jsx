// ---------------------------------------------------------------------------
// HeartLink Provider Platform — DashboardPage (Firebase Auth Integration)
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  auth,
} from "../utils/firebaseAuth";
import { fetchPatients } from "../api/apiService";
import PatientCard from "../components/PatientCard";

export default function DashboardPage() {
  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [providerID, setProviderID] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------------------------------------
  // Monitor Auth State
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      setUser(userCredential.user);
    } catch (err) {
      setError("Invalid email or password.");
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPatients([]);
      setProviderID("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleLoadPatients = async () => {
    if (!providerID) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPatients(providerID);
      setPatients(data || []);
    } catch (err) {
      console.error(err);
      setError("Could not load patients. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // If not logged in → show login screen
  // -------------------------------------------------------------------------
  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#f9fbfc",
        }}
      >
        <h1 style={{ color: "#19588F", marginBottom: "1rem" }}>
          HeartLink • Provider Login
        </h1>

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "#fff",
            padding: "2rem 3rem",
            borderRadius: 12,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            width: 320,
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
            required
          />
          <button
            type="submit"
            style={{
              backgroundColor: "#45B8A1",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Log In
          </button>
          {error && (
            <p style={{ color: "#F26868", fontSize: 13, textAlign: "center" }}>
              {error}
            </p>
          )}
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Logged-in view
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FFFBF7",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 2rem",
          background: "linear-gradient(to right, #19588F, #45B8A1)",
          color: "white",
        }}
      >
        <h2 style={{ margin: 0, fontWeight: 600 }}>HeartLink • Provider Portal</h2>
        <button
          onClick={handleLogout}
          style={{
            background: "#F26868",
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Log Out
        </button>
      </div>

      {/* Dashboard */}
      <div style={{ padding: "2rem" }}>
        <h3 style={{ color: "#19588F", marginBottom: "0.5rem" }}>Dashboard</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="text"
            placeholder="Enter provider ID (e.g., HOMECARE123)"
            value={providerID}
            onChange={(e) => setProviderID(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
          />
          <button
            onClick={handleLoadPatients}
            style={{
              background: "#45B8A1",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            Load
          </button>
        </div>

        {error && (
          <p style={{ color: "#F26868", marginTop: 10, fontWeight: 500 }}>
            {error}
          </p>
        )}

        {loading && <p style={{ marginTop: 10 }}>Loading patients...</p>}

        {/* Patients */}
        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {patients.length === 0 && !loading ? (
            <p
              style={{
                color: "#444",
                background: "#fff",
                borderRadius: 8,
                padding: "1rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              No patients to show yet. Enter a provider ID and click <b>Load</b>.
            </p>
          ) : (
            patients.map((p, i) => (
              <PatientCard
                key={i}
                code={p.patientCode}
                category={p.category}
                normalized={p.normalized}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
