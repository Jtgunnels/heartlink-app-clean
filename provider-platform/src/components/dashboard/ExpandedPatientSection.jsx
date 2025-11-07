import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { colors } from "../../theme/colors";

const LEVEL_MAP = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

const formatDateLabel = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const buildNumericSeries = (history = [], accessor, transform = (v) => v) =>
  history
    .slice(-14)
    .map((entry) => {
      const raw = accessor(entry);
      const value = transform(raw);
      return value == null
        ? null
        : {
            date: formatDateLabel(entry.date),
            value,
          };
    })
    .filter(Boolean);

const levelToNumeric = (value) => {
  if (typeof value === "number") return value;
  const normalized = String(value || "").toLowerCase();
  return LEVEL_MAP[normalized] ?? null;
};

function TrajectoryCard({ title, unit, color, data }) {
  return (
    <div className="trajectory-card">
      <div className="trajectory-header">
        <span>{title}</span>
        {unit ? <span className="trajectory-unit">{unit}</span> : null}
      </div>
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data}>
            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip formatter={(value) => value?.toString()} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="trajectory-empty">Not enough data</div>
      )}
    </div>
  );
}

export default function ExpandedPatientSection({ patient = {}, snapshot = {}, onNavigate }) {
  const history = Array.isArray(patient.history) ? patient.history : [];
  const baseline = patient.baseline || {};
  const latest = patient.latestScore || history[history.length - 1] || {};
  const alerts = Array.isArray(patient.alerts) ? patient.alerts : [];

  const [note, setNote] = useState("");

  const trajectorySeries = useMemo(
    () => ({
      ssi: buildNumericSeries(history, (h) => h.ssi ?? h.ssiScore, (v) => (typeof v === "number" ? v : null)),
      weight: buildNumericSeries(history, (h) => h.weightToday, (v) =>
        Number.isFinite(Number(v)) ? Number(v) : null
      ),
      sob: buildNumericSeries(history, (h) => h.sobLevel, levelToNumeric),
      edema: buildNumericSeries(history, (h) => h.edemaLevel, levelToNumeric),
      fatigue: buildNumericSeries(history, (h) => h.fatigueLevel, levelToNumeric),
    }),
    [history]
  );

  const handleMarkReviewed = () => {
    console.log("Mark reviewed", patient.id, note);
  };

  const handleAssignFollowUp = () => {
    console.log("Assign follow up", patient.id, note);
  };

  return (
    <div className="expanded-section">
      <div className="trajectory-grid">
        <TrajectoryCard
          title="SSI"
          unit="score"
          color={colors.deepBlue}
          data={trajectorySeries.ssi}
        />
        <TrajectoryCard
          title="Weight"
          unit="lbs"
          color={colors.seafoam}
          data={trajectorySeries.weight}
        />
        <TrajectoryCard
          title="Breathing"
          color={colors.orange}
          data={trajectorySeries.sob}
        />
        <TrajectoryCard
          title="Edema"
          color={colors.statusOrange}
          data={trajectorySeries.edema}
        />
        <TrajectoryCard
          title="Fatigue"
          color={colors.coral}
          data={trajectorySeries.fatigue}
        />
      </div>

      <div className="baseline-card">
        <h4>Baseline Comparison</h4>
        <table className="baseline-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Baseline</th>
              <th>Today</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Shortness of Breath</td>
              <td>{baseline.sobLevel ?? "—"}</td>
              <td>{latest.sobLevel ?? "—"}</td>
            </tr>
            <tr>
              <td>Edema</td>
              <td>{baseline.edemaLevel ?? "—"}</td>
              <td>{latest.edemaLevel ?? "—"}</td>
            </tr>
            <tr>
              <td>Fatigue</td>
              <td>{baseline.fatigueLevel ?? "—"}</td>
              <td>{latest.fatigueLevel ?? "—"}</td>
            </tr>
            <tr>
              <td>Orthopnea</td>
              <td>{baseline.orthopnea ? "Yes" : "No"}</td>
              <td>{latest.orthopnea ? "Yes" : "No"}</td>
            </tr>
            <tr>
              <td>Weight (lbs)</td>
              <td>{baseline.baselineWeight ?? "—"}</td>
              <td>{latest.weightToday ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="alert-timeline">
        <h4>Alert Timeline</h4>
        {alerts.length === 0 ? (
          <p className="alert-empty">No alerts recorded.</p>
        ) : (
          alerts.map((alert, index) => (
            <div key={index} className="alert-item">
              <span className="alert-date">
                {formatDateLabel(alert.date) || formatDateLabel(alert.createdAt)}
              </span>
              <span className="alert-text">{alert.text || alert.description}</span>
            </div>
          ))
        )}
      </div>

      <div className="clinical-actions">
        <textarea
          placeholder="Enter provider note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="clinical-buttons">
          <button type="button" className="hl-btn small" onClick={handleMarkReviewed}>
            Mark as Reviewed
          </button>
          <button type="button" className="hl-btn ghost small" onClick={handleAssignFollowUp}>
            Assign Follow-Up
          </button>
        </div>
      </div>

      <div className="full-link">
        <Link
          to={`/patients/${snapshot.id}`}
          className="link-button"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate?.();
          }}
        >
          View Full Patient Profile →
        </Link>
      </div>
    </div>
  );
}
