import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { getPatientOverview } from "../../utils/fetchReportData";

const ASE_COLORS = {
  Green: "#45B8A1",
  Yellow: "#FFE58F",
  Orange: "#FDBA74",
  "Review Recommended": "#FDBA74",
  Red: "#F26868",
  "Needs Immediate Review": "#F26868",
};

function trapFocus(event, container) {
  if (event.key !== "Tab" || !container) return;
  const focusableSelectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ];

  const focusable = Array.from(
    container.querySelectorAll(focusableSelectors.join(", "))
  ).filter((node) => !node.hasAttribute("data-focus-guard"));

  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const isShift = event.shiftKey;

  if (isShift && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!isShift && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export default function PatientDetailDrawer({ patient, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !patient?.id) {
      setOverview(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await getPatientOverview(patient.id, 30);
        if (!cancelled) setOverview(data);
      } catch (err) {
        console.error("PatientDetailDrawer getPatientOverview error", err);
        if (!cancelled) setError(err?.message || "Unable to load patient detail.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, patient?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 10);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      } else if (event.key === "Tab") {
        trapFocus(event, drawerRef.current);
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  const chartData = useMemo(() => {
    const history = overview?.history || [];
    return history.slice(-30).map((entry) => {
      const rawAdherence =
        entry.adherenceRate ?? entry.adherence ?? entry.engagement ?? null;
      const rawWellness =
        entry.wellnessIndex ?? entry.wellness ?? entry.score ?? null;

      const adherenceNum =
        rawAdherence != null ? Number(rawAdherence) : Number.NaN;
      const wellnessNum =
        rawWellness != null ? Number(rawWellness) : Number.NaN;

      const adherenceValue = Number.isFinite(adherenceNum)
        ? Number(
            (adherenceNum > 1 ? adherenceNum : adherenceNum * 100).toFixed(1)
          )
        : null;
      const wellnessValue = Number.isFinite(wellnessNum)
        ? Number(wellnessNum.toFixed(2))
        : null;

      return {
        date: entry.date,
        adherence: adherenceValue,
        wellness: wellnessValue,
      };
    });
  }, [overview]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="patient-detail-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="patient-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-detail-title"
        onClick={(e) => e.stopPropagation()}
        ref={drawerRef}
        tabIndex={-1}
      >
        <header className="patient-detail-header">
          <div>
            <h2 id="patient-detail-title">{patient?.name || patient?.patientCode}</h2>
            <p className="patient-detail-subtitle">
              ASE Category:&nbsp;
              <span
                className="patient-detail-pill"
                style={{
                  backgroundColor: ASE_COLORS[patient?.aseCategory] || "#19588F",
                }}
              >
                {patient?.aseCategory || "Unknown"}
              </span>
            </p>
          </div>
          <button
            className="hl-btn ghost"
            onClick={onClose}
            ref={closeBtnRef}
          >
            Close
          </button>
        </header>

        <section className="patient-detail-body">
          {loading ? (
            <div className="patient-detail-loading">Loading patient data…</div>
          ) : error ? (
            <div className="patient-detail-error" role="alert">
              {error}
            </div>
          ) : (
            <>
              <div className="patient-detail-stats">
                <div>
                  <p className="label">Avg Adherence (30d)</p>
                  <p className="value">
                    {overview?.avgAdherence != null
                      ? `${overview.avgAdherence.toFixed?.(1) ?? overview.avgAdherence}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="label">Avg Wellness (30d)</p>
                  <p className="value">
                    {overview?.avgWellness != null
                      ? overview.avgWellness.toFixed?.(2) ?? overview.avgWellness
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="label">Recent Check-In</p>
                  <p className="value">
                    {overview?.recent?.date
                      ? new Date(overview.recent.date).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="patient-detail-chart">
                <h3>30-Day Engagement Trend</h3>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3ECF3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12 }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "adherence") return [`${value}%`, "Adherence"];
                          return [value, "Wellness"];
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="adherence"
                        stroke="#19588F"
                        strokeWidth={2}
                        dot={false}
                        name="adherence"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="wellness"
                        stroke="#45B8A1"
                        strokeWidth={2}
                        dot={false}
                        name="wellness"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted-text">Not enough data for trend chart.</p>
                )}
              </div>

              <div className="patient-detail-section">
                <h3>Reason Summary</h3>
                <p>{patient?.reasonSummary || "No additional notes for this patient."}</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>,
    document.body
  );
}
