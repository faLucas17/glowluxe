import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCategories, fetchProducts } from "../api";
import Button from "../components/Button";
import Logo from "../components/Logo";
import { colors, fonts } from "../theme";

const PILLARS = ["ÉLÉGANCE", "QUALITÉ", "CONFIANCE", "VOUS"];

/** Écran d'accueil inspiré des affiches : fond noir, logo or, « Plus qu'une marque, un style de vie ». */
export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    // La boutique se charge pendant que l'écran d'accueil est affiché : ouverture instantanée
    fetchProducts({ page: 1 }).catch(() => {});
    fetchCategories().catch(() => {});
  }, []);
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 28 }]}>
        <Text style={styles.kicker}>MODE  /  ACCESSOIRES  /  LIFESTYLE</Text>
        <View style={styles.rule} />
        <View style={{ alignItems: "center", marginVertical: 28 }}>
          <Logo size={34} light variant="full" />
        </View>
        <Text style={styles.small}>PLUS QU'UNE MARQUE,</Text>
        <Text style={styles.big}>UN STYLE DE VIE</Text>
        <Text style={styles.quote}>L'élégance n'est pas un luxe,{"\n"}c'est une attitude.</Text>
        <View style={styles.pillars}>
          {PILLARS.map((p, i) => (
            <Text key={p} style={styles.pillar}>{i ? "  |  " : ""}{p}</Text>
          ))}
        </View>
        <Button title="DÉCOUVRIR LA BOUTIQUE" variant="gold" onPress={() => navigation.replace("MainTabs")} style={styles.cta} />
        <Text style={styles.footer}>G L O W L U X E   B Y   S O F A</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  wrap: { flexGrow: 1, paddingHorizontal: 28, justifyContent: "center", alignItems: "center", maxWidth: 560, width: "100%", alignSelf: "center" },
  kicker: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 3, color: colors.onDark },
  rule: { width: 1, height: 34, backgroundColor: colors.gold, marginTop: 14 },
  small: { fontFamily: fonts.sans, fontSize: 12, letterSpacing: 5, color: colors.onDark, textAlign: "center" },
  big: { fontFamily: fonts.serif, fontSize: 28, letterSpacing: 4, color: colors.gold, textAlign: "center", marginTop: 6 },
  quote: { fontFamily: fonts.serifLight, fontSize: 15, color: colors.onDark, textAlign: "center", marginTop: 18, lineHeight: 22 },
  pillars: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginVertical: 30 },
  pillar: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 2, color: colors.gold },
  cta: { width: "100%", maxWidth: 340 },
  footer: { textAlign: "center", fontFamily: fonts.sansMedium, fontSize: 9, color: colors.onDarkMuted, marginTop: 24 },
});
