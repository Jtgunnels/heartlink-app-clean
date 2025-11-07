// ReportsPage.jsx — Finalized Narrative Flow: Enrollment → Engagement → Wellness → Stability
// HeartLink Provider Platform — "HeartLink Program Insights" Page

import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import "./ReportsPage.css";
import DirectorView from "../components/reports/DirectorView.jsx";
import PatientReports from "../components/PatientReports.jsx";
import {
  getPopulationOverview,
  getPatientsList,
  getCheckInAdherenceData,
  getPopulationWellnessData,
  getFourBandStabilityTrend,
  getEnrollmentTrend,
  getPatientSnapshots,
} from "../utils/fetchReportData";

import CheckInAdherenceReport from "../components/reports/CheckInAdherenceReport.jsx";
import PopulationWellnessIndex from "../components/reports/PopulationWellnessIndex.jsx";
import PatientStabilityReport from "../components/reports/PatientStabilityReport.jsx";
import PatientSnapshotCard from "../components/patients/PatientSnapshotCard.jsx";

const DEFAULT_TIMERANGE = 30;

const asePriorityValue = (category = "") => {
  const normalized = String(category).trim().toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("needs immediate") || normalized === "red") return 4;
  if (normalized.includes("review recommended") || normalized === "orange") return 3;
  if (normalized.includes("minor") || normalized === "yellow") return 2;
  if (normalized.includes("stable") || normalized === "green") return 1;
  return 0;
};

const parseTimestamp = (isoValue) => {
  if (!isoValue) return 0;
  const date = new Date(isoValue);
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
};

