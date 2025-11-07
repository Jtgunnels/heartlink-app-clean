/**
 * HeartLink Provider Platform — Advanced Firestore Seeder
 * Simulates 75 patients across all ASE categories with realistic variation.
 *
 * Usage (Emulator mode):
 *   $ cross-env FIREBASE_MODE=emulator node src/config/seedPatients_advanced.js
 *
 * NOTE: Safe for emulator; not production-seeding script.
 */

import { db } from "./db.js";
import { faker } from "@faker-js/faker";

const providerID = "demoProvider";

// === Parameters ===
const PATIENT_COUNT = 75;
const CHECKINS_PER_PATIENT = 10; // number of daily check-ins
const symptomLevels = ["None", "Mild", "Moderate", "Severe"];
const trendOptions = ["better", "same", "worse"];
const categories = [
  "Stable",
  "Minor Change",
  "Review Recommended",
  "Needs Immediate Review",
];

// === Helpers ===
function randomSymptom() {
  return faker.helpers.arrayElement(symptomLevels);
}
function randomTrend() {
  return faker.helpers.arrayElement(trendOptions);
}
function randomCategory() {
  // Slightly bias toward stable for realism
  const roll = Math.random();
  if (roll < 0.45) return "Stable";
  if (roll < 0.65) return "Minor Change";
  if (roll < 0.85) return "Review Recommended";
  return "Needs Immediate Review";
}

async function seedPatientsAdvanced() {
  console.log(`\n🩺 Seeding ${PATIENT_COUNT} advanced patients for provider: ${providerID}...\n`);

  const providerRef = db.collection("providers").doc(providerID);
  const patientsRef = providerRef.collection("patients");

  // optional: clear existing
  const oldPatients = await patientsRef.get();
  for (const doc of oldPatients.docs) {
    await doc.ref.delete();
  }

  const now = Date.now();

  for (let i = 1; i <= PATIENT_COUNT; i++) {
    const code = `PAT${i.toString().padStart(3, "0")}`;
    const baselineWeight = faker.number.int({ min: 130, max: 220 });
    const aseCategory = randomCategory();

    const baseline = {
      sobLevel: faker.helpers.arrayElement(symptomLevels),
      edemaLevel: faker.helpers.arrayElement(symptomLevels),
      fatigueLevel: faker.helpers.arrayElement(symptomLevels),
      orthopnea: faker.datatype.boolean(),
      weightToday: baselineWeight,
    };

    const patientData = {
      name: faker.person.fullName(),
      status: "Active",
      aseCategory,
      reviewed: Math.random() > 0.3 ? true : false,
      baseline,
      prevWeights: [
        baselineWeight - 2,
        baselineWeight - 1,
        baselineWeight,
        baselineWeight + 1,
      ],
      createdAt: new Date(now - faker.number.int({ min: 5, max: 45 }) * 86400000).toISOString(),
      lastUpdated: new Date(now - faker.number.int({ min: 0, max: 2 }) * 86400000).toISOString(),
    };

    const patientDoc = patientsRef.doc(code);
    await patientDoc.set(patientData);

    // --- Generate Check-ins ---
    const checkinsRef = patientDoc.collection("checkins");

    for (let j = 0; j < CHECKINS_PER_PATIENT; j++) {
      const timestamp = new Date(now - j * 86400000);
      const sobLevel = randomSymptom();
      const edemaLevel = randomSymptom();
      const fatigueLevel = randomSymptom();
      const orthopnea = faker.datatype.boolean();
      const weightToday = baselineWeight + faker.number.int({ min: -5, max: 5 });
      const sobTrend = randomTrend();
      const edemaTrend = randomTrend();
      const fatigueTrend = randomTrend();

      const cat = (() => {
        if (aseCategory === "Needs Immediate Review") return "Needs Immediate Review";
        if (aseCategory === "Review Recommended") return "Review Recommended";
        if (aseCategory === "Minor Change") return "Minor Change";
        if (sobTrend === "worse" || edemaTrend === "worse" || fatigueTrend === "worse")
          return faker.helpers.arrayElement(["Review Recommended", "Needs Immediate Review"]);
        return faker.helpers.arrayElement(categories);
      })();

      const shortReason = (() => {
        switch (cat) {
          case "Needs Immediate Review":
            return faker.helpers.arrayElement([
              "Worsening edema",
              "Increased SOB",
              "Rapid weight gain",
            ]);
          case "Review Recommended":
            return faker.helpers.arrayElement([
              "Mild symptom increase",
              "Slight fatigue rise",
              "Minor weight fluctuation",
            ]);
          case "Minor Change":
            return "Small day-to-day variation";
          default:
            return "No significant change";
        }
      })();

      await checkinsRef.add({
        timestamp: timestamp.toISOString(),
        sobLevel,
        edemaLevel,
        fatigueLevel,
        orthopnea,
        weightToday,
        sobTrend,
        edemaTrend,
        fatigueTrend,
        category: cat,
        shortReason,
      });
    }

    if (i % 10 === 0) console.log(`  → ${i} patients added...`);
  }

  console.log(`\n✅ Successfully seeded ${PATIENT_COUNT} patients with ${CHECKINS_PER_PATIENT} check-ins each!\n`);
  console.log("You can now open the dashboard to test pagination, sorting, and reports.");
  process.exit(0);
}

seedPatientsAdvanced().catch((err) => {
  console.error("❌ Seeder error:", err);
  process.exit(1);
});
