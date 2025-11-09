// src/context/TierContext.jsx — Final Unified Version
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebaseConfig";
import { useAuth } from "./AuthProvider";

const DEFAULT_TIER = "Gold";
const TierContext = createContext({ tier: DEFAULT_TIER });

const TIER_ALIASES = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

// Helper: normalize tier string
function normalizeTier(rawTier) {
  const key = String(rawTier || "").trim().toLowerCase();
  return TIER_ALIASES[key] || DEFAULT_TIER;
}

export const TierProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const [tier, setTier] = useState(DEFAULT_TIER);

  // 🔹 Re-fetch tier when user or providerId changes
  useEffect(() => {
    if (loading) return;

    const providerId =
      localStorage.getItem("providerId") || sessionStorage.getItem("providerId");

    if (!user || !providerId) {
      console.log("ℹ️ No user or providerId found; resetting tier to default");
      setTier(DEFAULT_TIER);
      return;
    }

    let isMounted = true;

    async function fetchTier() {
      try {
        const docRef = doc(db, "providers", providerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          const resolvedTier = normalizeTier(data.tier || data.planTier);
          console.log(`✅ TierContext: Loaded tier '${resolvedTier}' for ${providerId}`);
          setTier(resolvedTier);
        } else if (isMounted) {
          console.warn(`⚠️ No provider record found for ${providerId}; defaulting to Gold`);
          setTier(DEFAULT_TIER);
        }
      } catch (err) {
        console.error("❌ Error fetching provider tier:", err);
        if (isMounted) setTier(DEFAULT_TIER);
      }
    }

    fetchTier();

    return () => {
      isMounted = false;
    };
  }, [
    user,
    loading,
    localStorage.getItem("providerId"),
    sessionStorage.getItem("providerId"),
  ]);

  // 🔹 Reset to default when user logs out
  useEffect(() => {
    if (!user && !loading) {
      console.log("ℹ️ User logged out; resetting tier to Gold");
      setTier(DEFAULT_TIER);
    }
  }, [user, loading]);

  const value = useMemo(() => ({ tier }), [tier]);

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
};

export default TierContext;
