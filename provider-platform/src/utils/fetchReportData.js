// HeartLink Provider Platform — Firestore Fetching (v4.1-CL, Emulator-Aware, Schema-Standardized)
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import generateReasonSummary_Provider from "./generateReasonSummary_Provider";

/* ------------------------------------------------------------
   Environment Detection
------------------------------------------------------------ */
const IS_EMULATOR =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const PROVIDER_ID = "demoProvider";

function log(tag, msg) {
  const isProd =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    Boolean(import.meta.env.PROD);
  if (isProd) return;
  console.log(`🧪 [fetchReportData] ${tag}:`, msg);
}

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------ */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const avg = (arr) => {
  const vals = arr.map(toNum).filter((v) => v != null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};
const dateKey = (iso) => (iso || "").slice(0, 10);

/* ------------------------------------------------------------
   Low-level Readers
------------------------------------------------------------ */
async function readPatients() {
  let snap;

  if (IS_EMULATOR) {
    snap = await getDocs(collection(db, "patients"));
  } else {
    try {
      const providerRef = collection(
        db,
        "providers",
        PROVIDER_ID,
        "patients"
      );
      snap = await getDocs(providerRef);
    } catch (err) {
      console.warn("⚠️ readPatients provider path failed:", err);
    }

    if (!snap || snap.empty) {
      const fallbackRef = collection(db, "patients");
      snap = await getDocs(fallbackRef);
      if (snap.empty) {
        console.warn(
          "⚠️ readPatients fallback collection empty — no patient docs found"
        );
      } else {
        console.info(
          "ℹ️ Falling back to root patients collection (no provider-specific data found)"
        );
      }
    }
  }

  const docs = snap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [];
  log("readPatients", `${docs.length} patients`);
  return docs;
}

async function readPatientCheckins(patientId) {
  let snap;

  if (IS_EMULATOR) {
    const q = query(
      collection(db, "patients", patientId, "checkins"),
      orderBy("date", "asc")
    );
    snap = await getDocs(q);
  } else {
    const providerRef = query(
      collection(
        db,
        "providers",
        PROVIDER_ID,
        "patients",
        patientId,
        "checkins"
      ),
      orderBy("date", "asc")
    );
    snap = await getDocs(providerRef);

    if (!snap || snap.empty) {
      const fallbackRef = query(
        collection(db, "patients", patientId, "checkins"),
        orderBy("date", "asc")
      );
      const fbSnap = await getDocs(fallbackRef);
      if (!fbSnap.empty) {
        console.info(
          `ℹ️ Using fallback check-ins for patient ${patientId} from root collection`
        );
        snap = fbSnap;
      }
    }
  }

  const docs = snap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [];
  log(`readPatientCheckins(${patientId})`, `${docs.length} check-ins`);
  return docs;
}

/* ------------------------------------------------------------
   1️⃣ Adherence Trend — [{ date, adherenceRate }]
------------------------------------------------------------ */
export async function getCheckInAdherenceData(days = 90) {
  const patients = await readPatients();
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const daysAgg = {};

  for (const p of patients) {
    const checkins = await readPatientCheckins(p.id);
    for (const c of checkins) {
      const date = dateKey(c.date);
      if (!date) continue;
      const ts = new Date(date);
      if (ts < start || ts > end) continue;
      const val = toNum(c.adherenceRate ?? c.engagement ?? c.adherence);
      if (!daysAgg[date]) daysAgg[date] = [];
      if (val != null) daysAgg[date].push(val);
    }
  }

  let result = Object.entries(daysAgg)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, vals]) => ({
      date,
      adherenceRate: Number(avg(vals)?.toFixed(1)) || 0,
    }));

  // 🔁 fallback if empty
  if (result.length === 0) {
    console.warn("⚠️ No recent adherence data; falling back to full history.");
    for (const p of patients) {
      const checkins = await readPatientCheckins(p.id);
      for (const c of checkins) {
        const date = dateKey(c.date);
        if (!daysAgg[date]) daysAgg[date] = [];
        const val = toNum(c.adherenceRate ?? c.engagement ?? c.adherence);
        if (val != null) daysAgg[date].push(val);
      }
    }
    result = Object.entries(daysAgg)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, vals]) => ({
        date,
        adherenceRate: Number(avg(vals)?.toFixed(1)) || 0,
      }));
  }

  log("getCheckInAdherenceData", `${result.length} daily rows`);
  return result;
}

