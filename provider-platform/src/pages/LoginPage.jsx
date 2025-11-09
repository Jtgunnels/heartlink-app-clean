// src/pages/LoginPage.jsx  (surgical update)
import React, { useState } from "react";
import HeroHeader from "../components/HeroHeader";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../utils/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import axios from "axios";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // ✅ sign in using the same initialized auth
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ try custom claim first
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      let providerId = tokenResult.claims?.provider_id;

      // ✅ fallback 1: storage (in case it was previously set)
      if (!providerId) {
        providerId =
          localStorage.getItem("providerId") ||
          sessionStorage.getItem("providerId") ||
          null;
      }

      // ✅ fallback 2: find provider by UID or contactEmail
      if (!providerId) {
        const uid = auth.currentUser.uid;
        // try by createdBy (uid)
        let snap = await getDocs(
          query(collection(db, "providers"), where("createdBy", "==", uid))
        );
        if (snap.empty) {
          // try by contactEmail
          snap = await getDocs(
            query(collection(db, "providers"), where("contactEmail", "==", email))
          );
        }
        if (!snap.empty) {
          providerId = snap.docs[0].id; // use doc id as providerId
        }
      }

      if (!providerId) {
        alert("No provider ID found on this account. Please contact your administrator.");
        return;
      }

      // ✅ persist and notify
      localStorage.setItem("providerId", providerId);
      sessionStorage.setItem("providerId", providerId);
      onLogin?.(providerId);               // ← make optional (prevents TypeError)

      // (optional) your backend session token, ignore if you don’t need it
      try {
        const res = await axios.post("/api/auth/login", { email, password });
        if (res?.data?.token) localStorage.setItem("token", res.data.token);
      } catch {
        /* no-op: frontend can run without server token */
      }

      window.location.href = "/dashboard";
    } catch (err) {
      // Provide more actionable error output for debugging deployments.
      console.error("Login error:", err);

      // Firebase client SDK errors usually include `code` and `message`.
      const firebaseCode = err?.code;
      const firebaseMessage = err?.message;

      // Network/axios errors from backend POST may surface as `err.response.data`.
      const backendMessage = err?.response?.data?.error || err?.response?.data?.message;

      const userMessage =
        backendMessage || firebaseMessage || "Invalid credentials or authentication error";

      // Show a slightly richer alert so the underlying issue is visible to the developer.
      alert(userMessage + (firebaseCode ? ` (code: ${firebaseCode})` : ""));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: "2rem" }}>
      <HeroHeader title="Provider Login" subtitle="Access your HeartLink patient dashboard" />
      <form onSubmit={handleLogin}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
