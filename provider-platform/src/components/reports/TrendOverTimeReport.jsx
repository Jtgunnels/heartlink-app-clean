// src/components/reports/TrendOverTimeReport.jsx — Production Build
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Label } from "recharts";
import ReportTableShell from "./ReportTableShell";
import { getTrendOverTimeData } from "../../utils/fetchReportData";
import { useContainerWidth } from "../../hooks/useContainerWidth";

export default function TrendOverTimeReport({ onExportData, rows: rowsProp, hideTable = true }) {
  const [rows, setRows] = useState(Array.isArray(rowsProp) ? rowsProp : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(rowsProp)) {
      setRows(rowsProp);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const data = await getTrendOverTimeData();
        setRows(data);
      } catch (err) {
        console.error("TrendOverTimeReport fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [rowsProp]);

  const data = useMemo(() => rows, [rows]);
  const { ref: containerRef, width } = useContainerWidth(320);

  const columns = [
    { key: "label", label: "Date / Period" },
    { key: "value", label: "Wellness Index (0–5)" },
  ];

  // KPI calculations
  const avgValue = useMemo(() => {
    if (!data.length) return null;
    const vals = data.map((d) => Number(d.value ?? 0)).filter((v) => !isNaN(v));
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
  }, [data]);

  const trendDirection = useMemo(() => {
    if (!data.length) return "—";
    const first = Number(data[0].value ?? 0);
    const last = Number(data[data.length - 1].value ?? 0);
    const delta = last - first;
    if (delta > 0.05) return "Improving";
    if (delta < -0.05) return "Declining";
    return "Stable";
  }, [data]);

  return (
    <div className="report-card" aria-label="Trend Over Time Report">
      <header className="report-header">
        <div className="report-header-left">
          <h2 className="report-title">Trend Over Time</h2>
          <p className="report-subtitle">
            Tracks the overall wellness trend across the population over time.
            This helps directors quickly identify whether patient-reported wellness
            is improving, stable, or declining.
          </p>
        </div>

        {avgValue && (
          <div className="report-kpi">
            <div className="kpi-label">Average Wellness</div>
            <div className="kpi-value">{avgValue}</div>
            <div
              className="kpi-foot"
              style={{
                color:
                  trendDirection === "Improving"
                    ? "#45B8A1"
                    : trendDirection === "Declining"
                    ? "#F26868"
                    : "#FDBA74",
              }}
            >
              {trendDirection}
            </div>
          </div>
        )}
      </header>

      {!hideTable && (
        <section className="report-body" aria-label="Trend Over Time Table">
          <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
        </section>
      )}

      <section className="report-chart" aria-label="Trend Over Time Chart">
        {loading && <div className="skeleton skeleton-block" />}
        {!loading && data.length > 0 ? (
          <div className="chart-shell" ref={containerRef}>
            <LineChart
              width={width}
              height={280}
              data={data}
              margin={{ top: 12, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeOpacity={0.15} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 12 }}
                label={
                  <Label
                    value="Wellness Index (0–5)"
                    angle={-90}
                    position="insideLeft"
                    fontSize={12}
                  />
                }
              />
              <Tooltip
                formatter={(val) => Number(val).toFixed(2)}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#19588F"
                strokeWidth={2.4}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
              />
            </LineChart>
          </div>
        ) : !loading ? (
          <p className="muted-text">No trend data available.</p>
        ) : null}
      </section>

      <footer className="report-footnote">
        <p>
          <strong>Director Insight:</strong> A rising line suggests improved comfort and
          engagement across the population. Sustained declines may warrant reviewing
          check-in frequency or patient education efforts.
        </p>
      </footer>
    </div>
  );
}
