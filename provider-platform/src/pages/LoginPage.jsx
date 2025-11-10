// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../utils/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";
import "./LoginPage.css";
import heartlinkLogo from "../../../assets/logos/heartlink_full_light.png"; // ✅ fixed import


export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      let providerId = tokenResult.claims?.provider_id;

      if (!providerId) {
        providerId =
          localStorage.getItem("providerId") ||
          sessionStorage.getItem("providerId") ||
          null;
      }

      if (!providerId) {
        const uid = auth.currentUser.uid;
        let snap = await getDocs(
          query(collection(db, "providers"), where("createdBy", "==", uid))
        );
        if (snap.empty) {
          snap = await getDocs(
            query(collection(db, "providers"), where("contactEmail", "==", email))
          );
        }
        if (!snap.empty) providerId = snap.docs[0].id;
      }

      if (!providerId) {
        alert("No provider ID found. Please contact your admin.");
        return;
      }

      localStorage.setItem("providerId", providerId);
      sessionStorage.setItem("providerId", providerId);
      onLogin?.(providerId);

      try {
        const res = await axios.post("/api/auth/login", { email, password });
        if (res?.data?.token) localStorage.setItem("token", res.data.token);
      } catch {
        /* optional backend */
      }

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      alert(err?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page fade-in">
      <div className="login-card">
        
          <img src={heartlinkLogo} alt="HeartLink Logo" className="login-logo"/>
        <h1 className="login-title">HeartLink • Provider Portal</h1>
        <p className="login-subtitle">
          <em>Confidence through awareness</em>
        </p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="login-footer">
          © {new Date().getFullYear()} HeartLink Health — All rights reserved.
        </p>
      </div>
    </div>
  );
}
