import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../config/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

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

export function useAuth() {
  return useContext(AuthContext);
}
