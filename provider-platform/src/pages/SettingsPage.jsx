import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./SettingsPage.css";
import { exportAsCSV } from "../utils/reportExports";
import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthProvider";

const TABS = [
  { key: "agency", label: "Agency Info" },
  { key: "team", label: "Team Management" },
  { key: "exports", label: "Export History" },
  { key: "status", label: "System Status" },
];

const PALETTE = [
  { name: "Deep Cerulean", hex: "#19588F" },
  { name: "Seafoam Green", hex: "#45B8A1" },
  { name: "Coral", hex: "#F26868" },
  { name: "Ivory White", hex: "#FFFBF7" },
];

const PROVIDER_ID = "demoProvider";

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryTab = (searchParams.get("tab") || "").toLowerCase();
  const initialTab = TABS.some((tab) => tab.key === queryTab) ? queryTab : "agency";

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const param = (searchParams.get("tab") || "").toLowerCase();
    if (param && param !== activeTab && TABS.some((tab) => tab.key === param)) {
      setActiveTab(param);
    }
    if (!param && activeTab !== "agency") {
      setActiveTab(activeTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = useCallback(
    (key) => {
      if (key === activeTab) return;
      setActiveTab(key);
      if (key === "agency") {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: key }, { replace: true });
      }
    },
    [activeTab, setSearchParams]
  );

  const [agencyName, setAgencyName] = useState("HeartLink Demo Agency");
  const [agencyDisclaimer, setAgencyDisclaimer] = useState(
    "HeartLink is a general wellness tool designed to support awareness of well-being and engagement."
  );
  const [logoName, setLogoName] = useState("");

  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const providerRef = collection(db, "providers", PROVIDER_ID, "users");
        let snap = await getDocs(providerRef);

        if (snap.empty) {
          const fallbackRef = collection(db, "users");
          const fallbackSnap = await getDocs(fallbackRef);
          if (!cancelled && !fallbackSnap.empty) {
            snap = fallbackSnap;
          }
        }

        if (cancelled) return;

        const rows = snap.docs.map((doc) => {
          const data = doc.data() || {};
          const derivedStatus =
            data.status ||
            (data.active === false ? "Inactive" : "Active");
          return {
            id: doc.id,
            name: data.name || data.displayName || "Unnamed User",
            role: data.role || "Viewer",
            email: data.email || data.contactEmail || "—",
            status: derivedStatus,
          };
        });

        setTeam(rows);
      } catch (err) {
        console.error("SettingsPage team fetch error", err);
        if (!cancelled) {
          setTeamError("Unable to load team members (read-only).");
        }
      } finally {
        if (!cancelled) setTeamLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const exportHistory = useMemo(
    () => [
      {
        id: "exp-003",
        type: "Population Wellness Summary",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        filename: "HeartLink_Population_Wellness_Mar.csv",
        user: "Jamie Davis",
      },
      {
        id: "exp-002",
        type: "Engagement Trend Report",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        filename: "HeartLink_Engagement_Trend.csv",
        user: "Alex Morgan",
      },
      {
        id: "exp-001",
        type: "Clinical Review Audit",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        filename: "HeartLink_Clinical_Audit.pdf",
        user: "Jamie Davis",
      },
    ],
    []
  );

  const exportHistoryRows = useMemo(
    () =>
      exportHistory.map((row) => ({
        "Report Type": row.type,
        "Date / Time": new Date(row.timestamp).toLocaleString(),
        "File Name": row.filename,
        User: row.user,
      })),
    [exportHistory]
  );

  const handleExportHistoryDownload = useCallback(() => {
    if (!exportHistoryRows.length) return;
    exportAsCSV(exportHistoryRows, "HeartLink_Export_History.csv");
  }, [exportHistoryRows]);

  const [systemStatus, setSystemStatus] = useState(() => ({
    mode:
      import.meta.env?.VITE_FIREBASE_MODE ||
      (window.location.hostname === "localhost" ? "emulator" : "production"),
    lastSync: new Date().toISOString(),
    apiHealthy: null,
    version: import.meta.env?.VITE_APP_VERSION || "v1.0.0",
  }));

  const refreshSystemStatus = useCallback(async () => {
    const healthEndpoint =
      import.meta.env?.VITE_API_HEALTH_URL || "/healthz";
    let apiHealthy = null;

    try {
      const response = await fetch(healthEndpoint, { method: "GET" });
      apiHealthy = response.ok;
    } catch (err) {
      console.warn("SettingsPage health check failed", err);
      apiHealthy = false;
    }

    setSystemStatus((prev) => ({
      ...prev,
      apiHealthy,
      lastSync: new Date().toISOString(),
    }));
  }, []);

  useEffect(() => {
    refreshSystemStatus();
  }, [refreshSystemStatus]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("Logout from settings failed", err);
    } finally {
      navigate("/login", { replace: true });
    }
  }, [logout, navigate]);

  const renderAgencyInfo = () => (
    <div className="settings-panel">
      <div className="settings-field">
        <label htmlFor="agency-name">Agency Name</label>
        <input
          id="agency-name"
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          aria-label="Agency name"
        />
      </div>

      <div className="settings-field">
        <label htmlFor="logo-upload">Logo Upload</label>
        <div className="file-input">
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setLogoName(file ? file.name : "");
            }}
          />
          {logoName ? <span className="file-name">{logoName}</span> : <span className="file-name muted">Optional</span>}
        </div>
      </div>

      <div className="palette">
        <p className="palette-label">Primary Palette</p>
        <div className="palette-swatches">
          {PALETTE.map((swatch) => (
            <div key={swatch.hex} className="palette-swatch">
              <span
                className="swatch-color"
                style={{ backgroundColor: swatch.hex }}
              />
              <div>
                <p>{swatch.name}</p>
                <span>{swatch.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <label htmlFor="disclaimer">Disclaimer</label>
        <textarea
          id="disclaimer"
          value={agencyDisclaimer}
          onChange={(e) => setAgencyDisclaimer(e.target.value)}
          rows={4}
        />
      </div>

      <div className="actions">
        <button type="button" className="hl-btn" disabled>
          Save Changes (Read-only)
        </button>
      </div>
    </div>
  );

  const renderTeamManagement = () => (
    <div className="settings-panel">
      <div className="panel-header">
        <h3>Team Directory</h3>
        <button type="button" className="hl-btn small" disabled>
          + Add Member
        </button>
      </div>

      {teamLoading ? (
        <div className="panel-state">Loading team members…</div>
      ) : teamError ? (
        <div className="panel-error" role="alert">
          {teamError}
        </div>
      ) : team.length === 0 ? (
        <div className="panel-state">No team members available.</div>
      ) : (
        <div className="table-wrapper">
          <table className="settings-table" aria-label="Team members">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>
                    <span className={`role-pill role-${member.role.toLowerCase().replace(/\s+/g, "-")}`}>
                      {member.role}
                    </span>
                  </td>
                  <td>{member.email}</td>
                  <td>{member.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderExportHistory = () => (
    <div className="settings-panel">
      <div className="panel-header">
        <h3>Recent Exports</h3>
        <div className="panel-actions">
          <button type="button" className="hl-btn small" onClick={handleExportHistoryDownload}>
            Export to CSV
          </button>
        </div>
      </div>

      {exportHistory.length === 0 ? (
        <div className="panel-state">No exports generated yet.</div>
      ) : (
        <div className="table-wrapper">
          <table className="settings-table" aria-label="Export history">
            <thead>
              <tr>
                <th scope="col">Report Type</th>
                <th scope="col">Date / Time</th>
                <th scope="col">File Name</th>
                <th scope="col">User</th>
              </tr>
            </thead>
            <tbody>
              {exportHistory.map((item) => (
                <tr key={item.id}>
                  <td>{item.type}</td>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                  <td>{item.filename}</td>
                  <td>{item.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderSystemStatus = () => (
    <div className="settings-panel">
      <div className="panel-header">
        <h3>Environment Health</h3>
        <div className="panel-actions">
          <button type="button" className="hl-btn small ghost" onClick={handleLogout}>
            Logout
          </button>
          <button type="button" className="hl-btn small" onClick={refreshSystemStatus}>
            Refresh
          </button>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <p className="status-label">Firestore Mode</p>
          <p className="status-value">
            {String(systemStatus.mode || "production").toUpperCase()}
          </p>
        </div>
        <div className="status-card">
          <p className="status-label">Last Sync</p>
          <p className="status-value">
            {new Date(systemStatus.lastSync).toLocaleString()}
          </p>
        </div>
        <div className="status-card">
          <p className="status-label">API Health</p>
          <p className="status-value">
            {systemStatus.apiHealthy == null
              ? "Checking…"
              : systemStatus.apiHealthy
              ? "✅ Healthy"
              : "⚠️ Unavailable"}
          </p>
        </div>
        <div className="status-card">
          <p className="status-label">App Version</p>
          <p className="status-value">{systemStatus.version}</p>
        </div>
      </div>

      <div className="status-note">
        Emulator endpoints default to `localhost` in development. All checks are read-only.
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "team":
        return renderTeamManagement();
      case "exports":
        return renderExportHistory();
      case "status":
        return renderSystemStatus();
      case "agency":
      default:
        return renderAgencyInfo();
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <h1>HeartLink Settings</h1>
        <p>
          Manage your agency’s configuration, users, and export activity while maintaining secure access.
        </p>
      </header>

      <div className="settings-inner">
        <nav className="settings-tabs" role="tablist" aria-label="Settings sections">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-panel-${tab.key}`}
                id={`settings-tab-${tab.key}`}
                className={`settings-tab ${isActive ? "active" : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <section
          id={`settings-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeTab}`}
          className="settings-content"
        >
          {renderContent()}
        </section>

        <footer className="settings-footer">
          HeartLink is a general wellness tool designed to support awareness of well-being and engagement. It does not
          diagnose, monitor, or treat any medical condition.
        </footer>
      </div>
    </div>
  );
}
