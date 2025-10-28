import React, { createContext, useState, useContext } from "react";

const DebugContext = createContext();

export function DebugProvider({ children }) {
  const [devMode, setDevMode] = useState(false);
  const [shadowResult, setShadowResult] = useState(null);
  const [scoreResult, setScoreResult] = useState(null);

  return (
    <DebugContext.Provider
      value={{ devMode, setDevMode, shadowResult, setShadowResult, scoreResult, setScoreResult }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  return useContext(DebugContext);
}