/* ------------------------------------------------------------
   2️⃣ Wellness Trend — [{ date, wellnessIndex }]
------------------------------------------------------------ */
export async function getPopulationWellnessData(days = 90) {
  const patients = await readPatients();
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const map = {};

  for (const p of patients) {
    const checkins = await readPatientCheckins(p.id);
    for (const c of checkins) {
      const date = dateKey(c.date);
      if (!date) continue;
      const ts = new Date(date);
      if (ts < start || ts > end) continue;
      const val = toNum(c.wellnessIndex ?? c.wellness ?? c.score);
      if (!map[date]) map[date] = [];
      if (val != null) map[date].push(val);
    }
  }

  let result = Object.entries(map)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, vals]) => ({
      date,
      wellnessIndex: Number(avg(vals)?.toFixed(2)) || 0,
    }));

  // 🔁 fallback if empty
  if (result.length === 0) {
    console.warn("⚠️ No recent wellness data; falling back to full history.");
    for (const p of patients) {
      const checkins = await readPatientCheckins(p.id);
      for (const c of checkins) {
        const date = dateKey(c.date);
        if (!map[date]) map[date] = [];
        const val = toNum(c.wellnessIndex ?? c.wellness ?? c.score);
        if (val != null) map[date].push(val);
      }
    }
    result = Object.entries(map)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, vals]) => ({
        date,
        wellnessIndex: Number(avg(vals)?.toFixed(2)) || 0,
      }));
  }

  log("getPopulationWellnessData", `${result.length} daily rows`);
  return result;
}

/* ------------------------------------------------------------
   3️⃣ Four-Band Stability — [{ date, Green, Yellow, Orange, Red }]
------------------------------------------------------------ */
export async function getFourBandStabilityTrend(days = 90) {
  const patients = await readPatients();
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const buckets = {};
  const catMap = {
    "Stable": "Green",
    "Minor Change": "Yellow",
    "Review Recommended": "Orange",
    "Needs Immediate Review": "Red",
    "Green": "Green",
    "Yellow": "Yellow",
    "Orange": "Orange",
    "Red": "Red",
  };

  for (const p of patients) {
    const checkins = await readPatientCheckins(p.id);
    for (const c of checkins) {
      const date = dateKey(c.date);
      if (!date) continue;
      const ts = new Date(date);
      if (ts < start || ts > end) continue;
      const mapped = catMap[c.aseCategory];
      if (!buckets[date])
        buckets[date] = { Green: 0, Yellow: 0, Orange: 0, Red: 0, total: 0 };
      if (mapped && buckets[date][mapped] !== undefined) buckets[date][mapped]++;
      buckets[date].total++;
    }
  }

  let result = Object.entries(buckets)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      Green: +(v.Green / v.total * 100).toFixed(1),
      Yellow: +(v.Yellow / v.total * 100).toFixed(1),
      Orange: +(v.Orange / v.total * 100).toFixed(1),
      Red: +(v.Red / v.total * 100).toFixed(1),
    }));

  // 🔁 fallback if empty
  if (result.length === 0) {
    console.warn("⚠️ No recent stability data; falling back to full history.");
    for (const p of patients) {
      const checkins = await readPatientCheckins(p.id);
      for (const c of checkins) {
        const date = dateKey(c.date);
        if (!date) continue;
        const mapped = catMap[c.aseCategory];
        if (!buckets[date])
          buckets[date] = { Green: 0, Yellow: 0, Orange: 0, Red: 0, total: 0 };
        if (mapped && buckets[date][mapped] !== undefined) buckets[date][mapped]++;
        buckets[date].total++;
      }
    }
    result = Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({
        date,
        Green: +(v.Green / v.total * 100).toFixed(1),
        Yellow: +(v.Yellow / v.total * 100).toFixed(1),
        Orange: +(v.Orange / v.total * 100).toFixed(1),
        Red: +(v.Red / v.total * 100).toFixed(1),
      }));
  }

  log("getFourBandStabilityTrend", `${result.length} daily rows`);
  return result;
}

/* ------------------------------------------------------------
   4️⃣ Active Composition — [{ label, value }]
------------------------------------------------------------ */
export async function getActiveCompositionData() {
  const patients = await readPatients();
  const now = new Date();
  const active = patients.filter((p) => p.status === "Active");
  const newCount = active.filter((p) => {
    const days = (now - new Date(p.joinDate)) / 86400000;
    return days <= 30;
  }).length;
  const ongoingCount = active.length - newCount;
  return [
    { label: "Ongoing", value: ongoingCount },
    { label: "New (≤30 Days)", value: newCount },
    { total: active.length },
  ];
}