const computeWellnessDelta = (trend = []) => {
  if (!Array.isArray(trend) || trend.length === 0) return null;
  const points = trend.filter(
    (entry) => entry && typeof entry.wellness === "number" && !Number.isNaN(entry.wellness)
  );
  if (!points.length) return null;
  const first = points[0].wellness;
  const last = points[points.length - 1].wellness;
  return Number.isFinite(first) && Number.isFinite(last) ? last - first : null;
};

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState("population");
  const [timeRange, setTimeRange] = useState(DEFAULT_TIMERANGE);

  const [popData, setPopData] = useState(null);
  const [popLoading, setPopLoading] = useState(true);
  const [popError, setPopError] = useState(null);

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [snapshotPatients, setSnapshotPatients] = useState([]);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState(null);

  /** Fetch full population data in parallel */
  const fetchPopulation = useCallback(async () => {
    setPopLoading(true);
    setPopError(null);
    try {
      const [
        overview,
        adherenceRows,
        wellnessRows,
        stabilityRows,
        enrollmentTrend,
      ] = await Promise.all([
        getPopulationOverview(timeRange),
        getCheckInAdherenceData(timeRange),
        getPopulationWellnessData(timeRange),
        getFourBandStabilityTrend(timeRange),
        getEnrollmentTrend(timeRange),
      ]);

      console.log("✅ Data loaded:", {
        overview,
        adherence: adherenceRows?.length,
        wellness: wellnessRows?.length,
        stability: stabilityRows?.length,
        enrollment: enrollmentTrend?.length,
      });

      setPopData({
        overview,
        adherenceRows,
        wellnessRows,
        stabilityRows,
        enrollmentTrend,
      });
    } catch (err) {
      setPopError(err?.message || "Failed to load population reports.");
    } finally {
      setPopLoading(false);
    }
  }, [timeRange]);

  /** Fetch all patients for individual view */
  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const list = await getPatientsList();
      setPatients(Array.isArray(list) ? list : list?.items || []);
    } catch (err) {
      setPatientsError(err?.message || "Failed to load patients.");
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const fetchSnapshotPatients = useCallback(async () => {
    if (!Array.isArray(patients) || patients.length === 0) {
      setSnapshotPatients([]);
      setSnapshotError(null);
      setSnapshotLoading(false);
      return;
    }

    const activeIds = Array.from(
      new Set(
        patients
          .filter(
            (patient) =>
              String(patient?.status || "").trim().toLowerCase() === "active"
          )
          .map((patient) => patient?.id)
          .filter(Boolean)
      )
    );

    if (!activeIds.length) {
      setSnapshotPatients([]);
      setSnapshotError(null);
      setSnapshotLoading(false);
      return;
    }

    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const snapshots = await getPatientSnapshots(activeIds, timeRange);
      // ✅ Normalize 'category' → 'aseCategory' for downstream components
      const normalized =
        Array.isArray(snapshots)
          ? snapshots.map((p) => ({
              ...p,
              aseCategory:
                p.aseCategory ||
                p.category || // <-- new check-in field
                p.aseStatus ||
                p.statusCategory ||
                "Stable",
            }))
          : [];
      setSnapshotPatients(normalized);
    } catch (err) {
      console.error("ReportsPage snapshot fetch error", err);
      setSnapshotError(err?.message || "Unable to load patient highlights.");
      setSnapshotPatients([]);
    } finally {
      setSnapshotLoading(false);
    }
  }, [patients, timeRange]);

  /** Trigger initial and range-based refreshes */
  useEffect(() => {
    fetchPopulation();
  }, [fetchPopulation]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (patientsLoading) return;
    fetchSnapshotPatients();
  }, [patientsLoading, fetchSnapshotPatients]);

  const onExportClick = useCallback(
    (scope) => {
      const detail = {
        scope,
        timeRange,
        patientId: scope === "individual" ? selectedPatientId : undefined,
      };
      window.dispatchEvent(new CustomEvent("heartlink:export", { detail }));
    },
    [timeRange, selectedPatientId]
  );

  /** ✅ Derived Director Summary for KPI Cards */
  const directorSummary = useMemo(() => {
    if (!popData?.overview) return {};
    const { avgWellness, avgAdherence, activePatients } = popData.overview;
    return {
      stablePopulation: Math.round(avgWellness * 10), // proxy: 10× wellness
      atRiskPopulation: Math.max(0, 100 - Math.round(avgWellness * 10)),
      avgEngagement: Math.round(avgAdherence),
      adherenceTrend: Math.round(avgAdherence - 80), // compare to baseline 80%
      totalPatients: activePatients,
    };
  }, [popData]);

  const highRiskPatients = useMemo(() => {
    if (!Array.isArray(snapshotPatients) || snapshotPatients.length === 0) return [];
    const prioritized = [...snapshotPatients].sort((a, b) => {
      const severityDiff =
        asePriorityValue(b?.aseCategory) - asePriorityValue(a?.aseCategory);
      if (severityDiff !== 0) return severityDiff;
      const lastCheckDiff =
        parseTimestamp(b?.lastCheckIn) - parseTimestamp(a?.lastCheckIn);
      if (lastCheckDiff !== 0) return lastCheckDiff;
      const adherenceDiff =
        (typeof b?.adherenceRate === "number" ? b.adherenceRate : 0) -
        (typeof a?.adherenceRate === "number" ? a.adherenceRate : 0);
      if (adherenceDiff !== 0) return adherenceDiff;
      return (b?.name || "").localeCompare(a?.name || "");
    });

    const flagged = prioritized.filter(
      (patient) => asePriorityValue(patient?.aseCategory) >= 3
    );
    return (flagged.length ? flagged : prioritized).slice(0, 5);
  }, [snapshotPatients]);

  const lowAdherencePatients = useMemo(() => {
    if (!Array.isArray(snapshotPatients) || snapshotPatients.length === 0) return [];
    const withMetric = snapshotPatients.filter(
      (patient) => typeof patient?.adherenceRate === "number"
    );
    const withoutMetric = snapshotPatients.filter(
      (patient) => typeof patient?.adherenceRate !== "number"
    );
    const sorted = [...withMetric].sort(
      (a, b) => a.adherenceRate - b.adherenceRate
    );
    return [...sorted, ...withoutMetric].slice(0, 5);
  }, [snapshotPatients]);

  const wellnessImprovementPatients = useMemo(() => {
    if (!Array.isArray(snapshotPatients) || snapshotPatients.length === 0) return [];
    const enriched = snapshotPatients
      .map((patient) => ({
        patient,
        delta: computeWellnessDelta(patient?.trend),
      }))
      .filter((item) => item.delta !== null);

    if (!enriched.length) return [];

    const positive = enriched.filter((item) => item.delta > 0);
    const source = positive.length ? positive : enriched;

    return source
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5)
      .map((item) => item.patient);
  }, [snapshotPatients]);

  const renderPatientHighlight = (
    title,
    description,
    data,
    emptyMessage = "No patient highlights for this period."
  ) => (
    <div className="report-patient-highlight" aria-live="polite">
      <div className="report-patient-header">
        <h4>{title}</h4>
        {description ? <p>{description}</p> : null}
      </div>
      {snapshotLoading ? (
        <div className="report-patient-state">Loading patient highlights…</div>
      ) : snapshotError ? (
        <div className="report-patient-error" role="alert">
          {snapshotError}
        </div>
      ) : !Array.isArray(data) || data.length === 0 ? (
        <div className="report-patient-state">{emptyMessage}</div>
      ) : (
        <div className="report-patient-grid">
          {data.map((patient) => (
            <PatientSnapshotCard
              key={patient?.id || patient?.name}
              patient={patient}
              context="report"
              showTrend={false}
              showReason={true}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="reports-page">
      <div className="reports-inner">
      <header className="reports-header">
        <h1 className="reports-title">HeartLink Program Insights</h1>
        <p className="reports-subtitle">
          A comprehensive overview of program enrollment, engagement trends, and population wellness stability.
        </p>

        <div className="reports-controls centered">
          <select
            className="hl-select"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <div className="toggle-group">
            <button
              className={`toggle ${viewMode === "population" ? "active" : ""}`}
              onClick={() => setViewMode("population")}
            >
              Population Overview
            </button>
            <button
              className={`toggle ${viewMode === "individual" ? "active" : ""}`}
              onClick={() => setViewMode("individual")}
            >
              Individual View
            </button>
          </div>

          <button
            className="hl-btn export"
            onClick={() =>
              onExportClick(viewMode === "individual" ? "individual" : "population")
            }
          >
            ⬇ Export Program Insights
          </button>
        </div>
      </header>

      <section className="director-section">
        <Suspense fallback={<div className="skeleton skeleton-director" />}>
          <DirectorView
  timeRange={timeRange}
  data={{ ...popData, ...directorSummary }} // merge both objects
  loading={popLoading}
  error={popError}
/>
        </Suspense>
      </section>

      <main className="reports-main">
        {viewMode === "population" && (
          <section className="population-section">
            {popLoading ? (
              <div className="skeleton skeleton-block" />
            ) : popError ? (
              <div role="alert" className="error-box">
                <p>{popError}</p>
                <button className="hl-btn" onClick={fetchPopulation}>
                  Retry
                </button>
              </div>
            ) : (
              <div className="vertical-stack">
                <div className="card chart-card-wide">
                  <h3 className="report-title">Average Daily Engagement Report</h3>
                  <p className="chart-desc">
                    Shows how overall daily check-in adherence across active participants changes over time.
                  </p>
                  <CheckInAdherenceReport
                    timeRange={timeRange}
                    rowsProp={popData?.adherenceRows || []}
                    hideTable={true}
                  />
                  {renderPatientHighlight(
                    "Lowest Engagement",
                    `Patients trending below target adherence over the past ${timeRange} days.`,
                    lowAdherencePatients,
                    "All monitored patients maintained target adherence during this period."
                  )}
                </div>

                <div className="card chart-card-wide">
                  <h3 className="report-title">Population Wellness Trend</h3>
                  <p className="chart-desc">
                    Average daily wellness index for active participants across the selected reporting period.
                  </p>
                  <PopulationWellnessIndex
                    timeRange={timeRange}
                    rowsProp={popData?.wellnessRows || []}
                    hideTable={true}
                  />
                  {renderPatientHighlight(
                    "Wellness Improvement Leaders",
                    `Participants with the strongest positive wellness momentum in the last ${timeRange} days.`,
                    wellnessImprovementPatients,
                    "No meaningful wellness improvements detected for this period."
                  )}
                </div>

                <div className="card chart-card-wide">
                  <h3 className="report-title">Stability Distribution Analysis</h3>
                  <p className="chart-desc">
                    Proportion of active participants in each stability category (Green–Yellow–Orange–Red) throughout the selected period.
                  </p>
                  <PatientStabilityReport
                    timeRange={timeRange}
                    rowsProp={popData?.stabilityRows || []}
                    hideTable={true}
                  />
                  {renderPatientHighlight(
                    "Stability Watchlist",
                    "Patients requiring additional review based on current ASE status and recent activity.",
                    highRiskPatients,
                    "No patients currently require escalated stability review."
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {viewMode === "individual" && (
          <section className="individual-section">
            <h2 className="section-title">Individual Patient Reports</h2>
            {patientsLoading ? (
              <div className="skeleton skeleton-row" />
            ) : patientsError ? (
              <div role="alert" className="error-box">
                <p>{patientsError}</p>
                <button className="hl-btn" onClick={fetchPatients}>
                  Retry
                </button>
              </div>
            ) : (
              <PatientReports
                timeRange={timeRange}
                patients={patients}
                selectedPatientId={selectedPatientId}
                onChangePatient={setSelectedPatientId}
                onExport={() => onExportClick("individual")}
              />
            )}
          </section>
        )}
      </main>

      <footer className="reports-footer">
        <p className="disclaimer">
         HeartLink is a general wellness tool designed to support awareness of well-being and engagement.
         It does not diagnose, monitor, or treat any medical condition.
       </p>
      </footer>
      </div>
    </div>
  );
}
