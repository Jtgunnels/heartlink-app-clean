// DashboardPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import EnrollmentOverview from "../components/reports/EnrollmentOverview.jsx";
import ExpandedPatientSection from "../components/dashboard/ExpandedPatientSection.jsx";
import { getPatientsList, getPatientSnapshotData } from "../utils/fetchReportData";
import { db } from "../utils/firebaseConfig.js";
import { collection, getDocs } from "firebase/firestore";

const STATUS_KEYS = [
  "Stable",
  "Minor Change",
  "Review Recommended",
  "Needs Immediate Review",
];

const severityRank = (category = "") => {
  const normalized = String(category || "").toLowerCase();
  if (normalized.includes("needs immediate") || normalized.includes("red")) return 0;
  if (normalized.includes("review recommended") || normalized.includes("orange")) return 1;
  if (normalized.includes("minor") || normalized.includes("yellow")) return 2;
  return 3;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [criticalSnapshots, setCriticalSnapshots] = useState([]);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [detailMap, setDetailMap] = useState(new Map());
  const [categoryCounts, setCategoryCounts] = useState(
    STATUS_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingSnapshots(true);
      try {
        const allPatients = await getPatientsList();
        if (cancelled) return;
        
        // 🔹 Fetch check-in data from Firestore and merge into patients
 const providerId =
   localStorage.getItem("providerId") || sessionStorage.getItem("providerId");
 if (!providerId) throw new Error("No providerId in storage");
 const checkinSnap = await getDocs(
   collection(db, `providers/${providerId}/checkins`)
 );
const checkins = Array.isArray(checkinSnap.docs)
  ? checkinSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  : [];


// 🔹 Map the most recent check-in per patient to their snapshot
const latestByPatient = {};
for (const entry of checkins) {
  const id = entry.patientId;
  if (!id) continue;
  const current = latestByPatient[id];
  if (!current || (entry.timestamp?.seconds ?? 0) > (current.timestamp?.seconds ?? 0)) {
    latestByPatient[id] = entry;
  }
}

// 🔹 Merge the latest check-in details into your patient records
const mergedPatients = (allPatients || []).map((p) => {
  const checkin = latestByPatient[p.id];
  if (!checkin) return p;
  return {
    ...p,
    lastCheckIn:
      checkin.timestamp?.toDate?.().toISOString?.() ||
      new Date(checkin.timestamp?.seconds * 1000).toISOString?.(),
    aseCategory:
      p.aseCategory ||
      checkin.category ||
      checkin.aseCategory ||
      "Unknown",
    sobLevel: checkin.sobLevel ?? checkin.sob ?? p.sobLevel,
    edemaLevel: checkin.edemaLevel ?? checkin.edema ?? p.edemaLevel,
    fatigueLevel: checkin.fatigueLevel ?? checkin.fatigue ?? p.fatigueLevel,
  };
});

        const activePatients = (mergedPatients || []).filter((patient) => {
          const status = String(patient?.status || "").toLowerCase();
          return status === "active";
        });

        const counts = STATUS_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
        activePatients.forEach((patient) => {
          const category = patient?.aseCategory;
          if (counts[category] !== undefined) counts[category] += 1;
        });
        setCategoryCounts(counts);
        const lookup = new Map(activePatients.map((patient) => [patient.id, patient]));
        setDetailMap(lookup);

        const escalated = activePatients.filter((patient) => {
          const ase = String(patient?.aseCategory || "").toLowerCase();
          return (
            ase.includes("needs immediate") ||
            ase.includes("review recommended") ||
            ase.includes("red") ||
            ase.includes("orange")
          );
        });

        const prioritized =
          escalated.length > 0
            ? escalated
            : [...activePatients].sort(
                (a, b) => severityRank(a?.aseCategory) - severityRank(b?.aseCategory)
              );

        const candidateIds = (escalated.length > 0 ? escalated : prioritized)
          .slice(0, 6)
          .map(({ id }) => id)
          .filter(Boolean);

        if (!candidateIds.length) {
          setSnapshots([]);
          setCriticalSnapshots([]);
          setUsingFallback(false);
          return;
        }

        const snapshotData = await getPatientSnapshotData(candidateIds, 30);
        if (cancelled) return;

        let resolvedSnapshots = [];

        if (Array.isArray(snapshotData) && snapshotData.length > 0) {
          // ✅ Normalize Firestore 'category' → UI 'aseCategory'
          resolvedSnapshots = snapshotData.map((snapshot) => ({
  ...snapshot,
  aseCategory:
    snapshot.aseCategory ||
    snapshot.category ||
    snapshot.aseStatus ||
    snapshot.statusCategory ||
    "Unknown",
  adherenceRate:
    typeof snapshot.adherence === "number"
      ? Math.round(snapshot.adherence)
      : snapshot.adherenceRate ?? null,
  lastCheckIn: snapshot.timestamp || snapshot.lastCheckIn || null,
  detail: lookup.get(snapshot.id) || {},
}));

          setUsingFallback(escalated.length === 0);
        } else {
          resolvedSnapshots = prioritized.slice(0, 6).map((patient) => ({
            id: patient.id,
            name:
              patient.name ||
              patient.displayName ||
              patient.patientName ||
              patient.code ||
              patient.patientCode ||
              patient.id,
            status: patient.status || "Unknown",
            aseCategory: patient.aseCategory || patient.aseStatus || "Unknown",
            adherenceRate:
              typeof patient.adherenceRate === "number"
                ? Number(patient.adherenceRate.toFixed(1))
                : null,
            wellnessIndex:
              typeof patient.wellnessIndex === "number"
                ? Number(patient.wellnessIndex.toFixed(2))
                : null,
            lastCheckIn:
              patient.lastCheckIn ||
              patient.updatedAt ||
              patient.createdAt ||
              null,
            reasonSummary: patient.reasonSummary || patient.summary || "",
            trend: [],
            detail: lookup.get(patient.id) || patient,
          }));
          setUsingFallback(true);
        }

        setSnapshots(resolvedSnapshots);
        setCriticalSnapshots(
          resolvedSnapshots.filter(
            (patient) => severityRank(patient?.aseCategory) <= 1
          )
        );
      } catch (err) {
        console.error("Dashboard snapshot fetch error", err);
        if (!cancelled) {
          setSnapshots([]);
          setCriticalSnapshots([]);
          setUsingFallback(false);
        }
      } finally {
        if (!cancelled) setLoadingSnapshots(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCards = useMemo(
    () => [
      { label: "Stable", value: categoryCounts["Stable"], color: "#45B8A1", text: "#0b3c33" },
      { label: "Minor Change", value: categoryCounts["Minor Change"], color: "#FFE58F", text: "#5e4500" },
      { label: "Review Recommended", value: categoryCounts["Review Recommended"], color: "#FDBA74", text: "#7a3200" },
      { label: "Needs Immediate Review", value: categoryCounts["Needs Immediate Review"], color: "#F26868", text: "#611010" },
    ],
    [categoryCounts]
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <header className="dashboard-hero">
          <h1>HeartLink Provider Dashboard</h1>
          <p>
            Monitor population wellness, engagement, and prioritize patients who need clinical review.
          </p>
        </header>

        <section className="enrollment-row">
          <EnrollmentOverview timeRange={30} />
        </section>

        <section className="category-card-row">
          {categoryCards.map((card) => (
            <div
              key={card.label}
              className="category-card"
              style={{
                background: card.color,
                color: card.text,
              }}
            >
              <span className="category-card-label">{card.label}</span>
              <span className="category-card-value">{card.value}</span>
            </div>
          ))}
        </section>

        <section className="snapshot-section">
          <div className="snapshot-section-header">
            <div>
              <h2>Patients Requiring Attention</h2>
              <p>Quick overview of your most critical patients today. Review orange and red ASE categories in one glance.</p>
            </div>
            {usingFallback && criticalSnapshots.length > 0 && (
              <span className="snapshot-note">
                No urgent alerts detected — showing highest-priority active patients instead.
              </span>
            )}
          </div>

            {loadingSnapshots ? (
              <div className="snapshot-grid empty-state">Loading patients…</div>
            ) : criticalSnapshots.length === 0 ? (
              <div className="snapshot-grid empty-state">
                No orange or red patients detected in the selected time window.
              </div>
            ) : (
              <div className="attention-table-wrapper">
                <table className="attention-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>ASE Category</th>
                      <th>Adherence</th>
                      <th>Wellness</th>
                      <th>Last Check-In</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                  {criticalSnapshots.map((patient) => {
                    const isExpandable = severityRank(patient.aseCategory) <= 1;
                    const isExpanded = expandedPatientId === patient.id;
                    return (
                      <React.Fragment key={patient.id}>
                        <tr
                          className={isExpandable ? "attention-row expandable" : "attention-row"}
                          onClick={() => {
                            if (!isExpandable) return;
                            setExpandedPatientId(isExpanded ? null : patient.id);
                          }}
                        >
                          <td>{patient.name || patient.id}</td>
                          <td>
                            <span
                              className={`ase-chip ${String(patient.aseCategory || "")
                                .toLowerCase()
                                .replace(/\s/g, "-")}`}
                            >
                              {patient.aseCategory || "Unknown"}
                            </span>
                          </td>
                          <td>
                            {typeof patient.adherenceRate === "number"
                              ? `${patient.adherenceRate.toFixed(1)}%`
                              : "—"}
                          </td>
                          <td>
                            {typeof patient.wellnessIndex === "number"
                              ? patient.wellnessIndex.toFixed(2)
                              : "—"}
                          </td>
                          <td>
                            {patient.lastCheckIn
                              ? new Date(patient.lastCheckIn).toLocaleString()
                              : "—"}
                          </td>
                          <td>{patient.status || "Unknown"}</td>
                        </tr>
                        {isExpanded && (
                          <tr className="expanded-row">
                            <td colSpan={6}>
                              <ExpandedPatientSection
                                patient={patient.detail || {}}
                                snapshot={patient}
                                onNavigate={() => navigate(`/patients/${patient.id}`)}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        <footer className="dashboard-footer">
          <p>
            HeartLink is a general wellness tool designed to support awareness of well-being and engagement. It does not
            diagnose, monitor, or treat any medical condition.
          </p>
        </footer>
      </div>
    </div>
  );
}
