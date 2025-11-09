/* eslint-disable no-console */
import {
  getDocs,
  query,
  collection,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/** Resolve provider-scoped collection */
function providerCol(name) {
  const providerId =
    sessionStorage.getItem("providerId") || localStorage.getItem("providerId");
  if (!providerId) throw new Error("No providerId in storage");
  return collection(db, `providers/${providerId}/${name}`);
}


/** Utility: safely convert Firestore Timestamp or date string → Date */
function toDate(input) {
  if (!input) return null;
  if (input.toDate) return input.toDate();
  if (typeof input === "object" && input.seconds)
    return new Date(input.seconds * 1000);
  return new Date(input);
}

/** Utility: date key (YYYY-MM-DD) */
function dateKey(date) {
  const d = toDate(date);
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Map ASE category → stability color */
const catMap = {
  Stable: "green",
  "Minor Change": "yellow",
  "Review Recommended": "orange",
  "Needs Immediate Review": "red",
};

/** ========== Core Fetch Functions ========== */

/** Read all patients (provider scoped) */
export async function getPatientsList() {
  try {
    const q = query(providerCol("patients"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error fetching patient list:", err);
    return [];
  }
}

/** Read check-ins for a patient (provider scoped) */
export async function readPatientCheckins(patientId) {
  try {
    // primary: top-level provider checkins
    const q1 = query(
      providerCol("checkins"),
      where("patientId", "==", patientId),
      orderBy("timestamp", "desc")
    );
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return snap1.docs.map((d) => ({ id: d.id, ...d.data() }));

    // fallback: legacy nested collection under patients/{id}/checkins within the same provider
    const q2 = query(
      collection(
        db,
        `${providerCol("patients").path}/${patientId}/checkins`
      ),
      orderBy("timestamp", "desc")
    );
    const snap2 = await getDocs(q2);
    return snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error reading patient check-ins:", err);
    return [];
  }
}

/** ========== Analytics Functions ========== */

/** Patient Overview (aggregates check-ins for a single patient) */
export async function getPatientOverview(patientId) {
  try {
    const checkins = await readPatientCheckins(patientId);
    const trend = [];

    for (const c of checkins) {
      const d = toDate(c.timestamp || c.date);
      if (!d) continue;
      const cat = c.aseCategory ?? c.category;
      const mapped = catMap[cat] || "gray";
      trend.push({
        date: d,
        aseCategory: cat,
        mapped,
        adherence: c.adherence ?? null,
        wellnessIndex: c.ssi ?? c.wellnessIndex ?? null,
      });
    }

    return trend;
  } catch (err) {
    console.error("Error generating patient overview:", err);
    return [];
  }
}

/** Snapshot of multiple patients (used on dashboard) */
export async function getPatientSnapshotData(patientIds = [], days = 30) {
  try {
    const allSnapshots = [];
    for (const id of patientIds) {
      const allCheckins = await readPatientCheckins(id);

      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - days);

      const windowCheckins = allCheckins.filter((entry) => {
        const d = toDate(entry.timestamp || entry.date);
        return d && d >= cutoff;
      });

      const latest =
        [...windowCheckins].reverse().find((entry) =>
          toDate(entry.timestamp || entry.date)
        ) || null;
      const latestDate = latest
        ? toDate(latest.timestamp || latest.date)
        : null;

      const aseCategory =
        (latest && (latest.aseCategory ?? latest.category)) || "Unknown";

      allSnapshots.push({
        id,
        lastCheckIn: latestDate ? latestDate.toISOString() : null,
        aseCategory,
        trend: windowCheckins.map((entry) => ({
          date: toDate(entry.timestamp || entry.date),
          aseCategory: entry.aseCategory ?? entry.category,
          adherence: entry.adherence ?? null,
          wellnessIndex: entry.ssi ?? entry.wellnessIndex ?? null,
        })),
      });
    }
    return allSnapshots;
  } catch (err) {
    console.error("Error building patient snapshot data:", err);
    return [];
  }
}

/** Population-level wellness data (provider scoped) */
export async function getPopulationWellnessData(days = 30) {
  try {
    const q = query(providerCol("checkins"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    const filtered = all.filter((c) => {
      const d = toDate(c.timestamp || c.date);
      return d && d >= cutoff;
    });

    const byDate = {};
    for (const c of filtered) {
      const k = dateKey(c.timestamp || c.date);
      if (!k) continue;
      const ssi = c.ssi ?? c.wellnessIndex ?? 0;
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(ssi);
    }

    const trend = Object.keys(byDate)
      .sort()
      .map((k) => ({
        date: k,
        avgSSI:
          byDate[k].reduce((sum, x) => sum + (x || 0), 0) /
          (byDate[k].length || 1),
      }));

    return trend;
  } catch (err) {
    console.error("Error fetching population wellness data:", err);
    return [];
  }
}

/** Population overview (counts by ASE category) */
export async function getPopulationOverview() {
  try {
    const q = query(providerCol("checkins"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    for (const c of all) {
      const mapped = catMap[c.aseCategory ?? c.category] || "gray";
      if (counts[mapped] !== undefined) counts[mapped] += 1;
    }
    return counts;
  } catch (err) {
    console.error("Error computing population overview:", err);
    return { green: 0, yellow: 0, orange: 0, red: 0 };
  }
}

/** Enrollment Analytics (provider-scoped) */
export async function getEnrollmentAnalytics() {
  try {
    const patients = await getPatientsList();
    return {
      total: patients.length,
      active: patients.filter((p) => p.status === "Active").length,
      discharged: patients.filter((p) => p.status === "Discharged").length,
    };
  } catch (err) {
    console.error("Error fetching enrollment analytics:", err);
    return { total: 0, active: 0, discharged: 0 };
  }
}

/**
 * Enrollment Trend (provider-scoped)
 * Returns an array: [{ date: 'YYYY-MM-DD', active: <count> }, ...]
 * We approximate daily "active population" by counting unique patientIds
 * with a check-in on each date within the last N days.
 */
export async function getEnrollmentTrend(days = 90) {
  try {
    const q = query(
      providerCol("checkins"),
      orderBy("timestamp", "desc"),
      limit(2000) // safety cap
    );
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => d.data());

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    // Group by date key and count unique patientIds
    const byDate = new Map();
    for (const c of all) {
      const d = toDate(c.timestamp || c.date);
      if (!d || d < cutoff) continue;
      const k = d.toISOString().slice(0, 10);
      if (!byDate.has(k)) byDate.set(k, new Set());
      byDate.get(k).add(c.patientId);
    }

    const dates = Array.from(byDate.keys()).sort();
    return dates.map((k) => ({
      date: k,
      active: byDate.get(k).size,
    }));
  } catch (err) {
    console.error("Error computing enrollment trend:", err);
    return [];
  }
}

/**
 * Check-in Adherence Data (provider-scoped)
 * Calculates each patient's check-in frequency over the last N days.
 * Returns [{ patientId, adherence: %, totalCheckIns, expectedCheckIns }]
 */
export async function getCheckInAdherenceData(days = 30) {
  try {
    const patients = await getPatientsList();
    const q = query(providerCol("checkins"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => d.data());

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    // Group check-ins by patient
    const counts = {};
    for (const c of all) {
      const d = toDate(c.timestamp || c.date);
      if (!d || d < cutoff) continue;
      const id = c.patientId || "unknown";
      if (!counts[id]) counts[id] = 0;
      counts[id] += 1;
    }

    // Compute adherence relative to expected (one check-in per day)
    const adherenceData = patients.map((p) => {
      const totalCheckIns = counts[p.id] || 0;
      const expectedCheckIns = days;
      const adherence = Math.min(
        100,
        Math.round((totalCheckIns / expectedCheckIns) * 100)
      );
      return {
        patientId: p.id,
        name: p.name || p.fullName || "Unknown",
        adherence,
        totalCheckIns,
        expectedCheckIns,
      };
    });

    return adherenceData;
  } catch (err) {
    console.error("Error computing check-in adherence data:", err);
    return [];
  }
}
/**
 * Four-Band Stability Trend
 * Builds counts for each ASE category per day (Stable, Minor Change, Review Recommended, Needs Immediate Review)
 * → [{ date:'YYYY-MM-DD', stable:x, minor:y, review:z, critical:w }]
 */
export async function getFourBandStabilityTrend(days = 30) {
  try {
    const q = query(providerCol("checkins"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => d.data());

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    const byDate = {};
    for (const c of all) {
      const d = toDate(c.timestamp || c.date);
      if (!d || d < cutoff) continue;
      const k = d.toISOString().slice(0, 10);
      if (!byDate[k])
        byDate[k] = { stable: 0, minor: 0, review: 0, critical: 0 };
      const cat = (c.aseCategory || c.category || "").toLowerCase();
      if (cat.includes("stable")) byDate[k].stable++;
      else if (cat.includes("minor")) byDate[k].minor++;
      else if (cat.includes("review")) byDate[k].review++;
      else if (cat.includes("immediate")) byDate[k].critical++;
    }

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  } catch (err) {
    console.error("Error computing four-band stability trend:", err);
    return [];
  }
}

export {};
