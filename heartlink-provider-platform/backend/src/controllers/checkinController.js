export const receiveCheckin = async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Check-in received:", data);
    // Here you would push to Firestore
    res.status(200).json({ message: "Check-in stored successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to store check-in" });
  }
};
