/**
 * Charte GlowLuxe By Sofa (comme dans la vidéo) : fond clair, crème, marron chocolat, caramel.
 */
export const colors = {
  background: "#FFFFFF",
  cream: "#F7F2EC",
  creamDark: "#EFE6DC",
  brown: "#4A2C21",
  brownSoft: "#6B4436",
  caramel: "#C8956A",
  caramelLight: "#E9D3BE",
  text: "#2B1D16",
  textSecondary: "#8A7B70",
  border: "#EDE3D9",
  danger: "#B23B2E",
  dangerBg: "#FBEDEB",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  white: "#FFFFFF",
};

export const fonts = {
  script: "BerkshireSwash_400Regular",
  serif: "Merriweather_400Regular",
  serifBold: "Merriweather_700Bold",
  serifLight: "Merriweather_300Light",
  sans: "Montserrat_400Regular",
  sansMedium: "Montserrat_500Medium",
  sansSemiBold: "Montserrat_600SemiBold",
  sansBold: "Montserrat_700Bold",
};

export const spacing = (n) => n * 8;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const shadow = {
  shadowColor: "#4A2C21",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

/** 8000 -> "8.000 F" ; avec cfa=true -> "8.000 F CFA" (format de la vidéo) */
export function money(value, cfa = false) {
  const n = Math.round(Number(value || 0));
  const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} ${cfa ? "F CFA" : "F"}`;
}
