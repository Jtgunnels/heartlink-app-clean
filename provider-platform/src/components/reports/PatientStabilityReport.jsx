// HeartLink Provider Platform — Stability Distribution Analysis (Final Compliance)

import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ReportTableShell from "./ReportTableShell";
import { useContainerWidth } from "../../hooks/useContainerWidth";

export default function PatientStabilityReport({
  rowsProp = [],
  onExportData,
  hideTable = true,
}) {
  const [rows, setRows] = useState([]);

  // 🔁 Re-render when parent updates prop
  useEffect(() => {
    setRows(Array.isArray(rowsProp) ? rowsProp : []);
  }, [rowsProp]);

  const columns = [
    { key: "date", label: "Date" },
    { key: "Green", label: "Stable (Green)" },
    { key: "Yellow", label: "Minor Change (Yellow)" },
    { key: "Orange", label: "Review Recommended (Orange)" },
    { key: "Red", label: "Needs Immediate Review (Red)" },
  ];

  const colors = {
    Green: "#45B8A1",
    Yellow: "#FFE58F",
    Orange: "#FDBA74",
    Red: "#F26868",
  };

  const { ref: containerRef, width } = useContainerWidth(320);

  return (
    <div>
      {!hideTable && (
        <>
          <h3 className="report-title">Stability Distribution Analysis</h3>
          <p className="chart-desc">
            Proportion of active participants in each stability category
            (Green–Yellow–Orange–Red) throughout the selected period.
          </p>
        </>
      )}

      {!hideTable && (
        <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
      )}

      <div className="chart-shell" ref={containerRef}>
        {rows.length > 0 ? (
          <AreaChart
            width={width}
            height={300}
            data={rows}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            aria-label="Stability Distribution stacked trend"
          >
            <defs>
              <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#45B8A1" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#45B8A1" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFE58F" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#FFE58F" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FDBA74" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#FDBA74" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F26868" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#F26868" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v, n) => [`${Number(v).toFixed(1)}%`, n]}
              contentStyle={{ fontSize: 13 }}
            />

            <Area type="monotone" dataKey="Green" stackId="1" stroke={colors.Green} fill="url(#colorGreen)" />
            <Area type="monotone" dataKey="Yellow" stackId="1" stroke={colors.Yellow} fill="url(#colorYellow)" />
            <Area type="monotone" dataKey="Orange" stackId="1" stroke={colors.Orange} fill="url(#colorOrange)" />
            <Area type="monotone" dataKey="Red" stackId="1" stroke={colors.Red} fill="url(#colorRed)" />
          </AreaChart>
        ) : (
          <p className="muted-text">No stability data available.</p>
        )}
      </div>
    </div>
  );
}
