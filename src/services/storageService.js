import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "checkInHistory";

export const getCheckInHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Storage read error:", e);
    return [];
  }
};

export const saveCheckIn = async (entry) => {
  try {
    const history = await getCheckInHistory();
    history.push(entry);
    await AsyncStorage.setItem(KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Storage write error:", e);
  }
};
