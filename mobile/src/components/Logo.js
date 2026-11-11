import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme";

/** Logo texte « GlowLuxe By Sofa » (net à toutes les tailles, sans fichier image). */
export default function Logo({ size = 22, light = false, center = true }) {
  return (
    <View style={{ alignItems: center ? "center" : "flex-start" }}>
      <Text style={[styles.gl, { fontSize: size, color: light ? colors.caramelLight : colors.caramel }]}>GlowLuxe</Text>
      <Text style={[styles.by, { fontSize: Math.max(9, size * 0.42), color: light ? colors.cream : colors.brownSoft }]}>By Sofa</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gl: { fontFamily: fonts.script, lineHeight: undefined },
  by: { fontFamily: fonts.serifLight, fontStyle: "italic", marginTop: -4, letterSpacing: 1 },
});
