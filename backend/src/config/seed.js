/**
 * HeartLink Provider Platform – Firestore Patient Seeder
 * Populates patients + checkins collections for the specified provider.
 *
 * Usage (Emulator or Production):
 *  $ cross-env FIREBASE_MODE=emulator node src/config/seedPatients.js
 *  or
 *  $ cross-env FIREBASE_MODE=prod node src/config/seedPatients.js
 */

import { db } from "./db.js";
import { faker } from "@faker-js/faker";

// Configurable Provider
const providerID = "demoProvider";

// Symptom value helpers
const symptomLevels = ["None", "Mild", "Moderate", "Severe"];
const trendOptions = ["better", "same", "worse"];

function randomSymptom() {
  return symptomLevels[Math.floor(Math.random() * symptomLevels.length)];
}
function randomTrend() {
  return trendOptions[Math.floor(Math.random() * trendOptions.length)];
}

async function seedPatients() {
  console.log(`\n🩺 Seeding test patients for provider: ${providerID}...\n`);

  const providerRef = db.collection("providers").doc(providerID);
  const patientsRef = providerRef.collection("patients");

  // optional: clear existing
  const oldPatients = await patientsRef.get();
  for (const doc of oldPatients.docs) {
    await doc.ref.delete();
  }

  const now = Date.now();
  const patientCount = 8;

  for (let i = 1; i <= patientCount; i++) {
    const code = `PAT${i.toString().padStart(3, "0")}`;
    const baselineWeight = faker.number.int({ min: 150, max: 200 });

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
      aseCategory: "Stable",
      baseline,
      prevWeights: [baselineWeight - 2, baselineWeight - 1, baselineWeight],
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    const patientDoc = patientsRef.doc(code);
    await patientDoc.set(patientData);

    // add check-ins
    const checkinsRef = patientDoc.collection("checkins");

    const checkinCount = 4;
    for (let j = 0; j < checkinCount; j++) {
      const timestamp = new Date(now - j * 24 * 60 * 60 * 1000);
      const sobLevel = randomSymptom();
      const edemaLevel = randomSymptom();
      const fatigueLevel = randomSymptom();
      const orthopnea = faker.datatype.boolean();
      const weightToday = baselineWeight + faker.number.int({ min: -4, max: 4 });

      const sobTrend = randomTrend();
      const edemaTrend = randomTrend();
      const fatigueTrend = randomTrend();

      const category = (() => {
        if (sobTrend === "worse" || edemaTrend === "worse" || fatigueTrend === "worse")
          return faker.helpers.arrayElement(["Review Recommended", "Needs Immediate Review"]);
        if (sobTrend === "better" && edemaTrend === "better" && fatigueTrend === "better")
          return "Improving";
        return "Stable";
      })();

      const shortReason = (() => {
        if (category === "Needs Immediate Review") return "Worsening symptoms";
        if (category === "Review Recommended") return "Symptom increase";
        if (category === "Improving") return "Symptom improvement";
        return "No notable change";
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
        category,
        shortReason,
      });
    }
  }

  console.log(`✅ Successfully seeded ${patientCount} patients with check-ins!\n`);
  console.log("You can now visit your dashboard or run:");
  console.log(`curl -s http://localhost:5050/api/patients/${providerID} | jq .`);
  process.exit(0);
}

seedPatients().catch((err) => {
  console.error("❌ Seeder error:", err);
  process.exit(1);
});
