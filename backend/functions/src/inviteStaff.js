import admin from "firebase-admin";

const db = admin.firestore();

export const inviteStaff = async (req, res) => {
  try {
    const { email, password, role, providerId } = req.body;
    if (!email || !password || !role || !providerId) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(user.uid, {
      provider_id: providerId,
      role,
    });

    await db.doc(`providers/${providerId}/staff/${user.uid}`).set({
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("inviteStaff error:", err);
    res.status(500).json({ error: err.message });
  }
};
