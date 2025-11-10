// src/pages/PatientsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PatientsPage.css";
import "./DashboardPage.css";
import { getPatientSnapshotData } from "../utils/fetchReportData";

const ASE_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Stable", value: "Stable" },
  { label: "Minor Change", value: "Minor Change" },
  { label: "Review Recommended", value: "Review Recommended" },
  { label: "Needs Immediate Review", value: "Needs Immediate Review" },
];

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [aseFilter, setAseFilter] = useState("ALL");

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // 🔹 Fetch snapshots and normalize for table use
  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshotData = await getPatientSnapshotData();
      if (!Array.isArray(snapshotData) || snapshotData.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const normalized = snapshotData.map((s, idx) => ({
        id: s.patientId || `patient-${idx}`,
        patientCode: s.patientId || s.patientCode || `PAT-${idx}`,
        name: s.name || `Patient ${idx + 1}`,
        aseCategory:
          s.aseCategory ||
          s.category ||
          s.aseStatus ||
          "Unknown",
        avgEngagement:
          typeof s.adherence === "number"
            ? Math.round(s.adherence)
            : s.avgEngagement ?? null,
        timestamp:
          s.timestamp || s.lastCheckIn || null,
      }));

      console.table(normalized);
      setPatients(normalized);
    } catch (err) {
      console.error("PatientsPage fetch error:", err);
      setError("Unable to load patients.");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesFilter =
        aseFilter === "ALL" ? true : p.aseCategory === aseFilter;
      const matchesSearch = searchQuery
        ? [p.name, p.patientCode]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(searchQuery))
        : true;
      return matchesFilter && matchesSearch;
    });
  }, [patients, aseFilter, searchQuery]);

  const handleSelectPatient = useCallback(
    (patient) => {
      if (!patient?.id) return;
      navigate(`/patients/${patient.id}`);
    },
    [navigate]
  );

  return (
    <div className="patients-page">
      <div className="patients-inner">
        <header className="patients-header">
          <div>
            <h1>Active Patient Directory</h1>
            <p>
              Comprehensive list of all active patients in your program,
              displaying their current ASE stability category and engagement
              levels.
            </p>
          </div>
          <span className="patients-badge">
            Active Patients &middot; {patients.length}
          </span>
        </header>

        <section className="patients-controls">
          <div className="search-field">
            <input
              type="search"
              placeholder="Search by name or ID"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="filter-group">
            {ASE_FILTERS.map((f) => (
              <button
                key={f.value}
                className={`filter-pill ${aseFilter === f.value ? "active" : ""}`}
                onClick={() => setAseFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            className="hl-btn ghost small"
            onClick={() => {
              setAseFilter("ALL");
              setSearchInput("");
            }}
          >
            Clear Filters
          </button>
        </section>

        <section className="patients-directory">
          {loading ? (
            <div className="patients-state">Loading patients…</div>
          ) : error ? (
            <div className="patients-error">{error}</div>
          ) : filteredPatients.length === 0 ? (
            <div className="patients-state">No active patients found.</div>
          ) : (
            <div className="attention-table-wrapper">
              <table className="attention-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>ASE Category</th>
                    <th>Avg Engagement (30 d)</th>
                    <th>Last Check-In</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr
                      key={p.id}
                      className="attention-row expandable"
                      onClick={() => handleSelectPatient(p)}
                    >
                      <td>{p.patientCode}</td>
                      <td>{p.name}</td>
                      <td>
                        <span
                          className={`ase-chip ${String(p.aseCategory || "")
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {p.aseCategory}
                        </span>
                      </td>
                      <td>
                        {p.avgEngagement != null
                          ? `${p.avgEngagement}%`
                          : "—"}
                      </td>
                      <td>
                        {p.timestamp
                          ? new Date(p.timestamp).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="patients-footer">
          HeartLink is a general wellness tool designed to support awareness of
          well-being and engagement. It does not diagnose, monitor, or treat any
          medical condition.
        </footer>
      </div>
    </div>
  );
}
