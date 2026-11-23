import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius } from "../theme";
import Logo from "./Logo";

const PILLARS = [
  ["shirt-outline", "PRÊT-À-PORTER\nFÉMININ"],
  ["bag-handle-outline", "ACCESSOIRES\nTENDANCE"],
  ["diamond-outline", "QUALITÉ\nPREMIUM"],
  ["heart-outline", "STYLE\nINTEMPOREL"],
];

/** Bannière de la boutique, dans l'esprit de la campagne (noir, or, photo de la marque). */
export default function HeroBanner() {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  return (
    <View style={[styles.card, { height: wide ? 300 : 230 }]}>
      <Image source={require("../../assets/brand/hero.jpg")} style={[styles.photo, { width: wide ? "48%" : "52%" }]} contentFit="cover" contentPosition="top" />
      <View style={[styles.fade, { right: wide ? "48%" : "52%" }]} />
      <View style={[styles.text, { width: wide ? "52%" : "56%" }]}>
        <Logo size={wide ? 24 : 17} light center={false} />
        <Text style={[styles.tagline, wide && { fontSize: 12 }]}>LA MODE QUI RÉVÈLE{"\n"}VOTRE ÉCLAT</Text>
        <Text style={[styles.quote, wide && { fontSize: 15 }]}>Plus qu'un style,{"\n"}une attitude.</Text>
      </View>
      <View style={styles.pillars}>
        {PILLARS.map(([icon, label]) => (
          <View key={label} style={styles.pillar}>
            <Ionicons name={icon} size={wide ? 18 : 15} color={colors.gold} />
            {wide ? <Text style={styles.pillarText}>{label}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.black, borderRadius: radius.md, overflow: "hidden", marginTop: 14 },
  photo: { position: "absolute", right: 0, top: 0, bottom: 0 },
  fade: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.black },
  text: { padding: 18, paddingTop: 22 },
  tagline: { fontFamily: fonts.sansMedium, fontSize: 9.5, letterSpacing: 2.5, color: colors.onDark, marginTop: 14, lineHeight: 17 },
  quote: { fontFamily: fonts.serifLight, fontSize: 13, color: colors.gold, marginTop: 12, lineHeight: 19 },
  pillars: { position: "absolute", left: 18, bottom: 16, flexDirection: "row", gap: 14 },
  pillar: { alignItems: "center", gap: 4 },
  pillarText: { fontFamily: fonts.sansMedium, fontSize: 8, letterSpacing: 1, color: colors.onDark, textAlign: "center" },
});