/* ------------------------------------------------------------
   5️⃣ Enrollment Trend — [{ date, active }]
------------------------------------------------------------ */
export async function getEnrollmentTrend(days = 90) {
  const patients = await readPatients();
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const result = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(start.getTime() + i * 86400000);
    const cutoff = date.toISOString().slice(0, 10);
    const count = patients.filter((p) => {
      if (normalizeStatus(p.status) !== "active") return false;
      const joined = toDate(p.joinDate || p.createdAt || p.enrolledAt);
      return joined && joined <= date;
    }).length;
    result.push({ date: cutoff, active: count });
  }
  log("getEnrollmentTrend", `${result.length} daily points`);
  return result;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (value && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(status = "") {
  return String(status || "").trim().toLowerCase();
}

const DISCHARGED_STATUSES = new Set([
  "discharged",
  "inactive",
  "completed",
  "graduated",
  "cancelled",
  "terminated",
]);

const MS_PER_DAY = 86400000;

export async function getEnrollmentAnalytics(days = 90) {
  const patients = await readPatients();
  const now = new Date();
  const start = new Date(now.getTime() - days * MS_PER_DAY);

  const active = patients.filter((p) => normalizeStatus(p.status) === "active");
  const newPatients = active.filter((p) => {
    const joined = toDate(p.joinDate || p.createdAt || p.enrolledAt);
    return joined && joined >= start;
  });

  const discharged = patients.filter((p) => {
    const status = normalizeStatus(p.status);
    if (!DISCHARGED_STATUSES.has(status)) return false;
    const last =
      toDate(p.dischargeDate) ||
      toDate(p.lastCheckIn) ||
      toDate(p.updatedAt) ||
      toDate(p.lastUpdated);
    return last && last >= start;
  });

  const ongoingCount = Math.max(active.length - newPatients.length, 0);
  const retentionDenominator = ongoingCount + discharged.length;
  const retention =
    retentionDenominator > 0
      ? (ongoingCount / retentionDenominator) * 100
      : 100;

  const netBase = ongoingCount + newPatients.length;
  const netGrowth =
    netBase > 0
      ? ((active.length - discharged.length) / netBase) * 100
      : 0;

  const newEventMap = new Map();
  newPatients.forEach((p) => {
    const joined = toDate(p.joinDate || p.createdAt || p.enrolledAt);
    if (!joined || joined < start || joined > now) return;
    const iso = joined.toISOString().slice(0, 10);
    newEventMap.set(iso, (newEventMap.get(iso) ?? 0) + 1);
  });

  const dischargeEventMap = new Map();
  discharged.forEach((p) => {
    const last =
      toDate(p.dischargeDate) ||
      toDate(p.lastCheckIn) ||
      toDate(p.updatedAt) ||
      toDate(p.lastUpdated);
    if (!last || last < start || last > now) return;
    const iso = last.toISOString().slice(0, 10);
    dischargeEventMap.set(iso, (dischargeEventMap.get(iso) ?? 0) + 1);
  });

  const enrollmentTrend = await getEnrollmentTrend(days);
  const activeByDate = new Map(
    enrollmentTrend.map((entry) => {
      const iso = entry.date?.slice ? entry.date.slice(0, 10) : null;
      return [iso, entry.active];
    })
  );

  const adherenceTrend = await getCheckInAdherenceData(days);
  const adherenceMap = new Map();
  adherenceTrend.forEach((entry) => {
    const date = toDate(entry.date);
    if (!date || date < start || date > now) return;
    const iso = date.toISOString().slice(0, 10);
    const raw =
      entry.adherenceRate ?? entry.engagement ?? entry.adherence ?? null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const normalized = value > 1 ? value : value * 100;
    adherenceMap.set(iso, Number(normalized.toFixed(1)));
  });

  const trendData = [];
  let adherenceSum = 0;
  let adherenceCount = 0;
  for (let i = 0; i <= days; i++) {
    const day = new Date(start.getTime() + i * MS_PER_DAY);
    if (day > now) break;
    const iso = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    const adherenceValue = adherenceMap.has(iso)
      ? adherenceMap.get(iso)
      : null;
    if (adherenceValue != null) {
      adherenceSum += adherenceValue;
      adherenceCount += 1;
    }

    const activeValue = (() => {
      if (activeByDate.has(iso)) return activeByDate.get(iso);
      const prev = trendData[trendData.length - 1];
      return prev ? prev.active : active.length;
    })();

    trendData.push({
      date: label,
      isoDate: iso,
      newPatients: newEventMap.get(iso) ?? 0,
      dischargedPatients: dischargeEventMap.get(iso) ?? 0,
      active: activeValue ?? 0,
      avgAdherence: adherenceValue,
    });
  }

  const averageAdherence =
    adherenceCount > 0
      ? Number((adherenceSum / adherenceCount).toFixed(1))
      : null;

  const analytics = {
    metrics: {
      totalActive: active.length,
      newCount: newPatients.length,
      ongoingCount,
      dischargedCount: discharged.length,
      retention: Number.isFinite(retention)
        ? Math.round(retention)
        : 0,
      netGrowth: (() => {
        const rounded = Number.isFinite(netGrowth) ? Math.round(netGrowth) : 0;
        return Object.is(rounded, -0) ? 0 : rounded;
      })(),
      averageAdherence,
    },
    trendData,
  };
  log("getEnrollmentAnalytics", {
    totalActive: analytics.metrics.totalActive,
    weeks: analytics.trendData.length,
  });
  return analytics;
}

/* ------------------------------------------------------------
   6️⃣ Patient List + Helpers
------------------------------------------------------------ */
export async function getPatientsList() {
  const patients = await readPatients();
  log("getPatientsList", `${patients.length} patients loaded`);
  return patients;
}

/* ------------------------------------------------------------
   7️⃣ Population Overview — Summary Object
------------------------------------------------------------ */
export async function getPopulationOverview(days = 30) {
  const patients = await getPatientsList();
  const active = patients.filter((p) => p.status === "Active");
  const now = new Date();
  const newCount = active.filter((p) => {
    const diff = (now - new Date(p.joinDate)) / 86400000;
    return diff <= 30;
  }).length;
  const ongoingCount = active.length - newCount;

  const adherenceData = await getCheckInAdherenceData(days);
  const wellnessData = await getPopulationWellnessData(days);

  const avgAdherence =
    adherenceData.length > 0
      ? adherenceData.reduce((sum, d) => sum + d.adherenceRate, 0) /
        adherenceData.length
      : 0;

  const avgWellness =
    wellnessData.length > 0
      ? wellnessData.reduce((sum, d) => sum + d.wellnessIndex, 0) /
        wellnessData.length
      : 0;

  const summary = {
    activePatients: active.length,
    newPatients: newCount,
    ongoingPatients: ongoingCount,
    avgAdherence: Number(avgAdherence.toFixed(1)),
    avgWellness: Number(avgWellness.toFixed(2)),
    timeRangeDays: days,
  };

  log("getPopulationOverview", summary);
  return summary;
}

/* ------------------------------------------------------------
   8️⃣ Individual Patient Overview
------------------------------------------------------------ */
export async function getPatientOverview(patientId, days = 30) {
  if (!patientId) {
    console.warn("getPatientOverview called without patientId");
    return null;
  }

  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const checkins = await (async () => {
    const ref = IS_EMULATOR
      ? collection(db, "patients", patientId, "checkins")
      : collection(db, "providers", PROVIDER_ID, "patients", patientId, "checkins");
    const q = query(ref, orderBy("date", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  })();

  const filtered = checkins.filter((c) => {
    const date = new Date(c.date);
    return date >= start && date <= end;
  });

  if (filtered.length === 0) {
    log(`getPatientOverview(${patientId})`, "no check-ins in range");
    return null;
  }

  const avgAdherence =
    filtered.reduce((sum, c) => sum + (c.adherenceRate || 0), 0) /
    filtered.length;
  const avgWellness =
    filtered.reduce((sum, c) => sum + (c.wellnessIndex || 0), 0) /
    filtered.length;

  const categoryCounts = { Green: 0, Yellow: 0, Orange: 0, Red: 0 };
  filtered.forEach((c) => {
    const mapped = c.aseCategory;
    if (categoryCounts[mapped] !== undefined) categoryCounts[mapped]++;
  });

  const overview = {
    patientId,
    totalCheckins: filtered.length,
    avgAdherence: Number(avgAdherence.toFixed(1)),
    avgWellness: Number(avgWellness.toFixed(2)),
    categories: categoryCounts,
    recent: filtered[filtered.length - 1],
    history: filtered,
  };

  log(`getPatientOverview(${patientId})`, overview);
  return overview;
}

/* ------------------------------------------------------------
   9️⃣ Patient Snapshot Helpers
------------------------------------------------------------ */
function normalizeAdherencePercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const normalized = num > 1 ? num : num * 100;
  return Number(normalized.toFixed(1));
}

export async function getPatientSnapshotData(patientId, limitDays = 30) {
  if (!patientId) {
    console.warn("getPatientSnapshotData called without patientId");
    return null;
  }

  const windowDays = Math.max(1, Number.isFinite(Number(limitDays)) ? Number(limitDays) : 30);
  const now = new Date();
  const start = new Date(now.getTime() - windowDays * MS_PER_DAY);

  try {
    // Fetch patient document (provider path first, fallback to root)
    let patientSnap;
    if (IS_EMULATOR) {
      patientSnap = await getDoc(doc(db, "patients", patientId));
    } else {
      const providerRef = doc(db, "providers", PROVIDER_ID, "patients", patientId);
      patientSnap = await getDoc(providerRef);

      if (!patientSnap.exists()) {
        const fallbackRef = doc(db, "patients", patientId);
        patientSnap = await getDoc(fallbackRef);
      }
    }

    if (!patientSnap || !patientSnap.exists()) {
      console.warn(`getPatientSnapshotData: no patient doc for ${patientId}`);
      return null;
    }

    const patientData = { id: patientId, ...patientSnap.data() };

    // Fetch check-ins
    const allCheckins = await readPatientCheckins(patientId);
    const windowCheckins = allCheckins.filter((entry) => {
      const date = toDate(entry.date);
      return date && date >= start && date <= now;
    });

    const sorted = windowCheckins.length ? windowCheckins : allCheckins;
    const latest = [...sorted].reverse().find((entry) => toDate(entry.date)) || null;
    const latestDate = latest ? toDate(latest.date) : null;

    const adherenceRaw =
      (latest && (latest.adherenceRate ?? latest.adherence ?? latest.engagement)) ??
      patientData.adherenceRate ??
      patientData.avgAdherence ??
      null;
    const adherenceRate = normalizeAdherencePercent(adherenceRaw);

    const wellnessRaw =
      (latest && (latest.wellnessIndex ?? latest.wellness ?? latest.score)) ??
      patientData.wellnessIndex ??
      patientData.avgWellness ??
      null;
    const wellnessIndex = Number.isFinite(Number(wellnessRaw))
      ? Number(Number(wellnessRaw).toFixed(2))
      : null;

    const aseCategory =
      (latest && latest.aseCategory) ||
      patientData.aseCategory ||
      "Unknown";

    const reasonSummary = generateReasonSummary_Provider(
      latest || {},
      aseCategory,
      {
        baseline: patientData.baseline || patientData.patientBaseline || {},
        prevWeights: patientData.prevWeights || [],
      }
    );

    const sourceTrend =
      sorted.length > 0 ? sorted : allCheckins;
    const normalizedWindow = Math.max(
      1,
      Math.min(windowDays, sourceTrend.length)
    );

    const trend = sourceTrend
      .slice(-normalizedWindow)
      .map((entry) => {
        const date = toDate(entry.date);
        if (!date) return null;
        const adherence = normalizeAdherencePercent(
          entry.adherenceRate ?? entry.adherence ?? entry.engagement
        );
        const wellness = Number.isFinite(
          Number(entry.wellnessIndex ?? entry.wellness ?? entry.score)
        )
          ? Number(
              Number(entry.wellnessIndex ?? entry.wellness ?? entry.score).toFixed(2)
            )
          : null;
        return {
          date: date.toISOString().slice(0, 10),
          adherence,
          wellness,
        };
      })
      .filter(Boolean);

    return {
      id: patientId,
      name:
        patientData.name ||
        patientData.displayName ||
        patientData.patientName ||
        patientData.patientCode ||
        patientId,
      status: patientData.status || "Unknown",
      aseCategory,
      adherenceRate,
      wellnessIndex,
      lastCheckIn: latestDate ? latestDate.toISOString() : null,
      reasonSummary,
      trend,
    };
  } catch (err) {
    console.error(`getPatientSnapshotData error for ${patientId}`, err);
    return null;
  }
}

export async function getPatientSnapshots(patientIds = [], limitDays = 30) {
  if (!Array.isArray(patientIds) || patientIds.length === 0) return [];
  const snapshots = await Promise.all(
    patientIds.map((id) =>
      getPatientSnapshotData(id, limitDays).catch((err) => {
        console.error(`getPatientSnapshots failed for ${id}`, err);
        return null;
      })
    )
  );
  return snapshots.filter(Boolean);
}
