import React from "react";
import { useDashboardData } from "../hooks/useDashboardData";
import { db } from "../utils/firebaseConfig.js";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

// Tiny presentational helpers (replace with your design system)
const Card = ({ title, value, tone = "default" }) => (
  <div style={{
    borderRadius: 16,
    padding: 16,
    background: "#FFFFFF",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    border: "1px solid #E0E6EA",
    minWidth: 200
  }}>
    <div style={{ fontSize: 14, color: "#4B5563", marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color: tone === "danger" ? "#F26868" : tone === "warn" ? "#F6B78B" : "#2AA783" }}>
      {value}
    </div>
  </div>
);

export default function DashboardOverview() {
  const { loading, errors, metrics, alerts, grouped } = useDashboardData();

  const [firestoreMetrics, setFirestoreMetrics] = useState({ total: 0, critical: 0, stable: 0 });

useEffect(() => {
  (async () => {
    const providerId =
       localStorage.getItem("providerId") || sessionStorage.getItem("providerId");
     if (!providerId) return; // not logged in yet / token not ready
     const snap = await getDocs(collection(db, `providers/${providerId}/checkins`));
    const docs = snap.docs.map(d => d.data());

    const total = docs.length;
    const critical = docs.filter(c => (c.category ?? c.aseCategory ?? "").toLowerCase().includes("red")).length;
    const stable = docs.filter(c => (c.category ?? c.aseCategory ?? "").toLowerCase().includes("green")).length;

    setFirestoreMetrics({ total, critical, stable });
  })();
}, []);

  return (
    <div style={{ padding: 24 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, color: "#0E2E4F", fontWeight: 800 }}>HeartLink Clinical Summary</h1>
        <div style={{ color: "#4B5563" }}>Live population snapshot</div>
      </header>

      {/* KPI Row */}
      {/* KPI Row */}
<div
  style={{
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    marginBottom: 20,
  }}
>
  <Card
    title="Active Patients"
    value={metrics.totalActive ?? firestoreMetrics.total}
  />
  <Card
    title="Stable"
    value={metrics.stableCount ?? firestoreMetrics.stable}
  />
  <Card
    title="At-Risk"
    value={metrics.atRiskCount ?? firestoreMetrics.atRisk}
    tone="warn"
  />
  <Card
    title="Critical"
    value={metrics.criticalCount ?? firestoreMetrics.critical}
    tone="danger"
  />
  <Card
    title="Wellness Index (Avg SSI)"
    value={metrics.wellnessIndex ?? firestoreMetrics.avgSSI}
  />
</div>


      {loading && <div style={{ color: "#4B5563" }}>Loading live data…</div>}
      {errors?.length > 0 && (
        <div style={{ color: "#F26868", marginBottom: 12 }}>
          {errors.map((e, i) => <div key={i}>Error: {e}</div>)}
        </div>
      )}

      {/* Quick lists — swap with your table/cards */}
      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ background: "#FFF", border: "1px solid #E0E6EA", borderRadius: 16, padding: 16 }}>
          <h3 style={{ marginTop: 0, color: "#0E2E4F" }}>Recent Alerts</h3>
          {alerts.length === 0 ? (
            <div style={{ color: "#4B5563" }}>No alerts yet.</div>
          ) : alerts.map(a => (
            <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid #F0F2F5" }}>
              <div><strong>{a.category}</strong> • SSI {a.ssi}</div>
              <div style={{ color: "#4B5563", fontSize: 13 }}>{a.patientId} — {a.createdAt?.toDate?.().toLocaleString?.() ?? ""}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#FFF", border: "1px solid #E0E6EA", borderRadius: 16, padding: 16 }}>
          <h3 style={{ marginTop: 0, color: "#0E2E4F" }}>Critical Patients</h3>
          {grouped.critical.length === 0 ? (
            <div style={{ color: "#4B5563" }}>None</div>
          ) : grouped.critical.map(p => (
            <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #F0F2F5" }}>
              <div><strong>{p.name ?? p.id}</strong> — SSI {p?.latestScore?.ssi ?? "—"}</div>
              <div style={{ color: "#4B5563", fontSize: 13 }}>{p?.latestScore?.category ?? ""}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
