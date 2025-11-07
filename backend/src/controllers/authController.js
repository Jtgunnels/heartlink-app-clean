import jwt from "jsonwebtoken";
export const loginProvider = async (req, res) => {
  const { email, password } = req.body;
  // TODO: replace with real auth
  if (email === "demo@heartlink.com" && password === "demo123") {
    const token = jwt.sign({ providerID: "HOMECARE123" }, process.env.JWT_SECRET, { expiresIn: "12h" });
    return res.json({ token, providerID: "HOMECARE123" });
  }
  res.status(401).json({ error: "Invalid credentials" });
};
