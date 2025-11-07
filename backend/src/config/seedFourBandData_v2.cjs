/**
 * HeartLink — Firestore Emulator Seeder (Four-Band) v2.1
 * CommonJS + Firebase Admin SDK (no security rules required)
 */

const admin = require("firebase-admin");

// 🔧 Force Admin SDK to use local Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";

// Initialize Admin App
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "heartlink-provider-platform" });
}
const db = admin.firestore();

const PATIENT_COUNT = 10;
const DAYS = 90;

// Minimal sample name lists (no faker dependency)
const FIRST = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Peyton", "Avery", "Rowan", "Jamie"];
const LAST = ["Lee", "Garcia", "Kim", "Nguyen", "Patel", "Brown", "Martinez", "Wilson", "Davis", "Clark"];
const fullName = (i) => `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;

// ASE severity distributions
const ASE_PROFILES = {
  stable:   { Green: 0.6, Yellow: 0.25, Orange: 0.1, Red: 0.05 },
  mild:     { Green: 0.3, Yellow: 0.4,  Orange: 0.2, Red: 0.1 },
  moderate: { Green: 0.15, Yellow: 0.35, Orange: 0.3, Red: 0.2 },
  severe:   { Green: 0.05, Yellow: 0.25, Orange: 0.4, Red: 0.3 },
};
const PROFILES = Object.keys(ASE_PROFILES);

// Utility
function rand(min, max) { return Math.random() * (max - min) + min; }
function round(v, p) { const m = Math.pow(10, p); return Math.round(v * m) / m; }
function isoDay(d) { return d.toISOString().slice(0, 10); }

function pickProfile(i) { return PROFILES[i % PROFILES.length]; }

function weightedRandom(profile) {
  const r = Math.random();
  let acc = 0;
  for (const [band, prob] of Object.entries(profile)) {
    acc += prob;
    if (r <= acc) return band;
  }
  return "Green";
}

function vitalsFor(ase) {
  switch (ase) {
    case "Green": return { wellnessIndex: round(rand(3.6, 5.0), 2), adherenceRate: round(rand(85, 100), 1) };
    case "Yellow": return { wellnessIndex: round(rand(3.0, 3.9), 2), adherenceRate: round(rand(70, 85), 1) };
    case "Orange": return { wellnessIndex: round(rand(2.2, 3.2), 2), adherenceRate: round(rand(55, 75), 1) };
    case "Red": return { wellnessIndex: round(rand(1.0, 2.5), 2), adherenceRate: round(rand(35, 60), 1) };
    default: return { wellnessIndex: 3.0, adherenceRate: 70.0 };
  }
}

function driftProfile(base, t) {
  const shift = 0.1 + 0.05 * t; // gradual worsening
  let Green = Math.max(0, base.Green - shift * 0.7);
  let Yellow = Math.max(0, base.Yellow - shift * 0.3);
  let Orange = base.Orange + shift * 0.6;
  let Red = base.Red + shift * 0.4;
  const total = Green + Yellow + Orange + Red;
  Green /= total; Yellow /= total; Orange /= total; Red /= total;
  return { Green, Yellow, Orange, Red };
}

async function seed() {
  console.log("🩺 HeartLink Firestore Emulator Seeder (v2.1)");
  console.log("🧩 Using emulator at", process.env.FIRESTORE_EMULATOR_HOST);
  const baseDate = new Date();

  for (let i = 1; i <= PATIENT_COUNT; i++) {
    const patientId = `PAT${String(i).padStart(3, "0")}`;
    const profileName = pickProfile(i - 1);
    const baseProfile = ASE_PROFILES[profileName];

    const joinOffset = Math.floor(rand(10, 60));
    const joinDate = new Date(baseDate.getTime() - joinOffset * 86400000);

    const patientDoc = {
      id: patientId,
      name: fullName(i),
      status: "Active",
      joinDate: joinDate.toISOString(),
      lastCheckIn: baseDate.toISOString(),
      aseProfileType: profileName,
    };

    await db.collection("patients").doc(patientId).set(patientDoc);

    for (let d = 0; d < DAYS; d++) {
      const date = new Date(baseDate.getTime() - d * 86400000);
      const drifted = driftProfile(baseProfile, d / DAYS);
      const aseCategory = weightedRandom(drifted);
      const { wellnessIndex, adherenceRate } = vitalsFor(aseCategory);
      const checkin = {
        date: date.toISOString(),
        aseCategory,
        wellnessIndex,
        adherenceRate,
      };
      await db.collection("patients").doc(patientId).collection("checkins").doc(isoDay(date)).set(checkin);
    }

    console.log(`✅ Seeded ${patientId} (${profileName})`);
  }

  console.log("🎉 Done — Refresh your Reports page to view results.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding error:", err);
  process.exit(1);
});
