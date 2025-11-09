import React, { useState } from "react";
import axios from "axios";
import HeroHeader from "../../components/HeroHeader";

export default function CreateAgency() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("Bronze");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post("https://createagency-ogen44nm2a-uc.a.run.app", {
        name,
        email,
        password,
        tier,
      });
      if (res.data.success) {
        setMessage(
          `✅ Agency "${name}" created successfully! You can now log in at ${email}.`
        );
        setName("");
        setEmail("");
        setPassword("");
      } else {
        setMessage("Something went wrong creating the agency.");
      }
    } catch (err) {
      console.error(err);
      setMessage(`❌ ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "auto", padding: "2rem" }}>
      <HeroHeader title="Create New Agency Account" subtitle="Register a new home health agency" />
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agency Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Agency"}
        </button>
      </form>
      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </div>
  );
}
