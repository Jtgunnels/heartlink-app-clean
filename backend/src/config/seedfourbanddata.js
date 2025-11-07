// backend/src/config/seedFourBandData.js
// HeartLink — Firestore Emulator Seed for Reports (v4.1-CL)
// Seeds patients + 90-day check-ins (adherence, wellness, ASE four-band)
// Works with emulator without requiring any service account key.

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// --- Emulator detection (NO credentials required) ---
const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "heartlink-provider-platform";

if (isEmulator) {
  initializeApp({ projectId });
  console.log("🧩 Firestore Emulator detected — using projectId:", projectId);
} else {
  // Fallback for production/dev if ever used (won't run without credentials)
  initializeApp();
  console.log("🔐 Production/Default credentials in use");
}

const db = getFirestore();

// ---- Configurable knobs ----
const NUM_PATIENTS = 60; // total patients
const ACTIVE_RATIO = 0.85; // 85% Active, rest Discharged
const DAYS = 90; // range for trend
const CHECKIN_PROBABILITY = 0.6; // ~60% chance a patient checks in on a given day

// Name pool (no external deps)
const FIRST = [
  "Debbie",
  "Andre",
  "Tina",
  "Regina",
  "Devin",
  "Marcus",
  "Irene",
  "Sonia",
  "Ken",
  "Ava",
  "Noah",
  "Olivia",
  "Liam",
  "Emma",
  "Mason",
  "Sophia",
  "Lucas",
  "Mia",
  "Ethan",
  "Amelia",
];
const LAST = [
  "Conn",
  "Kuhn",
  "Bahringer",
  "Schmidt",
  "Ullrich",
  "Hughes",
  "Nguyen",
  "Chen",
  "Baker",
  "Garcia",
  "Jones",
  "Moore",
  "Hill",
  "Hall",
  "Ward",
  "Green",
  "Gray",
  "Cruz",
  "Wood",
  "Russell",
];

// Utilities
const today = new Date();
const dayMs = 24 * 60 * 60 * 1000;
const fmt = (d) => d.toISOString().slice(0, 10); // YYYY-MM-DD

function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function rint(min, max) {
  return Math.floor(rand(min, max + 1));
}
function pick(arr) {
  return arr[rint(0, arr.length - 1)];
}

// Map wellness/adherence to ASE 4-band (Green/Yellow/Orange/Red)
function aseFrom(wellness, adherence) {
  // Guardrails:
  // - Very low wellness or very low adherence → Red.
  // - Low/moderate wellness or marginal adherence → Orange.
  // - Mild dip → Yellow.
  // - Otherwise Green.
  if (wellness < 2.6 || adherence < 40) return "Red";
  if (wellness < 3.2 || adherence < 60) return "Orange";
  if (wellness < 4.0 || adherence < 80) return "Yellow";
  return "Green";
}

// Generate a "realistic" wellness/adherence pair that trend slightly up/down
function genSignal(dayIndex, patientBias = 0) {
  // Base patterns with gentle noise so charts look natural
  const weeklyPulse = Math.sin((2 * Math.PI * dayIndex) / 7) * 0.15; // weekly behavior
  const drift = patientBias * 0.2; // slight bias per patient (-1..1 -> -0.2..0.2)
  const wellness = clamp(3.1 + weeklyPulse + drift + rand(-0.3, 0.3), 1.2, 4.9);
  // Let adherence co-vary loosely with wellness
  let adherence = clamp(70 + (wellness - 3.5) * 12 + rand(-15, 15), 15, 100);
  // Round to sensible precision
  return {
    wellness: Math.round(wellness * 100) / 100,
    adherence: Math.round(adherence * 10) / 10,
  };
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Delete a collection (emulator-friendly)
async function deleteCollection(collPath, batchSize = 300) {
  const collRef = db.collection(collPath);
  while (true) {
    const snap = await collRef.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

// MAIN
(async () => {
  console.log("🩺 Seeding Firestore with HeartLink four-band data…");

  // Clean slate for emulator
  await deleteCollection("patients");
  console.log("🧹 Cleared collection: patients");

  const patients = [];
  for (let i = 0; i < NUM_PATIENTS; i++) {
    const id = `PAT${String(i + 1).padStart(3, "0")}`;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const isActive = Math.random() < ACTIVE_RATIO;

    // Join date spread across last 120 days
    const joinDaysAgo = rint(0, 120);
    const joinDate = new Date(today.getTime() - joinDaysAgo * dayMs);
    const joinDateStr = fmt(joinDate);

    const patient = {
      id,
      name,
      status: isActive ? "Active" : "Discharged",
      joinDate: joinDateStr,
      // Placeholder; we’ll update with latest actual check-in below
      lastCheckIn: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    patients.push(patient);
  }

  // Write patients first
  const batch1 = db.batch();
  patients.forEach((p) => {
    const ref = db.collection("patients").doc(p.id);
    batch1.set(ref, p);
  });
  await batch1.commit();
  console.log(`👤 Seeded ${patients.length} patients`);

  // Seed check-ins (90 days window)
  let totalCheckins = 0;
  for (const p of patients) {
    const checksRef = db.collection("patients").doc(p.id).collection("checkins");
    let latest = null;

    // Patient bias keeps some users consistently better/worse
    const bias = rand(-1, 1);

    for (let d = DAYS - 1; d >= 0; d--) {
      const dateObj = new Date(today.getTime() - d * dayMs);
      // Skip dates before join
      if (dateObj < new Date(p.joinDate)) continue;

      // Discharged patients: only occasional early check-ins
      const activeToday = p.status === "Active";
      const willCheckIn =
        activeToday ? Math.random() < CHECKIN_PROBABILITY : Math.random() < 0.1;

      if (!willCheckIn) continue;

      const { wellness, adherence } = genSignal(DAYS - 1 - d, bias);
      const aseCategory = aseFrom(wellness, adherence);

      const doc = {
        date: fmt(dateObj),
        adherenceRate: adherence, // 0–100
        wellnessIndex: wellness, // 0–5
        aseCategory, // "Green" | "Yellow" | "Orange" | "Red"
        createdAt: FieldValue.serverTimestamp(),
      };
      await checksRef.doc(doc.date).set(doc);
      latest = doc.date;
      totalCheckins++;
    }

    // Update lastCheckIn if we wrote any
    if (latest) {
      await db.collection("patients").doc(p.id).update({
        lastCheckIn: latest,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  console.log(`🗓️ Seeded ~${totalCheckins} daily check-ins over ${DAYS} days`);

  // Helpful console tips to validate in your UI
  console.log("\n✅ Seed complete.");
  console.log("• Patients:            patients (id, name, status, joinDate, lastCheckIn)");
  console.log("• Per-patient checkins patients/{id}/checkins (date, adherenceRate, wellnessIndex, aseCategory)");
  console.log("\nNow reload your Reports page. If any panel is empty:");
  console.log("  - Confirm FIRESTORE_EMULATOR_HOST is set to 127.0.0.1:8081");
  console.log("  - Confirm 'Active' logic (joinDate + ≥1 check-in in 30d) sees recent data");
  console.log("  - Verify timeRange = 30d/90d in your UI controls");
  process.exit(0);
})().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
