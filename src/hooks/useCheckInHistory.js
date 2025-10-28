import { useState, useEffect } from "react";
import { getCheckInHistory } from "../services/storageService";

/**
 * Custom React hook to load stored check-in history.
 * Returns the history array and a manual refresh function.
 */
export default function useCheckInHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load history when the component mounts
  useEffect(() => {
    loadHistory();
  }, []);

  // Function to reload data on demand
  async function loadHistory() {
    try {
      setLoading(true);
      const data = await getCheckInHistory();
      setHistory(data);
    } catch (error) {
      console.error("Error loading check-in history:", error);
    } finally {
      setLoading(false);
    }
  }

  return { history, loading, refresh: loadHistory };
}
