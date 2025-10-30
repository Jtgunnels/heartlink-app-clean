import express from "express";

const router = express.Router();

// temporary placeholder route so app builds successfully
router.get("/test", (req, res) => {
  res.json({ ok: true, message: "Auth route placeholder" });
});

export default router;
