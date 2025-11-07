// ReportTableShell.jsx — streamlined (no duplicate titles, centered heading)
import React from "react";

export default function ReportTableShell({
  title,
  description,
  columns = [],
  rows = [],
  onExportData,
}) {
  const hasData =
    Array.isArray(rows) &&
    rows.length > 0 &&
    rows.some((r) =>
      Object.values(r).some((v) => v !== null && v !== undefined && v !== "—")
    );

  return (
    <div className="report-table-shell">
      {/* Removed internal title (handled by parent component) */}
      {description && (
        <p
          className="table-desc"
          style={{
            textAlign: "center",
            fontSize: "0.9rem",
            marginBottom: "0.75rem",
            color: "#555",
          }}
        >
          {description}
        </p>
      )}

      {hasData ? (
        <div className="table-wrapper">
          <table className="hl-table">
            <caption className="sr-only">{title || "Report Data Table"}</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {typeof r[c.key] === "number"
                        ? Number(r[c.key]).toLocaleString(undefined, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                        : r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted-text" style={{ textAlign: "center" }}>
          No data available.
        </p>
      )}

      {hasData && onExportData && (
        <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
          <button className="hl-btn export" onClick={() => onExportData(rows)}>
            Export CSV
          </button>
        </div>
      )}
    </div>
  );
}
