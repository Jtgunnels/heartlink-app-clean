// -----------------------------------------------------------------------------
// HeartLink Provider Platform — Firestore Seed Script (Patients + Reports)
// Seeds demo patient documents and check-in subcollections that align with the
// snapshot helpers used across Dashboard, Patients, and Reports views.
// Works against the Firestore emulator (default) or production credentials.
// -----------------------------------------------------------------------------

import dotenv from "dotenv";
import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";
  console.log(`🧩 Firestore Emulator forced: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

let app;
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("🧩 Firestore Emulator detected — skipping credentials.");
  app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "heartlink-provider-platform",
  });
} else {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(fs.readFileSync("./heartlink-firebase-key.json", "utf8"));
  } catch {
    throw new Error("❌ Service account file missing and no emulator detected.");
  }
  app = initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const PROVIDER_ID = "demoProvider";
const MS_PER_DAY = 86400000;
const today = new Date();
today.setHours(12, 0, 0, 0);

const demoPatients = [
  {
    id: "PAT001",
    name: "Marjorie Diaz",
    status: "Active",
    programTier: "Tier 2",
    aseCategory: "Stable",
    stabilityScore: 86,
    joinDaysAgo: 160,
    baseline: {
      sobLevel: "Mild",
      edemaLevel: "None",
      fatigueLevel: "Mild",
      orthopnea: false,
      weightToday: 156.2,
    },
    prevWeights: [156.2, 155.8, 155.5, 155.2],
    checkins: [
      {
        daysAgo: 28,
        adherenceRate: 88,
        wellnessIndex: 4.1,
        aseCategory: "Stable",
        sobLevel: "Mild",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "Mild",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 155.9,
      },
      {
        daysAgo: 21,
        adherenceRate: 90,
        wellnessIndex: 4.3,
        aseCategory: "Stable",
        sobLevel: "Mild",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "Mild",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 155.5,
      },
      {
        daysAgo: 14,
        adherenceRate: 92,
        wellnessIndex: 4.4,
        aseCategory: "Stable",
        sobLevel: "Mild",
        sobTrend: "same",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 155.1,
      },
      {
        daysAgo: 7,
        adherenceRate: 93,
        wellnessIndex: 4.5,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 154.9,
      },
      {
        daysAgo: 2,
        adherenceRate: 94,
        wellnessIndex: 4.6,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 154.7,
      },
    ],
  },
  {
    id: "PAT002",
    name: "Anthony Reed",
    status: "Active",
    programTier: "Tier 1",
    aseCategory: "Minor Change",
    stabilityScore: 72,
    joinDaysAgo: 90,
    baseline: {
      sobLevel: "None",
      edemaLevel: "None",
      fatigueLevel: "Mild",
      orthopnea: false,
      weightToday: 182.4,
    },
    prevWeights: [182.4, 182.9, 183.3, 183.8],
    checkins: [
      {
        daysAgo: 30,
        adherenceRate: 85,
        wellnessIndex: 3.9,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "same",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "Mild",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 183,
      },
      {
        daysAgo: 20,
        adherenceRate: 82,
        wellnessIndex: 3.7,
        aseCategory: "Minor Change",
        sobLevel: "Mild",
        sobTrend: "worse",
        edemaLevel: "Mild",
        edemaTrend: "same",
        fatigueLevel: "Moderate",
        fatigueTrend: "worse",
        orthopnea: false,
        weightToday: 183.4,
      },
      {
        daysAgo: 14,
        adherenceRate: 80,
        wellnessIndex: 3.5,
        aseCategory: "Minor Change",
        sobLevel: "Mild",
        sobTrend: "worse",
        edemaLevel: "Mild",
        edemaTrend: "worse",
        fatigueLevel: "Moderate",
        fatigueTrend: "worse",
        orthopnea: false,
        weightToday: 183.8,
      },
      {
        daysAgo: 7,
        adherenceRate: 78,
        wellnessIndex: 3.4,
        aseCategory: "Minor Change",
        sobLevel: "Mild",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Moderate",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 184.1,
      },
      {
        daysAgo: 3,
        adherenceRate: 79,
        wellnessIndex: 3.5,
        aseCategory: "Minor Change",
        sobLevel: "Mild",
        sobTrend: "same",
        edemaLevel: "Moderate",
        edemaTrend: "same",
        fatigueLevel: "Moderate",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 184,
      },
      {
        daysAgo: 1,
        adherenceRate: 81,
        wellnessIndex: 3.6,
        aseCategory: "Minor Change",
        sobLevel: "Mild",
        sobTrend: "same",
        edemaLevel: "Mild",
        edemaTrend: "better",
        fatigueLevel: "Moderate",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 183.7,
      },
    ],
  },
  {
    id: "PAT003",
    name: "Danielle Wu",
    status: "Active",
    programTier: "Tier 3",
    aseCategory: "Review Recommended",
    stabilityScore: 64,
    joinDaysAgo: 120,
    baseline: {
      sobLevel: "Mild",
      edemaLevel: "Mild",
      fatigueLevel: "Moderate",
      orthopnea: false,
      weightToday: 168.5,
    },
    prevWeights: [168.5, 169.1, 169.8, 170.4],
    checkins: [
      {
        daysAgo: 35,
        adherenceRate: 76,
        wellnessIndex: 3.4,
        aseCategory: "Minor Change",
        sobLevel: "Moderate",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Moderate",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 170.1,
      },
      {
        daysAgo: 21,
        adherenceRate: 74,
        wellnessIndex: 3.2,
        aseCategory: "Review Recommended",
        sobLevel: "Moderate",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Moderate",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 170.6,
      },
      {
        daysAgo: 14,
        adherenceRate: 72,
        wellnessIndex: 3.1,
        aseCategory: "Review Recommended",
        sobLevel: "Moderate",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 171,
      },
      {
        daysAgo: 7,
        adherenceRate: 70,
        wellnessIndex: 3,
        aseCategory: "Review Recommended",
        sobLevel: "Moderate",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 171.2,
      },
      {
        daysAgo: 2,
        adherenceRate: 69,
        wellnessIndex: 2.9,
        aseCategory: "Review Recommended",
        sobLevel: "Moderate",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 171.4,
      },
    ],
  },
  {
    id: "PAT004",
    name: "Linda Herrera",
    status: "Active",
    programTier: "Tier 3",
    aseCategory: "Needs Immediate Review",
    stabilityScore: 52,
    joinDaysAgo: 62,
    baseline: {
      sobLevel: "Mild",
      edemaLevel: "None",
      fatigueLevel: "Mild",
      orthopnea: false,
      weightToday: 202.3,
    },
    prevWeights: [202.3, 203.1, 204.2, 205.7],
    checkins: [
      {
        daysAgo: 21,
        adherenceRate: 65,
        wellnessIndex: 2.6,
        aseCategory: "Review Recommended",
        sobLevel: "Moderate",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Moderate",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 205,
      },
      {
        daysAgo: 14,
        adherenceRate: 60,
        wellnessIndex: 2.4,
        aseCategory: "Needs Immediate Review",
        sobLevel: "Severe",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 206,
      },
      {
        daysAgo: 7,
        adherenceRate: 58,
        wellnessIndex: 2.2,
        aseCategory: "Needs Immediate Review",
        sobLevel: "Severe",
        sobTrend: "worse",
        edemaLevel: "Moderate",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 206.5,
      },
      {
        daysAgo: 3,
        adherenceRate: 56,
        wellnessIndex: 2,
        aseCategory: "Needs Immediate Review",
        sobLevel: "Severe",
        sobTrend: "worse",
        edemaLevel: "Severe",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 207,
      },
      {
        daysAgo: 1,
        adherenceRate: 55,
        wellnessIndex: 1.9,
        aseCategory: "Needs Immediate Review",
        sobLevel: "Severe",
        sobTrend: "worse",
        edemaLevel: "Severe",
        edemaTrend: "worse",
        fatigueLevel: "Severe",
        fatigueTrend: "worse",
        orthopnea: true,
        weightToday: 207.4,
      },
    ],
  },
  {
    id: "PAT005",
    name: "Ravi Patel",
    status: "Active",
    programTier: "Tier 1",
    aseCategory: "Stable",
    stabilityScore: 88,
    joinDaysAgo: 46,
    baseline: {
      sobLevel: "None",
      edemaLevel: "None",
      fatigueLevel: "Mild",
      orthopnea: false,
      weightToday: 142.6,
    },
    prevWeights: [142.6, 142.4, 142.1, 141.9],
    checkins: [
      {
        daysAgo: 14,
        adherenceRate: 88,
        wellnessIndex: 4,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "same",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "Mild",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 141.8,
      },
      {
        daysAgo: 10,
        adherenceRate: 89,
        wellnessIndex: 4.1,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "Mild",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 141.6,
      },
      {
        daysAgo: 6,
        adherenceRate: 91,
        wellnessIndex: 4.3,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 141.4,
      },
      {
        daysAgo: 3,
        adherenceRate: 93,
        wellnessIndex: 4.4,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 141.2,
      },
      {
        daysAgo: 1,
        adherenceRate: 94,
        wellnessIndex: 4.5,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 141.1,
      },
    ],
  },
  {
    id: "PAT006",
    name: "Evelyn Harper",
    status: "Discharged",
    programTier: "Tier 1",
    aseCategory: "Stable",
    stabilityScore: 90,
    joinDaysAgo: 210,
    baseline: {
      sobLevel: "None",
      edemaLevel: "None",
      fatigueLevel: "None",
      orthopnea: false,
      weightToday: 135.2,
    },
    prevWeights: [135.2, 134.9, 134.6, 134.4],
    checkins: [
      {
        daysAgo: 60,
        adherenceRate: 95,
        wellnessIndex: 4.7,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 134.4,
      },
      {
        daysAgo: 45,
        adherenceRate: 94,
        wellnessIndex: 4.6,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "better",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "better",
        orthopnea: false,
        weightToday: 134.3,
      },
      {
        daysAgo: 30,
        adherenceRate: 93,
        wellnessIndex: 4.6,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "same",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 134.2,
      },
      {
        daysAgo: 14,
        adherenceRate: 92,
        wellnessIndex: 4.5,
        aseCategory: "Stable",
        sobLevel: "None",
        sobTrend: "same",
        edemaLevel: "None",
        edemaTrend: "same",
        fatigueLevel: "None",
        fatigueTrend: "same",
        orthopnea: false,
        weightToday: 134.1,
      },
    ],
  },
];

function isoDaysAgo(days) {
  const date = new Date(today.getTime() - days * MS_PER_DAY);
  date.setHours(12, 0, 0, 0);
  return date;
}

function preparePatient(template) {
  const checkins = template.checkins
    .map((item, index) => {
      const date = isoDaysAgo(item.daysAgo);
      return {
        id: `checkin-${String(index + 1).padStart(2, "0")}`,
        date,
        adherenceRate: Number(item.adherenceRate),
        wellnessIndex: Number(item.wellnessIndex),
        aseCategory: item.aseCategory,
        sobLevel: item.sobLevel,
        sobTrend: item.sobTrend,
        edemaLevel: item.edemaLevel,
        edemaTrend: item.edemaTrend,
        fatigueLevel: item.fatigueLevel,
        fatigueTrend: item.fatigueTrend,
        orthopnea: item.orthopnea,
        weightToday: Number(item.weightToday),
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const adherenceAvg =
    checkins.reduce((sum, entry) => sum + entry.adherenceRate, 0) / checkins.length;
  const wellnessAvg =
    checkins.reduce((sum, entry) => sum + entry.wellnessIndex, 0) / checkins.length;
  const latest = checkins[checkins.length - 1];

  const joinDate = isoDaysAgo(template.joinDaysAgo);
  const status = template.status || "Active";

  return {
    meta: {
      id: template.id,
      name: template.name,
      patientCode: template.id,
      status,
      aseCategory: latest?.aseCategory || template.aseCategory || "Stable",
      stabilityScore: template.stabilityScore,
      programTier: template.programTier || "Tier 1",
      joinDate,
      lastCheckIn: latest?.date ?? joinDate,
      adherenceRate: Number(adherenceAvg.toFixed(1)),
      wellnessIndex: Number(wellnessAvg.toFixed(2)),
      baseline: template.baseline || {},
      prevWeights: template.prevWeights || [],
      createdAt: today,
      updatedAt: today,
    },
    checkins,
  };
}

async function deleteCollection(collectionRef) {
  const docs = await collectionRef.listDocuments();
  for (const docRef of docs) {
    const subcollections = await docRef.listCollections();
    for (const sub of subcollections) {
      await deleteCollection(sub);
    }
    await docRef.delete();
  }
}

async function seedPatientCollection(basePath, patients) {
  const collectionRef = db.collection(basePath);
  await deleteCollection(collectionRef);

  for (const patient of patients) {
    const docRef = collectionRef.doc(patient.meta.id);
    const { checkins, meta } = patient;

    await docRef.set(meta);

    const checkinsRef = docRef.collection("checkins");
    for (const entry of checkins) {
      const { id, ...fields } = entry;
      await checkinsRef.doc(id).set(fields);
    }
  }
}

async function seedReportsLayers(patients) {
  const enrollmentRef = db.collection("enrollmentSummary").doc("currentMonth");
  const now = today.toLocaleString("default", { month: "short", year: "numeric" });

  const activePatients = patients.filter((p) => p.meta.status.toLowerCase() === "active");
  const newPatients = activePatients.filter((p) => {
    const diffDays = (today.getTime() - p.meta.joinDate.getTime()) / MS_PER_DAY;
    return diffDays <= 30;
  });
  const discharged = patients.filter((p) => p.meta.status.toLowerCase() === "discharged");

  await enrollmentRef.set({
    label: now,
    value: activePatients.length,
    newPatients: newPatients.length,
    discharged: discharged.length,
  });

  const populationRef = db.collection("populationWellness").doc("summary");
  const avgWellness =
    patients.reduce((sum, patient) => sum + patient.meta.wellnessIndex, 0) / patients.length;
  await populationRef.set({
    label: "Average Wellness",
    value: Number(avgWellness.toFixed(2)),
    wellnessIndex: Number(avgWellness.toFixed(2)),
  });

  const stabilityRef = db.collection("patientStability");
  await deleteCollection(stabilityRef);
  for (const patient of patients) {
    await stabilityRef.doc(patient.meta.id).set({
      label: patient.meta.id,
      value: patient.meta.stabilityScore,
    });
  }

  const adherenceRef = db.collection("checkInAdherence");
  await deleteCollection(adherenceRef);
  for (const patient of patients) {
    await adherenceRef.doc(patient.meta.id).set({
      label: patient.meta.id,
      value: patient.meta.adherenceRate,
    });
  }

  const trendRef = db.collection("trendOverTime");
  await deleteCollection(trendRef);
  for (const patient of patients) {
    const improving = patient.checkins.filter(
      (entry) =>
        entry.sobTrend === "better" ||
        entry.edemaTrend === "better" ||
        entry.fatigueTrend === "better"
    ).length;
    const trendScore = Math.round((improving / patient.checkins.length) * 100);
    await trendRef.doc(patient.meta.id).set({
      label: patient.meta.id,
      value: trendScore,
    });
  }
}

async function seedReports() {
  console.log("🩺 Seeding HeartLink demo patients and analytics layers...");
  const prepared = demoPatients.map(preparePatient);

  await seedPatientCollection("providers/" + PROVIDER_ID + "/patients", prepared);
  await seedPatientCollection("patients", prepared);

  console.log(`✅ Seeded ${prepared.length} patient documents (provider + root collections).`);

  await seedReportsLayers(prepared);

  console.log("✅ Analytics collections refreshed.");
  console.log("🎉 Firestore seeding complete — ready for testing.");
}

seedReports()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
