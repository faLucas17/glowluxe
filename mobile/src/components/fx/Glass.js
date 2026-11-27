import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { colors } from "../../theme";

/**
 * Carte « verre » (glassmorphism) aux couleurs de la charte.
 * iOS et web : vrai flou (expo-blur) + voile crème.
 * Android : le flou d'expo-blur est lourd ou mal rendu selon les téléphones (et sur LDPlayer),
 * on utilise donc un fond crème semi-opaque, net et léger.
 */
export const CAN_BLUR = Platform.OS === "ios" || Platform.OS === "web";

export default function Glass({ children, style, intensity = 35, tint = 0.55, radius = 14, border = true, ...rest }) {
  const shape = { borderRadius: radius, overflow: "hidden" };
  if (!CAN_BLUR) {
    return (
      <View style={[shape, styles.androidBg, border && styles.border, style]} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <View style={[shape, border && styles.border, style]} {...rest}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(247,242,236,${tint})` }]} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  androidBg: { backgroundColor: "rgba(250,246,241,0.94)" },
  border: { borderWidth: 1, borderColor: "rgba(255,255,255,0.75)", shadowColor: colors.brown, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
});
