import { useWindowDimensions } from "react-native";

/** Nombre de colonnes selon l'écran : téléphone 2, tablette 3-4, ordinateur 5. */
export function useGrid(padding = 16, gap = 12) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 1280);
  const columns = contentWidth >= 1150 ? 5 : contentWidth >= 900 ? 4 : contentWidth >= 600 ? 3 : 2;
  const itemWidth = (contentWidth - padding * 2 - gap * (columns - 1)) / columns;
  return { columns, itemWidth, gap, padding, contentWidth, isWide: width >= 900 };
}
