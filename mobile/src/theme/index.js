/**
 * Charte GlowLuxe By SoFa (affiches de la marque) : noir profond, or, ivoire.
 * Les anciens noms (brown, caramel...) sont gardés pour ne rien casser dans les écrans :
 * "brown" = noir de la marque, "caramel" = or.
 */
export const colors = {
  background: "#FFFFFF",
  cream: "#F6F1E8",        // ivoire des affiches
  creamDark: "#EBE2D2",
  brown: "#111111",        // noir GlowLuxe
  brownSoft: "#3D3833",
  caramel: "#B8914A",      // or (texte, prix, accents)
  caramelLight: "#E4D2A8", // or pâle
  gold: "#D4AF63",         // or lumineux sur fond noir
  black: "#0B0B0B",
  onDark: "#F6F1E8",
  onDarkMuted: "#A79F93",
  text: "#151311",
  textSecondary: "#7A7166",
  border: "#ECE4D6",
  danger: "#B23B2E",
  dangerBg: "#FBEDEB",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  white: "#FFFFFF",
};

export const fonts = {
  script: "BerkshireSwash_400Regular",
  serif: "PlayfairDisplay_400Regular",      // grand serif élégant des affiches
  serifBold: "PlayfairDisplay_600SemiBold",
  serifLight: "PlayfairDisplay_400Regular_Italic",
  sans: "Montserrat_400Regular",
  sansMedium: "Montserrat_500Medium",
  sansSemiBold: "Montserrat_600SemiBold",
  sansBold: "Montserrat_700Bold",
};

export const spacing = (n) => n * 8;

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const shadow = {
  shadowColor: "#000000",
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
