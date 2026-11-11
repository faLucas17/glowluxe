import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { tokens } from "./storage";

/**
 * Adresse de l'API :
 * - production : EXPO_PUBLIC_API_URL (ex. https://api.glowluxe.sn/api)
 * - développement : trouvée AUTOMATIQUEMENT à partir de l'IP de ton PC utilisée par Expo
 *   (plus besoin de modifier ce fichier quand l'IP Wi-Fi change !)
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || "";
  const host = hostUri.split(":")[0];
  if (host && !host.includes("exp.direct")) return `http://${host}:8000/api`;
  return "http://localhost:8000/api";
}

export const API_BASE_URL = resolveApiUrl();

const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
  const token = await tokens.get("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onSessionExpired = () => {};
export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !original.url.includes("/auth/login")) {
      original._retry = true;
      try {
        const refresh = await tokens.get("refresh_token");
        if (!refresh) throw new Error("no refresh");
        // une seule demande de rafraîchissement à la fois
        refreshing = refreshing || axios.post(`${API_BASE_URL}/auth/login/refresh/`, { refresh });
        const { data } = await refreshing;
        await tokens.set("access_token", data.access);
        if (data.refresh) await tokens.set("refresh_token", data.refresh);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (e) {
        await tokens.clear();
        onSessionExpired();
        return Promise.reject(error);
      } finally {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

/** Message d'erreur lisible pour l'utilisateur, quelle que soit la forme de la réponse. */
export function errorMessage(error, fallback = "Une erreur est survenue. Réessayez.") {
  if (!error?.response) {
    return "Connexion impossible au serveur. Vérifiez Internet (et que le serveur Django tourne en local).";
  }
  const d = error.response.data;
  if (!d) return fallback;
  if (typeof d === "string") return fallback;
  if (d.detail) return String(d.detail);
  const first = Object.entries(d)[0];
  if (first) {
    const [field, msg] = first;
    const text = Array.isArray(msg) ? msg[0] : String(msg);
    return field === "non_field_errors" ? text : text;
  }
  return fallback;
}

// Petit cache mémoire : les écrans déjà vus s'affichent instantanément, puis se mettent à jour.
const cache = new Map();
export async function cachedGet(url, params, { maxAge = 60000, force = false } = {}) {
  const key = url + JSON.stringify(params || {});
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.t < maxAge) return hit.data;
  const { data } = await api.get(url, { params });
  cache.set(key, { t: Date.now(), data });
  return data;
}
export function peekCache(url, params) {
  return cache.get(url + JSON.stringify(params || {}))?.data;
}
export function clearCache() {
  cache.clear();
}

export default api;
