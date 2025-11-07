import React, { useMemo } from "react";
import "./ReportsSummaryCards.css";

export default function ReportsSummaryCards({ data }) {
  const summary = useMemo(() => {
    const total = data.length;
    const improved = data.filter((p) => p.category?.toLowerCase() === "green").length;
    const stable = data.filter((p) => p.status?.toLowerCase() === "stable").length;
    const worsened = data.filter((p) => ["red", "orange", "yellow"].includes(p.category?.toLowerCase())).length;
    const avgSSI = (Math.random() * 1.0).toFixed(2); // placeholder until real SSI integrated
    return { total, improved, stable, worsened, avgSSI };
  }, [data]);

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <h3>{summary.total}</h3>
        <p>Total Patients</p>
      </div>
      <div className="summary-card">
        <h3>{summary.improved}</h3>
        <p>Improved</p>
      </div>
      <div className="summary-card">
        <h3>{summary.stable}</h3>
        <p>Stable</p>
      </div>
      <div className="summary-card">
        <h3>{summary.worsened}</h3>
        <p>Worsened</p>
      </div>
      <div className="summary-card">
        <h3>{summary.avgSSI}</h3>
        <p>Avg SSI (30 d)</p>
      </div>
    </div>
  );
}
