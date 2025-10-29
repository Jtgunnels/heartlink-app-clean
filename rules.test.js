/**
 * HeartLink Advanced Firestore Rules Test Suite (Phase 1)
 * Comprehensive Access + Provider Linking Validation
 */
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import fs from "fs";

const projectId = "heartlink-dev";
const host = "127.0.0.1";
const port = 8081;
const rules = fs.readFileSync("firestore.rules", "utf8");

(async () => {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host, port, rules },
  });

  // Auth contexts
  const patient123Ctx = env.authenticatedContext("patient_123", { role: "patient" });
  const patient456Ctx = env.authenticatedContext("patient_456", { role: "patient" });
  const provider001Ctx = env.authenticatedContext("provider_001", { role: "provider" });
  const adminCtx = env.authenticatedContext("admin_001", { role: "admin" });
  const anonCtx = env.unauthenticatedContext();

  // Firestore handles
  const patient123 = patient123Ctx.firestore();
  const patient456 = patient456Ctx.firestore();
  const provider001 = provider001Ctx.firestore();
  const admin = adminCtx.firestore();
  const anon = anonCtx.firestore();

  console.log("\n🩺 Running HeartLink Advanced Firestore Rule Validation (with provider linking)...\n");

  try {
    // 0. Seed link for provider -> patient (provider_001 ↔ patient_123)
    const linkPath = `provider_patient_links/provider_001_patient_123`;
    await assertSucceeds(
      admin.doc(linkPath).set({
        providerId: "provider_001",
        patientId: "patient_123",
        active: true,
        createdAt: Date.now(),
      })
    );
    console.log("✅ Seeded provider-patient link document");

    // 1. Patient self-write (users/{uid})
    await assertSucceeds(
      patient123.collection("users").doc("patient_123").set({ firstName: "John", role: "patient" })
    );
    console.log("✅ Patient can write own profile");

    // 2. Cross-patient block
    await assertFails(
      patient123.collection("users").doc("patient_456").set({ firstName: "Tammy" })
    );
    console.log("✅ Patient cannot write other patient profile");

    // 3. Provider can read linked patient
    await assertSucceeds(provider001.collection("users").doc("patient_123").get());
    console.log("✅ Provider can read linked patient profile");

    // 4. Provider cannot read unlinked patient
    await assertFails(provider001.collection("users").doc("patient_456").get());
    console.log("✅ Provider cannot read unlinked patient");

    // 5. Provider cannot overwrite patient baseline (users/{uid})
    await assertFails(
      provider001.collection("users").doc("patient_123").update({ weight: 170 })
    );
    console.log("✅ Provider cannot overwrite patient baseline");

    // 6. Provider can add clinical note (notes/{docId})
    await assertSucceeds(
      provider001.collection("notes").add({
        providerId: "provider_001",
        patientId: "patient_123",
        note: "Patient stable today",
      })
    );
    console.log("✅ Provider can create clinical note");

    // 7. Patient cannot write provider note
    await assertFails(
      patient123.collection("notes").add({
        providerId: "provider_001",
        note: "Trying to write provider note",
      })
    );
    console.log("✅ Patient cannot write provider note");

    // 8. Unauthenticated blocked entirely
    await assertFails(anon.collection("users").doc("patient_123").get());
    console.log("✅ Unauthenticated users cannot access any data");

    // 9. Audit log protected (only admin)
    await assertSucceeds(
      admin.collection("audit_logs").add({ action: "system_update", by: "admin_001" })
    );
    console.log("✅ Admin can write audit log");

    await assertFails(
      provider001.collection("audit_logs").add({ action: "unauthorized_write" })
    );
    console.log("✅ Non-admin cannot write audit log");

    // 10. Patient baseline editable by self only
    //    IMPORTANT: baseline is a SUBCOLLECTION of the user:
    //    /users/{userId}/baseline/{docId}
    await assertSucceeds(
      patient123
        .collection("users")
        .doc("patient_123")
        .collection("baseline")
        .doc("data")
        .set({ weight: 165 })
    );

    await assertFails(
      patient456
        .collection("users")
        .doc("patient_123")
        .collection("baseline")
        .doc("data")
        .set({ weight: 170 })
    );
    console.log("✅ Patients can edit own baseline only");

    // 11. Provider cannot delete audit logs
    const auditRef = admin.collection("audit_logs").doc("test_delete");
    await assertSucceeds(auditRef.set({ action: "create" }));
    await assertFails(provider001.doc(auditRef.path).delete());
    console.log("✅ Providers cannot delete audit logs");

    // 12. Admin unrestricted read
    await assertSucceeds(admin.collection("users").doc("patient_123").get());
    console.log("✅ Admin can read all records");

    // 13. Patient cannot tamper with system rules
    await assertFails(patient123.collection("system").doc("rules").set({ hacked: true }));
    console.log("✅ Patients cannot write to system config\n");
  } catch (err) {
    console.error("❌ Error during tests:", err);
  }

  await env.cleanup();
  console.log("🏁 All tests complete.\n");
})();
