import React, { useEffect, useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ReportTableShell from "./ReportTableShell";
import { getFourBandStabilityTrend } from "../../utils/fetchReportData";
import { useContainerWidth } from "../../hooks/useContainerWidth";

export default function PatientStabilityReport({
  onExportData,
  rowsProp,
  hideTable = false,
}) {
  const [rows, setRows] = useState([]);
  const { ref: containerRef, width } = useContainerWidth(320);

  const normalizeRows = (input = []) =>
    Array.isArray(input)
      ? input
          .map((r) => ({
            date: r?.date || null,
            green: Number(r?.green ?? 0),
            yellow: Number(r?.yellow ?? 0),
            orange: Number(r?.orange ?? 0),
            red: Number(r?.red ?? 0),
          }))
          .filter(Boolean)
      : [];

  useEffect(() => {
    if (Array.isArray(rowsProp) && rowsProp.length > 0) {
      setRows(normalizeRows(rowsProp));
    } else {
      (async () => {
        const fetched = await getFourBandStabilityTrend();
        setRows(normalizeRows(fetched));
      })();
    }
  }, [rowsProp]);

  const data = useMemo(() => rows, [rows]);
  const columns = [
    { key: "date", label: "Date" },
    { key: "green", label: "Stable (Green)" },
    { key: "yellow", label: "Review Recommended (Yellow)" },
    { key: "orange", label: "Minor Change (Orange)" },
    { key: "red", label: "Immediate Review (Red)" },
  ];

  return (
    <div>
      {!hideTable && (
        <ReportTableShell columns={columns} rows={rows} onExportData={onExportData} />
      )}
      <div className="chart-shell" ref={containerRef}>
        {data.length > 0 ? (
          <AreaChart
            width={width}
            height={280}
            data={data}
            stackOffset="expand"
            margin={{ top: 12, right: 20, left: 0, bottom: 40 }}
          >
            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} height={60} />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
            <Area type="monotone" dataKey="green" stackId="1" stroke="#45B8A1" fill="#45B8A1" />
            <Area type="monotone" dataKey="yellow" stackId="1" stroke="#FFD166" fill="#FFD166" />
            <Area type="monotone" dataKey="orange" stackId="1" stroke="#F6AE2D" fill="#F6AE2D" />
            <Area type="monotone" dataKey="red" stackId="1" stroke="#F26868" fill="#F26868" />
          </AreaChart>
        ) : (
          <p className="muted-text">No stability data available.</p>
        )}
      </div>
    </div>
  );
}
