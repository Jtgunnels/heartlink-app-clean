import React, { useEffect, useState, useMemo } from "react";
import "../styles/dashboard.css";
import { db } from "../config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ChevronUp, ChevronDown } from "lucide-react";
import heartlinkLogo from "/heartlink_full_light.png";

export default function DashboardPage() {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState("All");
  const [sortField, setSortField] = useState("daysSinceCheckIn");
  const [sortOrder, setSortOrder] = useState("asc");

  const providerID = "demoProvider"; // replace with auth providerID later

  /* ---------- Fetch from Firestore ---------- */
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const snap = await getDocs(
          collection(db, "providers", providerID, "patients")
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPatients(data);
      } catch (e) {
        console.error("Failed to load patients:", e);
      }
    };
    fetchPatients();
  }, [providerID]);

  /* ---------- Dynamic ASE counts ---------- */
  const counts = useMemo(() => {
    const byCat = {
      Stable: 0,
      "Minor Change": 0,
      "Review Recommended": 0,
      "Needs Immediate Review": 0,
    };
    patients.forEach((p) => {
      if (p.aseCategory && byCat[p.aseCategory] !== undefined) {
        byCat[p.aseCategory] += 1;
      }
    });
    return byCat;
  }, [patients]);

  /* ---------- Sorting & Filtering ---------- */
  const filteredPatients = useMemo(() => {
    let list = [...patients];

    if (filter !== "All") list = list.filter((p) => p.aseCategory === filter);

    list.sort((a, b) => {
      if (sortField === "code") {
        return sortOrder === "asc"
          ? a.code.localeCompare(b.code)
          : b.code.localeCompare(a.code);
      }
      if (sortField === "daysSinceCheckIn") {
        return sortOrder === "asc"
          ? a.daysSinceCheckIn - b.daysSinceCheckIn
          : b.daysSinceCheckIn - a.daysSinceCheckIn;
      }
      if (sortField === "clinician") {
        return sortOrder === "asc"
          ? a.clinician.localeCompare(b.clinician)
          : b.clinician.localeCompare(a.clinician);
      }
      return 0;
    });

    return list;
  }, [patients, filter, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  
  /* ---------- Color map for ASE ---------- */
  const aseColor = {
    Stable: "#45B8A1",
    "Minor Change": "#F6E27F",
    "Review Recommended": "#F8A94D",
    "Needs Immediate Review": "#F26868",
  };

   return (
    <div className="dashboard-container">
      {/* 🔹 Top Navigation Bar */}
      <nav className="navbar">
  <div className="navbar-content">
    <div className="nav-left">
      <img src={heartlinkLogo} alt="HeartLink Logo" className="nav-logo" />
    </div>

    <div className="nav-center">
      <a href="#" className="nav-link active">Summary</a>
      <a href="#" className="nav-link">Patients</a>
      <a href="#" className="nav-link">Progress</a>
      <a href="#" className="nav-link">Settings</a>
    </div>

    <div className="nav-right">
      <span className="user-name">Dr. Gunnels ▼</span>
    </div>
  </div>
</nav>

      {/* 🔹 Main Title Section */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">HeartLink Clinical Summary</h1>
        <p className="dashboard-subheader">
          Review enrolled patients by code (no PHI)
        </p>
      </header>

      {/* Summary cards */}
      <div className="summary-cards">
        {Object.entries({
          Stable: "No significant changes",
          "Minor Change": "Mild changes noted",
          "Review Recommended": "Moderate changes noted",
          "Needs Immediate Review": "Significant changes noted",
        }).map(([key, subtitle]) => (
          <div
            key={key}
            className={`summary-card clickable ${
              filter === key ? "active-filter" : ""
            }`}
            style={{ background: `${aseColor[key]}20` }} /* translucent bg */
            onClick={() => setFilter(filter === key ? "All" : key)}
          >
            <h3>{key}</h3>
            <div className="count">{counts[key] || 0}</div>
            <span>{subtitle}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="Search by patient or clinician..."
          className="search-box"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-dropdown"
        >
          <option value="All">All ASE Categories</option>
          <option value="Stable">Stable</option>
          <option value="Minor Change">Minor Change</option>
          <option value="Review Recommended">Review Recommended</option>
          <option value="Needs Immediate Review">Needs Immediate Review</option>
        </select>
        {filter !== "All" && (
          <button className="reset-filter-btn" onClick={() => setFilter("All")}>
            Show All Patients
          </button>
        )}
      </div>

      {/* Table */}
      <table className="patient-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort("code")}>
              Patient Code {renderSortIcon("code")}
            </th>
            <th onClick={() => toggleSort("daysSinceCheckIn")}>
              Days Since Check-In {renderSortIcon("daysSinceCheckIn")}
            </th>
            <th onClick={() => toggleSort("clinician")}>
              Assigned Clinician {renderSortIcon("clinician")}
            </th>
            <th>ASE Category</th>
          </tr>
        </thead>
        <tbody>
          {filteredPatients.map((p) => (
            <tr key={p.id}>
              <td>
                <span
                  className="dot"
                  style={{
                    backgroundColor: aseColor[p.aseCategory] || "#ccc",
                  }}
                ></span>
                {p.code}
              </td>
              <td>{p.daysSinceCheckIn ?? "—"}</td>
              <td>{p.clinician ?? "—"}</td>
              <td>{p.aseCategory ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="dashboard-footer">
        HeartLink Clinical Summary is a general wellness tool for organizing
        patient-reported data and is not a diagnostic device.
      </footer>
    </div>
  );
}
