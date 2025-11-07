// backend/src/config/seedFourBandData_debug.js
// HeartLink — Firestore Emulator Debug Seeder (v4.1-CL)
// Adds detailed console output to verify written data structure and field compatibility

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || "heartlink-provider-platform";

if (isEmulator) {
  initializeApp({ projectId });
  console.log(`🧩 Firestore Emulator detected (projectId: ${projectId})`);
} else {
  initializeApp();
  console.log("⚠️  Warning: Running in live Firestore mode");
}

const db = getFirestore();

const NUM_PATIENTS = 10; // keep small for debug
const DAYS = 10; // short run for clarity
const ACTIVE_RATIO = 0.8;
const today = new Date();
const dayMs = 86400000;
const fmt = (d) => d.toISOString().slice(0, 10);

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function aseFrom(w, a) {
  if (w < 2.5 || a < 40) return "Red";
  if (w < 3.2 || a < 60) return "Orange";
  if (w < 4.0 || a < 80) return "Yellow";
  return "Green";
}

async function deleteCollection(coll) {
  const ref = db.collection(coll);
  const snap = await ref.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`🧹 Cleared ${snap.size} docs from ${coll}`);
}

async function seed() {
  console.log("🩺 Starting HeartLink Debug Seeder\n");
  await deleteCollection("patients");

  const first = ["Debbie", "Andre", "Tina", "Regina", "Devin", "Marcus", "Irene", "Sonia", "Ken", "Ava"];
  const last = ["Conn", "Kuhn", "Bahringer", "Schmidt", "Ullrich", "Hughes", "Nguyen", "Chen", "Baker", "Garcia"];

  const patients = [];
  for (let i = 0; i < NUM_PATIENTS; i++) {
    const id = `PAT${String(i + 1).padStart(3, "0")}`;
    const name = `${pick(first)} ${pick(last)}`;
    const active = Math.random() < ACTIVE_RATIO;
    const joinDate = new Date(today - rand(0, 60) * dayMs);

    const patient = {
      id,
      name,
      status: active ? "Active" : "Discharged",
      joinDate: fmt(joinDate),
      lastCheckIn: null,
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection("patients").doc(id).set(patient);
    patients.push(patient);
  }

  console.log(`👥 Created ${patients.length} patients`);
  console.log(`📅 Generating ${DAYS}-day check-in data…\n`);

  const dayAgg = {}; // daily aggregate to confirm frontend alignment

  for (const p of patients) {
    const ref = db.collection("patients").doc(p.id).collection("checkins");
    const bias = rand(-0.3, 0.3);
    let lastDate = null;

    for (let d = DAYS - 1; d >= 0; d--) {
      const date = new Date(today - d * dayMs);
      const dateStr = fmt(date);

      // 60% chance of a check-in
      if (Math.random() > 0.6) continue;

      const wellness = clamp(3.0 + bias + rand(-0.5, 0.5), 1.5, 5);
      const adherence = clamp(70 + rand(-20, 20), 20, 100);
      const aseCategory = aseFrom(wellness, adherence);

      await ref.doc(dateStr).set({
        date: dateStr,
        adherenceRate: adherence,
        wellnessIndex: wellness,
        aseCategory,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (!dayAgg[dateStr]) {
        dayAgg[dateStr] = { total: 0, sumAdherence: 0, sumWellness: 0, band: { G: 0, Y: 0, O: 0, R: 0 } };
      }

      const agg = dayAgg[dateStr];
      agg.total++;
      agg.sumAdherence += adherence;
      agg.sumWellness += wellness;
      if (aseCategory === "Green") agg.band.G++;
      if (aseCategory === "Yellow") agg.band.Y++;
      if (aseCategory === "Orange") agg.band.O++;
      if (aseCategory === "Red") agg.band.R++;

      lastDate = dateStr;
    }

    if (lastDate) {
      await db.collection("patients").doc(p.id).update({ lastCheckIn: lastDate });
    }
  }

  console.log("\n✅ Wrote per-patient check-ins. Daily aggregates summary:\n");
  Object.entries(dayAgg).forEach(([date, agg]) => {
    const avgAdh = (agg.sumAdherence / agg.total).toFixed(1);
    const avgWell = (agg.sumWellness / agg.total).toFixed(2);
    console.log(
      `${date} | ${agg.total} check-ins | Adh: ${avgAdh}% | Well: ${avgWell} | Bands: G${agg.band.G} Y${agg.band.Y} O${agg.band.O} R${agg.band.R}`
    );
  });

  console.log("\n🔍 Firestore paths written:");
  console.log("  • patients/{id} (fields: id, name, status, joinDate, lastCheckIn)");
  console.log("  • patients/{id}/checkins/{YYYY-MM-DD} (fields: adherenceRate, wellnessIndex, aseCategory)");
  console.log("\nRun the app and inspect network requests to verify fetchReportData paths match this schema.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error during debug seed:", err);
  process.exit(1);
});
