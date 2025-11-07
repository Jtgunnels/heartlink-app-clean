// EnrollmentSummaryReport.jsx — Solid pie snapshot visualization (no slice labels)
import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import ReportTableShell from "./ReportTableShell";
import { getActiveCompositionData as getEnrollmentData } from "../../utils/fetchReportData";
import { useContainerWidth } from "../../hooks/useContainerWidth";


export default function EnrollmentSummaryReport({
  onExportData,
  rows: rowsProp,
  hideTable = true,
}) {
  const [rows, setRows] = useState(Array.isArray(rowsProp) ? rowsProp : []);

  useEffect(() => {
    if (Array.isArray(rowsProp)) {
      setRows(rowsProp);
      return;
    }
    (async () => {
      setRows(await getEnrollmentData());
    })();
  }, [rowsProp]);

  // Aggregate snapshot data
  const snapshotData = useMemo(() => {
    if (!rows || !rows.length) return [];
    const totals = { Active: 0, New: 0, Discharged: 0 };
    rows.forEach((r) => {
      const label = (r.label || "").toLowerCase();
      if (label.includes("active")) totals.Active += Number(r.value || 0);
      if (label.includes("new")) totals.New += Number(r.value || 0);
      if (label.includes("discharged")) totals.Discharged += Number(r.value || 0);
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals).map(([k, v]) => ({
      name: k,
      value: total > 0 ? Number(((v / total) * 100).toFixed(1)) : 0,
      count: v,
    }));
  }, [rows]);

  const COLORS = ["#19588F", "#45B8A1", "#F26868"];

  const columns = [
    { key: "name", label: "Category" },
    { key: "count", label: "Count" },
    { key: "value", label: "Percentage (%)" },
  ];

  const { ref: containerRef, width } = useContainerWidth(320);

  return (
    <div>
      {!hideTable && (
        <>
          <h3 className="report-title">Enrollment Summary</h3>
          <p className="chart-desc">
            Snapshot of the current program population, showing the proportion of active,
            new, and discharged patients.
          </p>
        </>
      )}

      {!hideTable && (
        <ReportTableShell columns={columns} rows={snapshotData} onExportData={onExportData} />
      )}

      {snapshotData.length > 0 ? (
        <div className="chart-shell" ref={containerRef}>
          <PieChart width={width} height={300}>
            <Pie
              data={snapshotData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              labelLine={false}
              isAnimationActive
            >
              {snapshotData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => [`${value}%`, props.payload.name]}
              cursor={{ fill: "rgba(0,0,0,0.05)" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: 13, marginTop: 8 }}
            />
          </PieChart>
        </div>
      ) : (
        <p className="muted-text">No enrollment data available.</p>
      )}
    </div>
  );
}
