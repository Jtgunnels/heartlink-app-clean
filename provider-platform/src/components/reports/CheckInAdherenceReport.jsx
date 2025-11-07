// HeartLink Provider Platform — Average Daily Engagement Report (Line Chart Version)
// Shows longitudinal adherence trend across Active participants (7 / 30 / 90 days)

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from "recharts";
import ReportTableShell from "./ReportTableShell";
import { getCheckInAdherenceData } from "../../utils/fetchReportData";
import { useContainerWidth } from "../../hooks/useContainerWidth";

export default function CheckInAdherenceReport({
  onExportData,
  rowsProp = [],
  hideTable = false,
  timeRange = "30d",
}) {
  const [rows, setRows] = useState(Array.isArray(rowsProp) ? rowsProp : []);

  const numericRange = useMemo(() => {
    if (typeof timeRange === "string") {
      const parsed = parseInt(timeRange, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    const num = Number(timeRange);
    return Number.isFinite(num) && num > 0 ? num : 30;
  }, [timeRange]);

  const windowSize = useMemo(() => {
    if (numericRange <= 7) return 3;
    if (numericRange <= 30) return 7;
    return 30;
  }, [numericRange]);

  useEffect(() => {
    if (Array.isArray(rowsProp) && rowsProp.length) {
      setRows(rowsProp);
      return;
    }
    (async () => setRows(await getCheckInAdherenceData(numericRange)))();
  }, [rowsProp, numericRange]);

  const data = useMemo(() => rows, [rows]);
  const { ref: containerRef, width } = useContainerWidth(320);

  const columns = [
    { key: "date", label: "Date" },
    { key: "adherenceRate", label: "Average Engagement (%)" },
  ];

  const chartData = useMemo(() => {
    const points = [...data]
      .map((item) => ({
        ...item,
        adherenceRate: Number(item.adherenceRate ?? item.value ?? 0),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!points.length) return [];

    const rolling = points.map((_, idx) => {
      const start = Math.max(0, idx - windowSize + 1);
      const slice = points.slice(start, idx + 1);
      const mean =
        slice.reduce((sum, item) => sum + (Number(item.adherenceRate) || 0), 0) /
        (slice.length || 1);
      return Number(mean.toFixed(1));
    });

    return points.map((pt, idx) => ({
      ...pt,
      rollingBaseline: rolling[idx],
    }));
  }, [data, windowSize]);

  return (
    <div>
      {!hideTable && (
        <>
          <h3 className="report-title">Average Daily Engagement Report</h3>
          <p className="chart-desc">
            Shows how overall daily check-in adherence across active participants changes over time.
          </p>
        </>
      )}

      {!hideTable && (
        <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
      )}
      {hideTable && (
        <div className="sr-only">
          <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
        </div>
      )}

      <div className="chart-shell" ref={containerRef}>
        {chartData.length > 0 ? (
          <LineChart
            width={width}
            height={300}
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            aria-label="Average Daily Engagement Trend"
          >
            <defs>
              <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#45B8A1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#45B8A1" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={8} minTickGap={25} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} labelStyle={{ fontWeight: 600 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="adherenceRate" fill="url(#engagementGradient)" stroke="none" />
            <Line
              type="monotone"
              dataKey="adherenceRate"
              stroke="#45B8A1"
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
            <Line
              type="monotone"
              dataKey="rollingBaseline"
              name={`${windowSize}-Day Rolling Mean`}
              stroke="#FDBA74"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </LineChart>
        ) : (
          <p className="muted-text">No adherence data available.</p>
        )}
      </div>
    </div>
  );
}
