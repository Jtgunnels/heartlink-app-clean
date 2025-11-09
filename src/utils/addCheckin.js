import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getAuth } from "firebase/auth";

export async function addCheckIn({ patientId, category, sobLevel, edemaLevel, fatigueLevel, ssi }) {
  const auth = getAuth();
  const token = await auth.currentUser.getIdTokenResult(true);
  const providerId = token.claims.provider_id;
  if (!providerId) throw new Error("Missing provider_id claim");

  const doc = {
    patientId,
    category,
    sobLevel,
    edemaLevel,
    fatigueLevel,
    ssi: typeof ssi === "number" ? ssi : null,
    timestamp: Timestamp.now(),
  };

  await addDoc(collection(db, `providers/${providerId}/checkins`), doc);
}
