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

/* =================== CORE FETCH =================== */

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

/* =================== ANALYTICS =================== */

export async function getPopulationOverview(days = 30) {
  try {
    const q = query(providerCol("checkins"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (all.length === 0) {
      return {
        totalPatients: 0,
        activePatients: 0,
        stablePopulation: 0,
        atRiskPopulation: 0,
        avgEngagement: 0,
        adherenceTrend: 0,
      };
    }

    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    for (const c of all) {
      const cat = (c.aseCategory || c.category || "").toLowerCase();
      if (cat.includes("stable")) counts.green++;
      else if (cat.includes("minor")) counts.yellow++;
      else if (cat.includes("review")) counts.orange++;
      else if (cat.includes("immediate")) counts.red++;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const stablePopulation = Math.round((counts.green / total) * 100);
    const atRiskPopulation = Math.round(
      ((counts.orange + counts.red) / total) * 100
    );

    const adherenceVals = all
      .map((c) => Number(c.adherence))
      .filter((v) => !isNaN(v));
    const avgEngagement =
      adherenceVals.length > 0
        ? Math.round(
            adherenceVals.reduce((a, b) => a + b, 0) / adherenceVals.length
          )
        : 0;

    return {
      totalPatients: total,
      activePatients: total, // until discharged separation added
      stablePopulation,
      atRiskPopulation,
      avgEngagement,
      adherenceTrend: 0,
    };
  } catch (err) {
    console.error("Error computing population overview:", err);
    return {
      totalPatients: 0,
      activePatients: 0,
      stablePopulation: 0,
      atRiskPopulation: 0,
      avgEngagement: 0,
      adherenceTrend: 0,
    };
  }
}

/* === POPULATION WELLNESS TREND ===
   Returns average SSI (wellness index) per day across the cohort.
*/
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

    // group by date and compute daily average SSI
    const byDate = {};
    for (const c of filtered) {
      const k = dateKey(c.timestamp || c.date);
      if (!k) continue;
      if (!byDate[k]) byDate[k] = [];
      const ssiVal = typeof c.ssi === "number" ? c.ssi : c.wellnessIndex;
      if (typeof ssiVal === "number") byDate[k].push(ssiVal);
    }

    const rows = Object.keys(byDate)
      .sort()
      .map((date) => {
        const arr = byDate[date];
        const avgSSI =
          arr.length > 0
            ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2))
            : 0;
        return { date, wellnessIndex: avgSSI };
      });

    console.log("🩺 getPopulationWellnessData returned:", rows.length, "rows");
    if (rows.length < 10) console.table(rows);

    return rows;
  } catch (err) {
    console.error("Error in getPopulationWellnessData:", err);
    return [];
  }
}

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

export async function getEnrollmentTrend(days = 90) {
  try {
    const q = query(
      providerCol("checkins"),
      orderBy("timestamp", "desc"),
      limit(2000)
    );
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => d.data());

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    const byDate = new Map();
    for (const c of all) {
      const d = toDate(c.timestamp || c.date);
      if (!d || d < cutoff) continue;
      const k = d.toISOString().slice(0, 10);
      if (!byDate.has(k)) byDate.set(k, new Set());
      byDate.get(k).add(c.patientId);
    }

    const dates = Array.from(byDate.keys()).sort();
    const rows = dates.map((k) => ({
      date: k,
      active: byDate.get(k).size,
    }));

    console.log("🩺 getEnrollmentTrend returned:", rows.length, "records");
    if (rows.length < 10) console.table(rows);

    return rows;
  } catch (err) {
    console.error("Error computing enrollment trend:", err);
    return [];
  }
}

