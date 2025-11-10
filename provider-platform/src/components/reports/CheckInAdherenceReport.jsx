import React, { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area } from "recharts";
import ReportTableShell from "./ReportTableShell";
import { getCheckInAdherenceData } from "../../utils/fetchReportData";
import { useContainerWidth } from "../../hooks/useContainerWidth";

export default function CheckInAdherenceReport({
  timeRange,          // ← use this to fetch the right window (cohort mean over time)
  onExportData,
  rowsProp,           // optional pre-aggregated rows from parent
  hideTable = false,
}) {
  const [rows, setRows] = useState([]);
  const { ref: containerRef, width } = useContainerWidth(320);

  // Normalize to a single, consistent schema:
  // [{ date: 'YYYY-MM-DD', adherenceRate: 0..100 }]
  const normalizeRows = (input = []) =>
    Array.isArray(input)
      ? input
          .map((r) => {
            const date = r?.date || r?.day || null;
            // accept either adherenceRate or adherence, but emit adherenceRate
            const raw =
              r?.adherenceRate ??
              (typeof r?.adherence === "number" ? r.adherence : null);
            // guard NaN and clamp to [0, 100]
            const adherenceRate =
              raw == null || Number.isNaN(Number(raw))
                ? 0
                : Math.max(0, Math.min(100, Number(raw)));
            return date ? { date, adherenceRate } : null;
          })
          .filter(Boolean)
      : [];

  useEffect(() => {
    // If parent provided rows, always prefer them (they’re already aggregated for the page)
    if (Array.isArray(rowsProp) && rowsProp.length > 0) {
      setRows(normalizeRows(rowsProp));
      return;
    }
    // Otherwise, fetch cohort mean adherence (longitudinal) for the selected time window
    (async () => {
      const days = typeof timeRange === "number" ? timeRange : undefined;
      const fetched = await getCheckInAdherenceData(days);
      setRows(normalizeRows(fetched));
    })();
    // re-run when either the provided rows change or the time window changes
  }, [rowsProp, timeRange]);

  const data = useMemo(() => rows, [rows]);

  const columns = [
    { key: "date", label: "Date" },
    { key: "adherenceRate", label: "Average Adherence (%)" }, // ← table matches chart key
  ];

  return (
    <div>
      {!hideTable && (
        <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
      )}

      <div className="chart-shell" ref={containerRef}>
        {data.length > 0 ? (
          <LineChart
            width={width}
            height={280}
            data={data}
            margin={{ top: 12, right: 20, left: 0, bottom: 40 }}
          >
            <defs>
              <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#19588F" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#19588F" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />

            {/* Area + Line use the SAME key: adherenceRate */}
            <Area type="monotone" dataKey="adherenceRate" fill="url(#colorAdherence)" stroke="none" />
            <Line
              type="monotone"
              dataKey="adherenceRate"
              stroke="#19588F"
              strokeWidth={2.4}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        ) : (
          <p className="muted-text">No adherence data available.</p>
        )}
      </div>
    </div>
  );
}
