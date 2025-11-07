// HeartLink Provider Platform — seedAll.js
// Populates Firestore Emulator with demoProvider (Gold) + sample patients & check-ins.

import admin from "firebase-admin";

// --- Initialize Firebase Admin (Emulator-safe) ---
if (!admin.apps.length) {
  admin.initializeApp({ projectId: "heartlink-provider-platform" });
}
const db = admin.firestore();
db.settings({ host: "127.0.0.1:8081", ssl: false });
console.log("🧩 Firebase Admin running in EMULATOR mode — no credentials required");
console.log("📡 Connected Firebase Admin to Firestore Emulator (127.0.0.1:8081)");

// --- Utility helpers ---
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const random = (min, max) => Math.round(Math.random() * (max - min) + min);
const aseCategories = [
  "Stable",
  "Minor Change",
  "Review Recommended",
  "Needs Immediate Review",
];

// --- 1️⃣ Seed provider record ---
async function seedProvider() {
  const providerRef = db.collection("providers").doc("demoProvider");
  await providerRef.set({
    name: "HeartLink Demo Provider",
    tier: "Gold",
    email: "demo@heartlink.app",
    createdAt: new Date().toISOString(),
  });
  console.log("✅ Seeded provider: demoProvider (Gold)");
}

// --- 2️⃣ Seed patients + check-ins ---
async function seedPatients() {
  const patients = [
    { id: "PAT001", name: "Debbie Conn", aseCategory: "Stable" },
    { id: "PAT002", name: "Andre Kuhn", aseCategory: "Minor Change" },
    { id: "PAT003", name: "Tina Bahringer", aseCategory: "Review Recommended" },
    { id: "PAT004", name: "Regina Schmidt", aseCategory: "Needs Immediate Review" },
    { id: "PAT005", name: "Devin Ullrich", aseCategory: "Stable" },
  ];

  const now = new Date();
  for (const p of patients) {
    const patRef = db.collection("patients").doc(p.id);
    await patRef.set({
      id: p.id,
      name: p.name,
      aseCategory: p.aseCategory,
      status: "Active",
      joinDate: new Date(now.getTime() - random(1, 60) * 86400000).toISOString(),
    });

    // create 5 check-ins per patient (past 5 days)
    for (let i = 0; i < 5; i++) {
      const date = new Date(now.getTime() - i * 86400000).toISOString();
      const checkin = {
        date,
        adherenceRate: random(60, 100),
        wellnessIndex: Number((Math.random() * 5).toFixed(2)),
        aseCategory: aseCategories[random(0, aseCategories.length - 1)],
      };
      await patRef.collection("checkins").add(checkin);
    }
    console.log(`👤 Seeded patient ${p.id} with 5 check-ins`);
    await delay(100); // smooth write pacing
  }
  console.log(`✅ Seeded ${patients.length} patients with daily check-ins`);
}

// --- 3️⃣ Run all seeds ---
(async () => {
  try {
    await seedProvider();
    await seedPatients();
    console.log("🎉 All demo data seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
})();
