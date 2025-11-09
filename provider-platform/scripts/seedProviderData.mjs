// scripts/seedProviderData.mjs
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// --- Load your existing Vite-style envs (works fine in Node with dotenv) ---
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('Missing Firebase env vars. Check your .env VITE_* keys.');
  process.exit(1);
}

// ✅ Initialize app *before* using getAuth or getFirestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ✅ Sign in your test provider/admin account before writing
await signInWithEmailAndPassword(auth, "admin@heartlink.app", "Gobears20!");

// --- CLI args ---
const PROVIDER_ID = process.argv[2];
const TIER = (process.argv[3] || 'Gold');

if (!PROVIDER_ID) {
  console.error('Usage: node scripts/seedProviderData.mjs <PROVIDER_ID> [Tier]');
  process.exit(1);
}

// --- helpers ---
const now = new Date();
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

const patients = [
  { id: 'PAT001', name: 'Debbie Conn', status: 'Active', aseCategory: 'Minor Change' },
  { id: 'PAT002', name: 'Andre Kuhn',  status: 'Active', aseCategory: 'Minor Change' },
  { id: 'PAT003', name: 'Tina Bahringer', status: 'Active', aseCategory: 'Needs Immediate Review' },
  { id: 'PAT004', name: 'Regina Schmidt', status: 'Active', aseCategory: 'Stable' },
  { id: 'PAT005', name: 'Devin Ullrich', status: 'Active', aseCategory: 'Review Recommended' },
];

const catCycle = ['Stable','Minor Change','Review Recommended','Needs Immediate Review'];
function makeCheckins(forPatientId) {
  const out = [];
  for (let d = 0; d < 14; d++) {
    const when = daysAgo(14 - d);
    const cat = catCycle[(d + forPatientId.charCodeAt(forPatientId.length-1)) % catCycle.length];
    out.push({
      patientId: forPatientId,
      timestamp: when,
      category: cat,
      adherence: Math.round(60 + Math.random() * 40),
      ssi: Number((2 + Math.random() * 3).toFixed(2)),
      sobLevel: Math.floor(Math.random()*3),
      edemaLevel: Math.floor(Math.random()*3),
      fatigueLevel: Math.floor(Math.random()*3),
    });
  }
  return out;
}

(async () => {
  // 1) provider doc (tier lives here)
  await setDoc(doc(db, 'providers', PROVIDER_ID), {
    name: 'Test Provider',
    tier: TIER,
    createdAt: now,
  });

  // 2) patients under providers/{id}/patients
  const batch1 = writeBatch(db);
  for (const p of patients) {
    batch1.set(doc(db, `providers/${PROVIDER_ID}/patients/${p.id}`), {
      name: p.name,
      status: p.status,
      aseCategory: p.aseCategory,
      createdAt: now,
    });
  }
  await batch1.commit();

  // 3) checkins under providers/{id}/checkins
  const batch2 = writeBatch(db);
  const checkinsCol = collection(db, `providers/${PROVIDER_ID}/checkins`);
  for (const p of patients) {
    for (const c of makeCheckins(p.id)) {
      const newRef = doc(checkinsCol);
      batch2.set(newRef, c);
    }
  }
  await batch2.commit();

  console.log(`Seed complete for provider ${PROVIDER_ID} with tier ${TIER}.`);
  console.log(`Patients: ${patients.length}, Check-ins: ~${patients.length * 14}.`);
})();
