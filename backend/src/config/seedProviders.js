import { db } from "./db.js";
import { collection, doc, setDoc } from "firebase/firestore";

async function seedProviders() {
  const ref = doc(collection(db, "providers"), "demoProvider");
  await setDoc(ref, {
    name: "HeartLink Demo Provider",
    tier: "Gold",
    email: "demo@heartlink.app",
    createdAt: new Date().toISOString(),
  });
  console.log("✅ Seeded provider: demoProvider (Gold)");
}

seedProviders().catch(console.error);
