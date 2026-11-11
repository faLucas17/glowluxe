import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { paymentStatus } from "../api";

/** Ouvre la page de paiement (Wave / PayTech / WhatsApp) dans un navigateur intégré. */
export async function openCheckout(url) {
  if (!url) return;
  if (Platform.OS === "web") {
    // Sur ordinateur : on va sur la page de paiement, puis le bouton « Retour à ma commande » ramène ici
    window.location.assign(url);
    return;
  }
  await WebBrowser.openBrowserAsync(url, {
    toolbarColor: "#4A2C21",
    controlsColor: "#C8956A",
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}

/** Vérifie le statut du paiement toutes les 3 s (max ~3 min). Retourne une fonction d'arrêt. */
export function watchPayment(reference, onChange) {
  let stopped = false;
  let tries = 0;
  const tick = async () => {
    if (stopped) return;
    try {
      const s = await paymentStatus(reference);
      onChange(s);
      if (s.status !== "pending") return;
    } catch {}
    if (++tries < 60) setTimeout(tick, 3000);
  };
  tick();
  return () => {
    stopped = true;
  };
}

// Paiement à ouvrir juste après la commande (gardé en mémoire, pas dans l'URL)
const pending = new Map();
export function setPendingPayment(orderId, payment) {
  pending.set(String(orderId), payment);
}
export function takePendingPayment(orderId) {
  const p = pending.get(String(orderId));
  pending.delete(String(orderId));
  return p;
}
