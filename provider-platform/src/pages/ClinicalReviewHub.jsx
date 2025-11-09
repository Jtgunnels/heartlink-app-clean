import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ClinicalReviewHub.css";
import { getPatientsList, getPatientSnapshotData } from "../utils/fetchReportData";
import { exportAsCSV } from "../utils/reportExports";
import PatientSnapshotCard from "../components/patients/PatientSnapshotCard.jsx";

const FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Needs Immediate Review", value: "Needs Immediate Review" },
  { label: "Review Recommended", value: "Review Recommended" },
];

const severityRank = (category = "") => {
  if (category === "Needs Immediate Review") return 0;
  if (category === "Review Recommended") return 1;
  if (category === "Minor Change") return 2;
  return 3;
};

export default function ClinicalReviewHub({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const navigate = useNavigate();

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getPatientsList();
      const reviewIds = (list || [])
        .filter(
          (patient) =>
            String(patient?.status || "").toLowerCase() === "active" &&
            ["Review Recommended", "Needs Immediate Review"].includes(patient?.aseCategory)
        )
        .map((patient) => patient?.id)
        .filter(Boolean);

      if (!reviewIds.length) {
        setPatients([]);
        return;
      }

      const snapshots = await getPatientSnapshotData(reviewIds, 14);
      const reviewSnapshots = (snapshots || [])
        .filter((snapshot) =>
          ["Review Recommended", "Needs Immediate Review"].includes(snapshot?.aseCategory)
        )
        .sort(
          (a, b) =>
            severityRank(a?.aseCategory) - severityRank(b?.aseCategory)
        );

      setPatients(reviewSnapshots);
    } catch (err) {
      console.error("ClinicalReviewHub load error", err);
      setError(err?.message || "Unable to load review patients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    const scoped =
      filter === "ALL"
        ? patients
        : patients.filter((patient) => patient.aseCategory === filter);
    return [...scoped].sort(
      (a, b) =>
        severityRank(a?.aseCategory) - severityRank(b?.aseCategory)
    );
  }, [patients, filter]);

  const summary = useMemo(() => {
    const counts = patients.reduce(
      (acc, patient) => {
        if (patient.aseCategory === "Needs Immediate Review") acc.red += 1;
        if (patient.aseCategory === "Review Recommended") acc.orange += 1;
        return acc;
      },
      { red: 0, orange: 0 }
    );
    counts.total = counts.red + counts.orange;
    return counts;
  }, [patients]);

  const handleExport = () => {
    const exportRows = filteredPatients.map((p) => ({
      Name: p.name,
      "ASE Category": p.aseCategory,
      "Last Check-In": p.lastCheckIn || "—",
      "Adherence %":
        typeof p.adherenceRate === "number"
          ? `${Number(p.adherenceRate).toFixed(1)}%`
          : "—",
      "Wellness Index":
        typeof p.wellnessIndex === "number"
          ? Number(p.wellnessIndex).toFixed(2)
          : "—",
      Summary: p.reasonSummary || "No supporting notes.",
    }));
    exportAsCSV(exportRows, "ClinicalReviewHub.csv");
  };

  const renderFilterButtons = () => (
    <div className="cr-filter-group" role="tablist" aria-label="Filter patients by ASE category">
      {FILTERS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          role="tab"
          className={`cr-filter-btn ${filter === value ? "active" : ""}`}
          aria-selected={filter === value}
          onClick={() => setFilter(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const wrapperClass = embedded
    ? "clinical-review-page clinical-review-embedded"
    : "clinical-review-page";
  const TitleTag = embedded ? "h2" : "h1";

  return (
    <div className={wrapperClass}>
      <header className="cr-header">
        <div>
          <TitleTag className="cr-title">Clinical Review Hub</TitleTag>
          <p className="cr-subtitle">Monitor and manage patients requiring review or follow-up.</p>
        </div>
        <div className="cr-header-actions">
          <button className="hl-btn ghost" onClick={loadPatients} disabled={loading}>
            Refresh
          </button>
          <button className="hl-btn export" onClick={handleExport} disabled={!filteredPatients.length}>
            Export CSV
          </button>
        </div>
      </header>

      <section className="cr-summary" aria-label="Review summary">
        <div className="cr-summary-card cr-orange">
          <p className="summary-label">Review Recommended</p>
          <p className="summary-value">{summary.orange}</p>
        </div>
        <div className="cr-summary-card cr-red">
          <p className="summary-label">Needs Immediate Review</p>
          <p className="summary-value">{summary.red}</p>
        </div>
        <div className="cr-summary-card cr-total">
          <p className="summary-label">Total Patients Requiring Review</p>
          <p className="summary-value">{summary.total}</p>
        </div>
      </section>

      <div className="cr-controls">
        {renderFilterButtons()}
        <span className="cr-count">Showing {filteredPatients.length} patient(s)</span>
      </div>

      <section className="cr-patient-grid-wrapper" aria-label="Patients requiring clinical review">
        {loading ? (
          <div className="cr-state">Loading patients…</div>
        ) : error ? (
          <div role="alert" className="error-box">
            <p>{error}</p>
            <button className="hl-btn" onClick={loadPatients}>Retry</button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <p className="muted-text">No patients currently require review.</p>
        ) : (
          <div className="cr-patient-grid">
            {filteredPatients.map((patient) => (
              <PatientSnapshotCard
                key={patient.id}
                patient={patient}
                context="dashboard"
                showTrend={false}
                showReason
                onSelect={() => navigate(`/patients/${patient.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="cr-footer">
        <p>
          HeartLink is a general wellness tool designed to support awareness of well-being and engagement. It does not
          diagnose, monitor, or treat any medical condition.
        </p>
      </footer>
    </div>
  );
}
