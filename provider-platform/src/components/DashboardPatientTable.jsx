// ---------------------------------------------------------------------------
// HeartLink Provider Platform – DashboardPatientTable (Full Layout)
// Includes Category Summary Cards + Compact 5-column Table
// ---------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { fetchPatients } from "../api/apiService";
import generateReasonSummary_Provider from "../utils/generateReasonSummary_Provider";
import PatientDetailModal from "../components/PatientDetailModal";
import "./DashboardPatientTable.css";

/* ---------------- CATEGORY COLORS ---------------- */
const CATEGORY_STYLES = {
  Stable: { bg: "#E9F7F2", text: "#0E5A47", dot: "#45B8A1" },
  "Minor Change": { bg: "#FFF8E1", text: "#7C5A00", dot: "#F2C94C" },
  "Review Recommended": { bg: "#FBEDE6", text: "#7C330D", dot: "#F2994A" },
  "Needs Immediate Review": { bg: "#FDE7E7", text: "#8F1D1D", dot: "#F26868" },
};

const CATEGORY_MAP = {
  stable: "Stable",
  green: "Stable",
  "minor change": "Minor Change",
  yellow: "Minor Change",
  "review recommended": "Review Recommended",
  orange: "Review Recommended",
  "needs immediate review": "Needs Immediate Review",
  red: "Needs Immediate Review",
};

const toCardKey = (aseCategory = "") =>
  CATEGORY_MAP[aseCategory?.toLowerCase?.()] || "Stable";

const getRowId = (p) => p?.id ?? p?.patientCode ?? p?.code ?? null;

const formatDateTime = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

/* ---------------- SORTING ---------------- */
function sortPatients(patients, sortField = "default", sortDir = "desc") {
  const order = [
    "Needs Immediate Review",
    "Review Recommended",
    "Minor Change",
    "Stable",
  ];

  return [...patients].sort((a, b) => {
    // Default sorting (unreviewed first)
    if (sortField === "default") {
      const aUnrev = a.reviewed !== true;
      const bUnrev = b.reviewed !== true;
      if (aUnrev !== bUnrev) return aUnrev ? -1 : 1;

      const ca = order.indexOf(toCardKey(a.aseCategory));
      const cb = order.indexOf(toCardKey(b.aseCategory));
      if (ca !== cb) return ca - cb;

      const da = a.lastUpdated ? new Date(a.lastUpdated) : 0;
      const db = b.lastUpdated ? new Date(b.lastUpdated) : 0;
      return db - da;
    }

    // Sorting by category column
    if (sortField === "category") {
      const order = {
        red: 1,
        orange: 2,
        yellow: 3,
        green: 4,
      };
      const ca = order[a.color || colorFromCategory(a.aseCategory)] || 5;
      const cb = order[b.color || colorFromCategory(b.aseCategory)] || 5;
      return sortDir === "asc" ? ca - cb : cb - ca;
    }

    if (sortField === "lastUpdated") {
      const da = a.lastUpdated ? new Date(a.lastUpdated) : 0;
      const db = b.lastUpdated ? new Date(b.lastUpdated) : 0;
      return sortDir === "asc" ? da - db : db - da;
    }

    return 0;
  });
}

/* Helper: convert ASE category to basic color string */
function colorFromCategory(aseCategory = "") {
  const key = aseCategory.toLowerCase?.();
  if (key.includes("immediate") || key.includes("red")) return "red";
  if (key.includes("review") || key.includes("orange")) return "orange";
  if (key.includes("minor") || key.includes("yellow")) return "yellow";
  return "green";
}

