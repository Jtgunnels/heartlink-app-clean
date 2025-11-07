// src/context/TierContext.jsx
import React, { createContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

// Create the context
const DEFAULT_TIER = "Gold";
const TierContext = createContext({ tier: DEFAULT_TIER });

const TIER_ALIASES = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

function normalizeTier(rawTier) {
  const key = String(rawTier || "").trim().toLowerCase();
  return TIER_ALIASES[key] || DEFAULT_TIER;
}

// Provider component
export const TierProvider = ({ children }) => {
  const [tier, setTier] = useState(DEFAULT_TIER);
  const providerID = "demoProvider"; // Replace with dynamic ID if needed

  useEffect(() => {
    const fetchTier = async () => {
      try {
        const docRef = doc(db, "providers", providerID);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const resolvedTier = normalizeTier(data.tier || data.planTier);
          console.log("🏆 Provider tier fetched:", resolvedTier);
          setTier(resolvedTier);
        } else {
          console.warn("⚠ No provider record found; defaulting to Bronze");
          setTier(DEFAULT_TIER);
        }
      } catch (err) {
        console.error("❌ Error fetching provider tier:", err);
        setTier(DEFAULT_TIER);
      }
    };

    fetchTier();
  }, [providerID]);

  const value = useMemo(() => ({ tier }), [tier]);

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
};

export default TierContext;
