import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius } from "../theme";
import Logo from "./Logo";

const PILLARS = [
  ["shirt-outline", "PRÊT-À-PORTER"],
  ["bag-handle-outline", "ACCESSOIRES"],
  ["diamond-outline", "QUALITÉ"],
  ["heart-outline", "STYLE"],
];

/** Bannière de la boutique : logo officiel, accroche et engagements, aux couleurs crème et marron. */
export default function HeroBanner() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <View style={[styles.brand, wide && { flex: 1 }]}>
        <Logo size={wide ? 28 : 20} variant="full" />
      </View>
      <View style={[styles.text, wide && { flex: 1.2, alignItems: "flex-start", marginTop: 0 }]}>
        <Text style={[styles.tagline, wide && { textAlign: "left", fontSize: 13 }]}>LA MODE QUI RÉVÈLE{"\n"}VOTRE ÉCLAT</Text>
        <View style={[styles.rule, wide && { alignSelf: "flex-start" }]} />
        <Text style={[styles.quote, wide && { textAlign: "left", fontSize: 15 }]}>Plus qu'un style, une attitude.</Text>
        <View style={[styles.pillars, wide && { justifyContent: "flex-start" }]}>
          {PILLARS.map(([icon, label]) => (
            <View key={label} style={styles.pillar}>
              <Ionicons name={icon} size={wide ? 20 : 17} color={colors.caramel} />
              <Text style={styles.pillarText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream, borderRadius: radius.md, marginTop: 14, paddingVertical: 20, paddingHorizontal: 16, alignItems: "center", borderWidth: 1, borderColor: colors.creamDark },
  cardWide: { flexDirection: "row", paddingVertical: 28, paddingHorizontal: 40, gap: 30 },
  brand: { alignItems: "center", justifyContent: "center" },
  text: { alignItems: "center", marginTop: 12 },
  tagline: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 3, color: colors.brown, lineHeight: 19, textAlign: "center" },
  rule: { width: 46, height: 1, backgroundColor: colors.caramel, marginVertical: 12, alignSelf: "center" },
  quote: { fontFamily: fonts.serifLight, fontStyle: "italic", fontSize: 14, color: colors.brownSoft, textAlign: "center" },
  pillars: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 16, flexWrap: "wrap" },
  pillar: { alignItems: "center", gap: 5 },
  pillarText: { fontFamily: fonts.sansMedium, fontSize: 8.5, letterSpacing: 1, color: colors.brownSoft, textAlign: "center" },
});
