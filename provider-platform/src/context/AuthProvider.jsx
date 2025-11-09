import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../utils/firebaseConfig";

// -----------------------------------------------------------------------------
// Auth Context — manages Firebase Auth state, logout, and loading flag
// -----------------------------------------------------------------------------
const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // 🔹 Watch for Firebase auth state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // 🔹 Logout handler — safely sign out + clear local/session storage
  // ---------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      await signOut(auth);

      // ✅ Clear all cached provider info and tokens
      localStorage.removeItem("providerId");
      sessionStorage.removeItem("providerId");
      localStorage.removeItem("token");

      console.log("✅ Signed out successfully");

      // ✅ Redirect user back to login (adjust route as needed)
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 🔹 Memoized context value
  // ---------------------------------------------------------------------------
  const value = useMemo(
    () => ({
      user,
      loading,
      logout,
    }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// -----------------------------------------------------------------------------
// Custom hook: useAuth()
// -----------------------------------------------------------------------------
export function useAuth() {
  return useContext(AuthContext);
}