/* ---------------- COMPONENT ---------------- */
export default function DashboardPatientTable({ onViewReviews }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sortField, setSortField] = useState("default");
  const [sortDir, setSortDir] = useState("desc");
  const [activeFilter, setActiveFilter] = useState(null);

  // Fetch + enrich data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPatients("demoProvider");
        if (!mounted) return;

        const enriched = (data || []).map((p) => {
          const entry = p.latestCheckin || {};
          const baseline = p.baseline || {};
          const prevWeights = Array.isArray(p.prevWeights) ? p.prevWeights : [];
          const color = colorFromCategory(p.aseCategory);

          return {
            ...p,
            color,
            reviewed: p.reviewed === true,
            reasonSummary: generateReasonSummary_Provider(
              entry,
              p.aseCategory,
              { baseline, prevWeights }
            ),
          };
        });

        setPatients(sortPatients(enriched));
      } catch (e) {
        console.error("Failed to load patients:", e);
        setPatients([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Card counts
  const counts = useMemo(() => {
    const c = {
      Stable: 0,
      "Minor Change": 0,
      "Review Recommended": 0,
      "Needs Immediate Review": 0,
    };
    for (const p of patients) c[toCardKey(p.aseCategory)]++;
    return c;
  }, [patients]);

  // Filter + sort rows
  const rows = useMemo(() => {
    let base = [...patients];
    if (activeFilter) {
      base = base.filter((p) => toCardKey(p.aseCategory) === activeFilter);
    }
    return sortPatients(base, sortField, sortDir);
  }, [patients, activeFilter, sortField, sortDir]);

  // Pagination state
const [currentPage, setCurrentPage] = useState(1);
const rowsPerPage = 25; // adjust for agency size (10–25 recommended)

// Derived pagination data
const totalPages = Math.ceil(rows.length / rowsPerPage);
const startIndex = (currentPage - 1) * rowsPerPage;
const currentRows = rows.slice(startIndex, startIndex + rowsPerPage);

// Handlers
const handlePageChange = (page) => {
  if (page < 1 || page > totalPages) return;
  setCurrentPage(page);
  window.scrollTo({ top: 0, behavior: "smooth" }); // scroll to top on page change
};

  // Toggle reviewed
  const toggleReviewed = (rowId) => {
    if (!rowId) return;
    setPatients((prev) => {
      const updated = prev.map((p) =>
        getRowId(p) === rowId ? { ...p, reviewed: !(p.reviewed === true) } : p
      );
      return sortPatients(updated, sortField, sortDir);
    });
  };

  // Header sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  return (
    <div className="dashboard-table-container">
      {/* ---------- Category Summary Cards ---------- */}
      <div className="summary-row">
        {Object.keys(CATEGORY_STYLES).map((key) => {
          const s = CATEGORY_STYLES[key];
          return (
            <button
              key={key}
              className={`summary-card ${activeFilter === key ? "active" : ""}`}
              style={{
                background: s.bg,
                color: s.text,
                borderColor: activeFilter === key ? "#19588f" : "transparent",
              }}
              onClick={() =>
                setActiveFilter((prev) => (prev === key ? null : key))
              }
            >
              <div className="summary-card-title">{key}</div>
              <div className="summary-card-count">{counts[key]}</div>
            </button>
          );
        })}
      </div>
      {typeof onViewReviews === "function" && (
        <div className="summary-cta">
          <button
            type="button"
            className="hl-btn small"
            onClick={onViewReviews}
          >
            View Clinical Review Hub →
          </button>
        </div>
      )}

      {/* ---------- Table ---------- */}
      <div className="table-wrapper">
        <table className="patient-table">
          <thead>
            <tr>
              <th>Patient Code</th>
              <th
                onClick={() => handleSort("category")}
                className={`sortable ${sortField === "category" ? sortDir : ""}`}
              >
                Category
                {sortField === "category" && (
                  <span className="sort-indicator">
                    {sortDir === "asc" ? " ▲" : " ▼"}
                  </span>
                )}
              </th>
              <th>Clinical Rationale</th>
              <th
                onClick={() => handleSort("lastUpdated")}
                className={`sortable ${sortField === "lastUpdated" ? sortDir : ""}`}
              >
                Last Updated
                {sortField === "lastUpdated" && (
                  <span className="sort-indicator">
                    {sortDir === "asc" ? " ▲" : " ▼"}
                  </span>
                )}
              </th>
              <th>Reviewed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="muted">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">No patients found.</td>
              </tr>
            ) : (
              currentRows.map((p) => {
                const rowId = getRowId(p);
                const styleKey = toCardKey(p.aseCategory);
                const catStyle = CATEGORY_STYLES[styleKey] || CATEGORY_STYLES["Stable"];
                const unreviewed = p.reviewed !== true;

                return (
                  <tr
                    key={rowId ?? `${p.patientCode}-${p.lastUpdated}`}
                    className={unreviewed ? "unreviewed" : ""}
                    onClick={() => setSelectedPatient(p)}
                  >
                    {/* Patient Code */}
                    <td className="code-cell">
                      {p.patientCode || p.id || "—"}
                    </td>

                    {/* Category (large dot) */}
                    <td className="category-cell">
                      <div
                        className={`category-dot ${p.color}`}
                        title={styleKey}
                        style={{ backgroundColor: catStyle.dot }}
                      />
                    </td>

                    {/* Reason Summary */}
                    <td className="summary-cell">{p.reasonSummary || "—"}</td>

                    {/* Last Updated */}
                    <td>{formatDateTime(p.lastUpdated)}</td>

                    {/* Reviewed Button */}
                    <td>
                      <button
                        className={`review-btn ${unreviewed ? "mark" : "done"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReviewed(rowId);
                        }}
                      >
                        {unreviewed ? "Mark Reviewed" : "Reviewed"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
        {/* ---------- Pagination Controls ---------- */}
{!loading && rows.length > rowsPerPage && (
  <div className="pagination-bar">
    <button
      className="page-btn"
      onClick={() => handlePageChange(currentPage - 1)}
      disabled={currentPage === 1}
    >
      ‹ Prev
    </button>

    <span className="page-status">
      Page {currentPage} of {totalPages}
    </span>

    <button
      className="page-btn"
      onClick={() => handlePageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
    >
      Next ›
    </button>
  </div>
)}

      <PatientDetailModal
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </div>
  );
}
