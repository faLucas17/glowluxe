import { useEffect } from "react";
import { FadeInDown, ReduceMotion, useReducedMotion } from "react-native-reanimated";

/**
 * Apparition des cartes : fondu + légère remontée, l'une après l'autre (80 ms d'écart, 450 ms).
 * Chaque carte ne s'anime qu'une seule fois par liste : ni au retour en arrière,
 * ni quand la FlatList recrée une carte pendant le défilement.
 */
const seen = new Map(); // nom de la liste -> identifiants déjà apparus
let batch = { t: 0, n: 0 };

function setFor(list) {
  let set = seen.get(list);
  if (!set) seen.set(list, (set = new Set()));
  return set;
}

export function useEnterOnce(list, id) {
  const reduced = useReducedMotion(); // réglage « réduire les animations » du téléphone
  const key = id == null ? null : String(id);

  // On note la carte comme « déjà apparue » une fois affichée (après le rendu).
  useEffect(() => {
    if (list && key) setFor(list).add(key);
  }, [list, key]);

  if (reduced || !list || !key || setFor(list).has(key)) return undefined;

  const now = Date.now();
  if (now - batch.t > 350) batch = { t: now, n: 0 };
  batch.t = now;
  const delay = Math.min(batch.n++, 8) * 80;
  return FadeInDown.duration(450).delay(delay).reduceMotion(ReduceMotion.System);
}
