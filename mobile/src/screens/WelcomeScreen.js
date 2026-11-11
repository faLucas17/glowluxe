import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchCategories, fetchProducts } from "../api";
import Button from "../components/Button";
import Logo from "../components/Logo";
import { colors, fonts } from "../theme";

const TAGS = ["PRÊT-À-PORTER", "ACCESSOIRES", "CROCHET", "QUALITÉ", "STYLE", "FÉMININ", "TENDANCE", "PREMIUM", "INTEMPOREL"];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    // La boutique se charge pendant que l'écran d'accueil est affiché : ouverture instantanée
    fetchProducts({ page: 1 }).catch(() => {});
    fetchCategories().catch(() => {});
  }, []);
  return (
    <ScrollView style={{ backgroundColor: colors.cream }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 50, paddingBottom: insets.bottom + 30 }]}>
      <View style={{ alignItems: "center" }}>
        {["ELEGANCE", "STYLE", "CONFIANCE"].map((w) => <Text key={w} style={styles.big}>{w}</Text>)}
      </View>
      <View style={{ alignItems: "center", marginVertical: 34 }}>
        <Logo size={40} />
      </View>
      <Text style={styles.tagline}>LA MODE QUI RÉVÈLE{"\n"}VOTRE ÉCLAT</Text>
      <View style={styles.tags}>
        {TAGS.map((t) => <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>)}
      </View>
      <Button title="VOIR LA BOUTIQUE" variant="dark" onPress={() => navigation.replace("MainTabs")} style={{ width: "100%", maxWidth: 340, alignSelf: "center" }} />
      <Text style={styles.footer}>G L O W L U X E   B Y   S O F A</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: 28, justifyContent: "center", maxWidth: 560, width: "100%", alignSelf: "center" },
  big: { fontFamily: fonts.serif, fontSize: 24, letterSpacing: 9, color: colors.brown, lineHeight: 38 },
  tagline: { textAlign: "center", fontFamily: fonts.sans, fontSize: 13, letterSpacing: 4, color: colors.brownSoft, lineHeight: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginVertical: 28 },
  tag: { borderWidth: 1, borderColor: colors.caramelLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1.5, color: colors.brownSoft },
  footer: { textAlign: "center", fontFamily: fonts.sansMedium, fontSize: 10, color: colors.brown, marginTop: 26 },
});
