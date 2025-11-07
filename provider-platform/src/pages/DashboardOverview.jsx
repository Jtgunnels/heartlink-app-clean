import React from "react";
import { useDashboardData } from "../hooks/useDashboardData";

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

  return (
    <div style={{ padding: 24 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, color: "#0E2E4F", fontWeight: 800 }}>HeartLink Clinical Summary</h1>
        <div style={{ color: "#4B5563" }}>Live population snapshot</div>
      </header>

      {/* KPI Row */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 20 }}>
        <Card title="Active Patients" value={metrics.totalActive} />
        <Card title="Stable" value={metrics.stableCount} />
        <Card title="At-Risk" value={metrics.atRiskCount} tone="warn" />
        <Card title="Critical" value={metrics.criticalCount} tone="danger" />
        <Card title="Wellness Index (Avg SSI)" value={metrics.wellnessIndex} />
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
