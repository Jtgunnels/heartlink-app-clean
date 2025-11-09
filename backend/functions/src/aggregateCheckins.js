import { onDocumentWritten } from "firebase-functions/v2/firestore";
import admin from "firebase-admin";

const db = admin.firestore();

export const aggregateCheckins = onDocumentWritten(
  "providers/{providerId}/checkins/{id}",
  async (change, ctx) => {
    const providerId = ctx.params.providerId;
    await db.doc(`aggregates/providers/${providerId}`).set(
      {
        totalCheckins: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);
