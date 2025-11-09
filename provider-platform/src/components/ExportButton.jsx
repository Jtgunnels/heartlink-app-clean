// ---------------------------------------------------------------------------
// HeartLink Provider Platform – ExportButton (Silver Tier, Live Backend)
// ---------------------------------------------------------------------------

import React, { useState } from "react";
import axios from "axios";
import "./ExportButton.css";

export default function ExportButton({ providerID }) {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState("csv");
  const [message, setMessage] = useState("");

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Determine providerID (prop takes precedence, then storage)
      const provider =
        providerID || localStorage.getItem("providerId") || sessionStorage.getItem("providerId");
      if (!provider) throw new Error("No providerId available for export");

      // ✅ Live backend export call
      const response = await axios.get(
        `http://localhost:5050/api/export?providerID=${encodeURIComponent(provider)}&type=${exportType}`,
        { responseType: "blob" }
      );

      // ✅ Determine correct file extension & name
      const fileExtension = exportType === "csv" ? "csv" : "pdf";
      const filename = `HeartLink_Report_${providerID}.${fileExtension}`;

      // ✅ Trigger browser download
      const blob = new Blob([response.data], {
        type:
          exportType === "csv"
            ? "text/csv;charset=utf-8;"
            : "application/pdf",
      });
      const link = document.createElement("a");
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage(`✅ ${exportType.toUpperCase()} file downloaded successfully.`);
    } catch (err) {
      console.error("❌ Export failed:", err);
      setMessage("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-container">
      <select
        value={exportType}
        onChange={(e) => setExportType(e.target.value)}
        className="export-select"
      >
        <option value="csv">Export as CSV</option>
        <option value="pdf">Export as PDF</option>
      </select>

      <button
        onClick={handleExport}
        disabled={loading}
        className="export-button"
      >
        {loading ? "Generating..." : "⬇ Export Report"}
      </button>

      {message && <p className="export-message">{message}</p>}
    </div>
  );
}
