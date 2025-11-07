import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection, query, where, onSnapshot, orderBy, limit, doc, onSnapshot as onDoc
} from "firebase/firestore";
import { db } from "../firebase/client";

// Map any algorithm category strings to UI buckets
const normalizeCategory = (cat) => {
  if (!cat) return "Unknown";
  const t = String(cat).toLowerCase();
  if (t === "green" || t === "stable") return "Stable";
  if (t === "yellow" || t.includes("minor")) return "AtRisk";            // Minor Change
  if (t === "orange" || t.includes("review")) return "AtRisk";           // Review Recommended
  if (t === "red" || t.includes("immediate")) return "Critical";         // Needs Immediate Review
  return "Unknown";
};

export function useDashboardData({ alertsLimit = 25 } = {}) {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  // Keep unsubscribe refs to cleanup safely on hot reloads
  const unsubRefs = useRef([]);

  useEffect(() => {
    setLoading(true);
    setErrors([]);

    const localUnsubs = [];

    // 1) Active patients (live)
    const patientsQ = query(
      collection(db, "patients"),
      where("status", "==", "Active")
    );
    localUnsubs.push(
      onSnapshot(
        patientsQ,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setPatients(docs);
          setLoading(false);
        },
        (err) => setErrors((e) => [...e, `patients: ${err.message}`])
      )
    );

    // 2) Alerts feed (most recent first)
    const alertsQ = query(
      collection(db, "alerts"),
      orderBy("createdAt", "desc"),
      limit(alertsLimit)
    );
    localUnsubs.push(
      onSnapshot(
        alertsQ,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAlerts(docs);
        },
        (err) => setErrors((e) => [...e, `alerts: ${err.message}`])
      )
    );

    // 3) Optional server-generated summary (if you add a scheduled job)
    const summaryDocRef = doc(db, "summary", "daily");
    localUnsubs.push(
      onDoc(
        summaryDocRef,
        (ds) => setSummary(ds.exists() ? { id: ds.id, ...ds.data() } : null),
        (err) => setErrors((e) => [...e, `summary: ${err.message}`])
      )
    );

    unsubRefs.current = localUnsubs;
    return () => {
      unsubRefs.current.forEach((u) => u && u());
      unsubRefs.current = [];
    };
  }, [alertsLimit]);

  // ---- Derived metrics (memoized) ----
  const metrics = useMemo(() => {
    // If a server-side summary exists, prefer it (fast path).
    if (summary?.totals) {
      return {
        totalActive: summary.totals.totalActive ?? 0,
        stableCount: summary.totals.stable ?? 0,
        atRiskCount: summary.totals.atRisk ?? 0,
        criticalCount: summary.totals.critical ?? 0,
        wellnessIndex: summary.totals.avgSsi ?? 0,
      };
    }

    // Client-side fallback aggregation from patients[]
    let total = 0, stable = 0, atRisk = 0, critical = 0;
    let ssiSum = 0, ssiCount = 0;

    for (const p of patients) {
      total += 1;
      const cat = normalizeCategory(p?.latestScore?.category);
      if (cat === "Stable") stable += 1;
      else if (cat === "AtRisk") atRisk += 1;
      else if (cat === "Critical") critical += 1;

      const ssi = Number(p?.latestScore?.ssi);
      if (Number.isFinite(ssi)) {
        ssiSum += ssi;
        ssiCount += 1;
      }
    }

    const avgSsi = ssiCount ? Number((ssiSum / ssiCount).toFixed(2)) : 0;

    return {
      totalActive: total,
      stableCount: stable,
      atRiskCount: atRisk,
      criticalCount: critical,
      wellnessIndex: avgSsi,
    };
  }, [patients, summary]);

  // Convenience groupings for UI
  const grouped = useMemo(() => {
    const stable = [];
    const atRisk = [];
    const critical = [];

    for (const p of patients) {
      const cat = normalizeCategory(p?.latestScore?.category);
      if (cat === "Stable") stable.push(p);
      else if (cat === "AtRisk") atRisk.push(p);
      else if (cat === "Critical") critical.push(p);
    }

    return { stable, atRisk, critical };
  }, [patients]);

  return {
    loading,
    errors,
    patients,
    alerts,
    summary,     // server-side (if you later add the scheduled job)
    metrics,     // totalActive, stableCount, atRiskCount, criticalCount, wellnessIndex
    grouped,     // { stable[], atRisk[], critical[] }
  };
}
