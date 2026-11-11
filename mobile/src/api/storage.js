import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Jetons de connexion : coffre-fort chiffré du téléphone (Keychain / Keystore) ; navigateur sur le web.
const secure = Platform.OS !== "web";

export const tokens = {
  async get(key) {
    return secure ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key);
  },
  async set(key, value) {
    return secure ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value);
  },
  async clear() {
    for (const key of ["access_token", "refresh_token"]) {
      if (secure) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);
    }
  },
};

export async function getJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
