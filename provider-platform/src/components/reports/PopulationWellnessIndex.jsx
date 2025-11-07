// HeartLink Provider Platform — Population Wellness Trend (Final Compliance)
// Displays average daily wellness index for active participants across the selected reporting period.

import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area } from "recharts";

import ReportTableShell from "./ReportTableShell";
import { getPopulationWellnessData } from "../../utils/fetchReportData";
import { useContainerWidth } from "../../hooks/useContainerWidth";

export default function PopulationWellnessIndex({ onExportData, rows: rowsProp, hideTable = false }) {
  const [rows, setRows] = useState(Array.isArray(rowsProp) ? rowsProp : []);

  useEffect(() => {
    if (Array.isArray(rowsProp)) return;
    (async () => setRows(await getPopulationWellnessData()))();
  }, [rowsProp]);

  const data = useMemo(() => rows, [rows]);
  const { ref: containerRef, width } = useContainerWidth(320);
  const columns = [
    { key: "date", label: "Date" },
    { key: "wellnessIndex", label: "Average Wellness Index (0–5)" },
  ];

  return (
    <div>
      {!hideTable && (
        <>
          <h3 className="report-title">Population Wellness Trend</h3>
          <p className="chart-desc">
            Average daily wellness index for active participants across the selected reporting period.
          </p>
        </>
      )}

      {!hideTable && <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />}
      {hideTable && (
        <div className="sr-only">
          <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
        </div>
      )}

      <div className="chart-shell" ref={containerRef}>
        {data.length > 0 ? (
          <LineChart
            width={width}
            height={280}
            data={data}
            margin={{ top: 12, right: 20, left: 0, bottom: 40 }}
            aria-label="Population Wellness Trend over time"
          >
            <defs>
              <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#45B8A1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#45B8A1" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              angle={-45}
              height={60}
              interval={4}
              textAnchor="end"
            />
            <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => Number(v).toFixed(2)} />
            <Area type="monotone" dataKey="wellnessIndex" stroke="none" fill="url(#colorWellness)" />
            <Line
              type="monotone"
              dataKey="wellnessIndex"
              stroke="#45B8A1"
              strokeWidth={2.4}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
            />
          </LineChart>
        ) : (
          <p className="muted-text">No wellness data available.</p>
        )}
      </div>
    </div>
  );
}
