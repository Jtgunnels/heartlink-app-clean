import { useContext } from "react";
import TierContext from "./TierContext.jsx";

export function useTier() {
  return useContext(TierContext);
}
