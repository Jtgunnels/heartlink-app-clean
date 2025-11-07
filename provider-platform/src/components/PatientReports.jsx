// src/components/PatientReports.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";
import { getPatientOverview } from "../utils/fetchReportData.js"; // ✅ Firestore import
import { useContainerWidth } from "../hooks/useContainerWidth";

export default function PatientReports({
  timeRange = "30d",
  patients = [],
  selectedPatientId = "",
  onChangePatient = () => {},
  onExport = () => {},
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);

  const selectedPatient = useMemo(
    () => patients.find((p) => String(p.id) === String(selectedPatientId)),
    [patients, selectedPatientId]
  );

  const fetchPatient = useCallback(async () => {
    if (!selectedPatientId) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      // ✅ Directly call Firestore util — no REST or /api
      const numericRange = Number(timeRange) || 30;
      const d = await getPatientOverview(selectedPatientId, numericRange);
      setData(d || {});
    } catch (e) {
      console.error("getPatientOverview error:", e);
      setErr(e?.message || "Failed to load patient reports.");
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId, timeRange]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  // Safe derived series (wellness-safe naming)
  const trendSeries = useMemo(() => {
    const series = data?.history || [];
    return series.map((d) => ({
      label: d.label || (d.date ? String(d.date).slice(0, 10) : ""),
      wellness: Number(
        d.wellnessIndex ??
          d.wellnessScore ??
          d.wellness ??
          d.score ??
          0
      ),
      adherence: (() => {
        const raw = Number(d.adherenceRate ?? d.adherence ?? 0);
        if (!Number.isFinite(raw)) return 0;
        return raw > 1 ? raw / 100 : raw;
      })(),
    }));
  }, [data]);

  const summary = useMemo(() => {
    const avgWellness = data?.avgWellness ?? null;
    const avgAdherence = data?.avgAdherence ?? null;
    const lastCheckIn =
      data?.recent?.date ||
      (Array.isArray(data?.history) && data.history.length
        ? data.history[data.history.length - 1].date
        : null);
    return { avgWellness, avgAdherence, lastCheckIn };
  }, [data]);

  const weeklySeries = useMemo(() => {
    const history = Array.isArray(data?.history) ? data.history : [];
    if (!history.length) return [];

    const buckets = new Map();
    history.forEach((entry) => {
      const date = entry?.date ? new Date(entry.date) : null;
      if (!date || Number.isNaN(date.getTime())) return;

      const weekStart = new Date(date);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(date.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);

      const rawAdherence = Number(entry.adherenceRate ?? entry.adherence ?? 0);
      const adherence = Number.isFinite(rawAdherence)
        ? rawAdherence > 1
          ? rawAdherence / 100
          : rawAdherence
        : 0;

      const rawWellness = Number(
        entry.wellnessIndex ??
          entry.wellnessScore ??
          entry.wellness ??
          entry.score ??
          0
      );

      if (!buckets.has(key)) {
        buckets.set(key, { adherenceSum: 0, wellnessSum: 0, count: 0 });
      }
      const bucket = buckets.get(key);
      bucket.adherenceSum += adherence;
      bucket.wellnessSum += Number.isFinite(rawWellness) ? rawWellness : 0;
      bucket.count += 1;
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([weekStart, bucket]) => ({
        week: `Week of ${weekStart}`,
        adherence:
          bucket.count > 0
            ? Number((bucket.adherenceSum / bucket.count).toFixed(3))
            : 0,
        wellness:
          bucket.count > 0
            ? Number((bucket.wellnessSum / bucket.count).toFixed(2))
            : 0,
      }));
  }, [data]);

  const { ref: trendRef, width: trendWidth } = useContainerWidth(320);
  const { ref: weeklyRef, width: weeklyWidth } = useContainerWidth(240);

  return (
    <div className="patient-reports card">
      <div className="patient-toolbar">
        <label htmlFor="patientSelect" className="label">
          Select Patient
        </label>
        <select
          id="patientSelect"
          className="hl-select"
          value={selectedPatientId}
          onChange={(e) => onChangePatient(e.target.value)}
          aria-label="Select a patient"
        >
          <option value="">-- Choose a patient --</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code ? `${p.code} — ${p.name ?? "Unnamed"}` : p.name ?? p.id}
            </option>
          ))}
        </select>

        <div className="spacer" />

        <button
          className="hl-btn export"
          onClick={onExport}
          disabled={!selectedPatientId}
          aria-disabled={!selectedPatientId}
          aria-label="Export individual patient report"
        >
          Export Individual Report
        </button>
      </div>

      {!selectedPatientId && (
        <div className="empty-box">
          <p>Select a patient to view their wellness participation pattern.</p>
        </div>
      )}

      {selectedPatientId && (
        <>
          <div className="patient-header">
            <div>
              <h3 className="report-title">
                Wellness Summary —{" "}
                {selectedPatient?.code
                  ? `${selectedPatient.code} · `
                  : ""}
                {selectedPatient?.name || selectedPatientId}
              </h3>
              <p className="muted">
                Time range: <strong>{timeRange}</strong>
              </p>
            </div>
            <div className="patient-stats">
              <div className="stat">
                <div className="stat-label">Avg Wellness</div>
                <div className="stat-value">
                  {typeof summary.avgWellness === "number"
                    ? summary.avgWellness.toFixed(2)
                    : summary.avgWellness
                    ? Number(summary.avgWellness).toFixed(2)
                    : "—"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg Participation</div>
                <div className="stat-value">
                  {typeof summary.avgAdherence === "number"
                    ? `${Math.round(summary.avgAdherence)}%`
                    : summary.avgAdherence
                    ? `${Math.round(Number(summary.avgAdherence))}%`
                    : "—"}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Last Check-In</div>
                <div className="stat-value">
                  {summary.lastCheckIn
                    ? String(summary.lastCheckIn).slice(0, 10)
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          {loading && <div className="skeleton skeleton-block" />}

          {err && !loading && (
            <div role="alert" className="error-box">
              <p>{err}</p>
              <button className="hl-btn" onClick={fetchPatient}>
                Retry
              </button>
            </div>
          )}

          {!loading && !err && (
            <>
              <div className="chart-card" ref={trendRef}>
                <h4 className="chart-title">Reported Wellness & Participation</h4>
                <div className="chart-wrapper">
                  <LineChart
                    width={trendWidth}
                    height={280}
                    data={trendSeries}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, 5]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 1]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="wellness"
                      name="Wellness (self-reported)"
                      stroke="#45B8A1"
                      strokeWidth={2.2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="adherence"
                      name="Participation Rate"
                      stroke="#19588F"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </div>
                <p className="chart-footnote">
                  Higher wellness indicates better reported comfort; participation
                  reflects completed check-ins.
                </p>
              </div>

              {weeklySeries.length > 0 && (
                <div className="chart-card" ref={weeklyRef}>
                  <h4 className="chart-title">Weekly Participation Overview</h4>
                  <div className="chart-wrapper">
                    <BarChart
                      width={weeklyWidth}
                      height={240}
                      data={weeklySeries}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeOpacity={0.15} vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                      <Tooltip formatter={(v) => `${Math.round(Number(v) * 100)}%`} />
                      <Bar dataKey="adherence" name="Participation Rate" fill="#19588F" />
                    </BarChart>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
