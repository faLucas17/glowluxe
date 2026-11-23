import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius } from "../theme";
import Logo from "./Logo";

const PILLARS = [
  ["shirt-outline", "PRÊT-À-PORTER\nFÉMININ"],
  ["bag-handle-outline", "ACCESSOIRES\nTENDANCE"],
  ["diamond-outline", "QUALITÉ\nPREMIUM"],
  ["heart-outline", "STYLE\nINTEMPOREL"],
];

/** Bannière de la boutique : fond noir, logo officiel or, accroche et 4 engagements. */
export default function HeroBanner() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  return (
    <View style={[styles.card, wide && styles.cardWide]}>
      <View style={[styles.brand, wide && { flex: 1 }]}>
        <Logo size={wide ? 30 : 22} light variant="full" />
      </View>
      <View style={[styles.text, wide && { flex: 1.2, alignItems: "flex-start" }]}>
        <Text style={[styles.tagline, wide && { textAlign: "left", fontSize: 13 }]}>LA MODE QUI RÉVÈLE{"\n"}VOTRE ÉCLAT</Text>
        <View style={[styles.rule, wide && { alignSelf: "flex-start" }]} />
        <Text style={[styles.quote, wide && { textAlign: "left", fontSize: 16 }]}>Plus qu'un style, une attitude.</Text>
        <View style={[styles.pillars, wide && { justifyContent: "flex-start" }]}>
          {PILLARS.map(([icon, label]) => (
            <View key={label} style={styles.pillar}>
              <Ionicons name={icon} size={wide ? 20 : 17} color={colors.gold} />
              <Text style={styles.pillarText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.black, borderRadius: radius.md, marginTop: 14, paddingVertical: 22, paddingHorizontal: 16, alignItems: "center" },
  cardWide: { flexDirection: "row", paddingVertical: 30, paddingHorizontal: 40, gap: 30 },
  brand: { alignItems: "center", justifyContent: "center" },
  text: { alignItems: "center", marginTop: 14 },
  tagline: { fontFamily: fonts.sansMedium, fontSize: 11, letterSpacing: 3, color: colors.onDark, lineHeight: 19, textAlign: "center" },
  rule: { width: 46, height: 1, backgroundColor: colors.gold, marginVertical: 12, alignSelf: "center" },
  quote: { fontFamily: fonts.serifLight, fontSize: 14, color: colors.gold, textAlign: "center" },
  pillars: { flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 18, flexWrap: "wrap" },
  pillar: { alignItems: "center", gap: 5, minWidth: 64 },
  pillarText: { fontFamily: fonts.sansMedium, fontSize: 8, letterSpacing: 1, color: colors.onDark, textAlign: "center", lineHeight: 11 },
});