/* === COHORT MEAN ADHERENCE ===
   Returns one record per day showing mean adherence (%) across all active participants.
*/
export async function getCheckInAdherenceData(days = 30) {
  try {
    const q = query(providerCol("checkins"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    // Filter check-ins within range
    const filtered = all.filter((c) => {
      const d = toDate(c.timestamp || c.date);
      return d && d >= cutoff;
    });

    // Group by date
    const byDate = {};
    for (const c of filtered) {
      const k = dateKey(c.timestamp || c.date);
      if (!k) continue;
      if (!byDate[k]) byDate[k] = [];

      // adherence is stored as numeric %, so include that directly
      const adherenceVal = Number(c.adherence);
      if (!isNaN(adherenceVal)) byDate[k].push(adherenceVal);
    }

    // Compute mean adherence per day
    const rows = Object.keys(byDate)
      .sort()
      .map((date) => {
        const vals = byDate[date];
        const adherenceRate =
          vals.length > 0
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
            : 0;
        return { date, adherenceRate };
      });

    console.log("🩺 getCheckInAdherenceData (cohort mean) returned:", rows.length, "rows");
    if (rows.length < 10) console.table(rows);

    return rows;
  } catch (err) {
    console.error("Error computing mean adherence:", err);
    return [];
  }
}



/* === FOUR-BAND STABILITY TREND (normalized to 100%) === */
/* === FOUR-BAND STABILITY TREND (fractions 0..1 for stacked chart) === */
export async function getFourBandStabilityTrend(days = 30) {
  try {
    const q = query(providerCol("checkins"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    // One stability state per patient per day
    const byDate = {};
    for (const c of all) {
      const d = toDate(c.timestamp || c.date);
      if (!d || d < cutoff) continue;
      const day = d.toISOString().slice(0, 10);
      const pid = c.patientId || "unknown";
      if (!byDate[day]) byDate[day] = {};
      // last state of the day wins (overwrite is fine)
      byDate[day][pid] = c.aseCategory || c.category || "";
    }

    const rows = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, perPatient]) => {
        const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
        const total = Object.keys(perPatient).length || 1;

        for (const cat of Object.values(perPatient)) {
          const s = (cat || "").toLowerCase();
          if (s.includes("stable")) counts.green++;
          else if (s.includes("minor")) counts.yellow++;
          else if (s.includes("review")) counts.orange++;
          else if (s.includes("immediate")) counts.red++;
        }

        // Return FRACTIONS 0..1 so the chart’s existing *100 formatter is correct
        return {
          date,
          green: counts.green / total,
          yellow: counts.yellow / total,
          orange: counts.orange / total,
          red: counts.red / total,
        };
      });

    console.log("🩺 getFourBandStabilityTrend (fractions) rows:", rows.length);
    if (rows.length < 10) console.table(rows);
    return rows;
  } catch (err) {
    console.error("Error computing four-band stability trend:", err);
    return [];
  }
}

/* === DASHBOARD SNAPSHOT ===
   Returns array of patient snapshot objects for dashboard tables
   using latest ASE-processed check-ins.
*/
export async function getPatientSnapshotData() {
  try {
    const providerId =
      localStorage.getItem("providerId") || sessionStorage.getItem("providerId");
    if (!providerId) throw new Error("No providerId in storage");

    // Fetch patients and check-ins
    const patientSnap = await getDocs(collection(db, `providers/${providerId}/patients`));
    const checkinSnap = await getDocs(collection(db, `providers/${providerId}/checkins`));

    const patients = patientSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const checkins = checkinSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const results = patients.map((p) => {
      const related = checkins
        .filter((c) => c.patientId === p.id || c.patientCode === p.id)
        .sort(
          (a, b) =>
            new Date(b.timestamp || b.date || 0) -
            new Date(a.timestamp || a.date || 0)
        );

      const last = related[0];

      // 🧩 Safe timestamp parsing — never throw
      let lastDate = null;
      if (last?.timestamp instanceof Date) {
        lastDate = last.timestamp;
      } else if (typeof last?.timestamp === "string" || typeof last?.date === "string") {
        const parsed = new Date(last.timestamp || last.date);
        lastDate = isNaN(parsed.getTime()) ? null : parsed;
      }

      // Baseline info
      const baseline = p.baseline || {
        shortnessOfBreath: p.shortnessOfBreath ?? null,
        edema: p.edema ?? null,
        fatigue: p.fatigue ?? null,
        orthopnea: p.orthopnea ?? null,
        weight: p.weight ?? null,
      };

      // Vitals (most recent values)
      const vitals = {
        weight: last?.weight ?? p.weight ?? null,
        breathing: last?.breathing ?? null,
        edema: last?.edema ?? null,
        fatigue: last?.fatigue ?? null,
      };

      return {
        patientId: p.id,
        patientCode: p.patientCode || p.code || p.id,
        name:
          p.name ||
          p.displayName ||
          p.fullName ||
          p.patientName ||
          p.patientCode ||
          p.id,
        aseCategory: last?.aseCategory || p.aseCategory || "Stable",
        adherence:
          typeof last?.adherence === "number"
            ? Math.round(last.adherence)
            : p.adherence ?? null,
        ssi:
          typeof last?.ssi === "number"
            ? last.ssi
            : p.ssi ?? null,
        wellnessIndex:
          p.wellnessIndex ??
          last?.wellnessIndex ??
          (typeof last?.ssi === "number" ? Math.round(last.ssi * 20) : null),
        timestamp: lastDate ? lastDate.toISOString() : null,
        status: p.status || "Active",
        ...vitals,
        baseline,
      };
    });

    console.log("🩺 getPatientSnapshotData normalized:", results.length, "records");
    if (results.length < 10) console.table(results);
    return results;
  } catch (err) {
    console.error("Error in getPatientSnapshotData:", err);
    return [];
  }
}

/* === PATIENT DETAIL OVERVIEW ===
   Returns most recent ASE data + trend info for a given patient.
*/
export async function getPatientOverview(patientId, days = 30) {
  try {
    if (!patientId) throw new Error("No patientId provided");

    const q = query(
      providerCol("checkins"),
      where("patientId", "==", patientId),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (all.length === 0) return null;

    const recent = all[0];
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);

    const recentCheckIns = all.filter((c) => {
      const d = toDate(c.timestamp || c.date);
      return d && d >= cutoff;
    });

    const trend = recentCheckIns.map((c) => ({
      date: dateKey(c.timestamp || c.date),
      ssi: c.ssi ?? null,
      adherence: c.adherence ?? null,
      aseCategory: c.aseCategory || c.category || "Unscored",
    }));

    const overview = {
      patientId,
      name: recent.name || recent.patientName || "Unknown",
      lastCheckIn: toDate(recent.timestamp),
      latestCategory: recent.aseCategory || recent.category || "Unscored",
      ssi: recent.ssi ?? null,
      adherence: recent.adherence ?? null,
      trend,
    };

    console.log("🩺 getPatientOverview:", patientId, "->", overview);
    return overview;
  } catch (err) {
    console.error("Error in getPatientOverview:", err);
    return null;
  }
}


export {};
