// PatientsPage.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./PatientsPage.css";
import {
  getPatientsList,
  getPatientSnapshots,
} from "../utils/fetchReportData";
import PatientSnapshotCard from "../components/patients/PatientSnapshotCard";
import PatientDetailDrawer from "../components/patients/PatientDetailDrawer.jsx";

const ASE_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Stable", value: "Stable" },
  { label: "Minor Change", value: "Minor Change" },
  { label: "Review Recommended", value: "Review Recommended" },
  { label: "Needs Immediate Review", value: "Needs Immediate Review" },
];

export default function PatientsPage() {
  const navigate = useNavigate();
  const { id: routePatientId } = useParams();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [aseFilter, setAseFilter] = useState("ALL");

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const hydrateSnapshots = useCallback((snapshots, sourceMeta) => {
    const metaMap = new Map(
      sourceMeta.map((patient) => [patient.id, patient])
    );
    return (snapshots || []).map((snapshot) => {
      const meta = metaMap.get(snapshot.id) || {};
      const name =
        snapshot.name ||
        meta.name ||
        meta.displayName ||
        meta.patientName ||
        meta.patientCode ||
        snapshot.id;
      return {
        ...snapshot,
        name,
        patientCode: meta.patientCode || snapshot.patientCode || snapshot.id,
        status: meta.status || snapshot.status || "Active",
        // ✅ Normalize Firestore 'category' → UI 'aseCategory'
        aseCategory:
          snapshot.aseCategory ||
          snapshot.category || // <-- new check-in field
          meta.aseCategory ||
          "Stable",
      };
    });
  }, []);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getPatientsList();
      const activeMeta = (list || [])
        .filter(
          (patient) =>
            String(patient?.status || "").trim().toLowerCase() === "active"
        )
        .map((patient) => ({
          id: patient.id,
          patientCode: patient.patientCode || patient.code || patient.id,
          status: patient.status || "Active",
          name:
            patient.name ||
            patient.displayName ||
            patient.patientName ||
            patient.patientCode ||
            patient.id,
          aseCategory: patient.aseCategory || patient.aseStatus || null,
        }));

      const ids = activeMeta.map((patient) => patient.id).filter(Boolean);

      if (!ids.length) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const snapshots = await getPatientSnapshots(ids, 30);
      setPatients(hydrateSnapshots(snapshots, activeMeta));
    } catch (err) {
      console.error("PatientsPage snapshot fetch error", err);
      setError(err?.message || "Unable to load patients.");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [hydrateSnapshots]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesFilter =
        aseFilter === "ALL" ? true : patient.aseCategory === aseFilter;

      const matchesSearch = searchQuery
        ? [patient.name, patient.patientCode]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(searchQuery)
            )
        : true;

      return matchesFilter && matchesSearch;
    });
  }, [patients, aseFilter, searchQuery]);

  const selectedPatient = useMemo(() => {
    if (!routePatientId) return null;
    return patients.find((patient) => patient.id === routePatientId) || null;
  }, [patients, routePatientId]);

  const handleSelectPatient = useCallback(
    (patient) => {
      if (!patient?.id) return;
      navigate(`/patients/${patient.id}`);
    },
    [navigate]
  );

  const handleCloseDetail = useCallback(() => {
    navigate("/patients", { replace: true });
  }, [navigate]);

  return (
    <div className="patients-page">
      <div className="patients-inner">
        <header className="patients-header">
          <div>
            <h1>Active Patient Directory</h1>
            <p>
              All active patients in your program, displayed by current stability category.
            </p>
          </div>
          <span className="patients-badge">
            Active Patients &middot; {patients.length}
          </span>
        </header>

        <section className="patients-controls" aria-label="Patient search and filters">
          <div className="search-field">
            <label htmlFor="patient-search" className="visually-hidden">
              Search patients by name or ID
            </label>
            <input
              id="patient-search"
              type="search"
              placeholder="Search by name or ID"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="filter-group" role="tablist" aria-label="Filter patients by ASE category">
            {ASE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="tab"
                className={`filter-pill ${aseFilter === filter.value ? "active" : ""}`}
                aria-selected={aseFilter === filter.value}
                onClick={() => setAseFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="hl-btn ghost small"
            onClick={() => {
              setAseFilter("ALL");
              setSearchInput("");
            }}
          >
            Clear Filters
          </button>
        </section>

        <section className="patients-directory" aria-label="Active patients">
          {loading ? (
            <div className="patients-state">Loading patients…</div>
          ) : error ? (
            <div className="patients-error" role="alert">
              {error}
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="patients-state">
              No active patients found. All currently discharged or inactive.
            </div>
          ) : (
            <div className="patients-grid">
              {filteredPatients.map((patient) => (
                <PatientSnapshotCard
                  key={patient.id}
                  patient={patient}
                  context="directory"
                  showTrend
                  showReason
                  onSelect={() => handleSelectPatient(patient)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="patients-footer">
          HeartLink is a general wellness tool designed to support awareness of well-being and engagement. It does not
          diagnose, monitor, or treat any medical condition.
        </footer>
      </div>

      <PatientDetailDrawer
        patient={selectedPatient}
        isOpen={Boolean(selectedPatient)}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
