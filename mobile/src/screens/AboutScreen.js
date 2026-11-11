import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fetchConfig } from "../api";
import Logo from "../components/Logo";
import Screen from "../components/Screen";
import { colors, fonts, radius, shadow } from "../theme";

const VALUES = [
  ["star-outline", "Qualité exceptionnelle"],
  ["time-outline", "Style intemporel"],
  ["color-palette-outline", "Crochet & pièces faites main"],
  ["globe-outline", "Livraison suivie en direct"],
  ["shield-checkmark-outline", "Paiement sécurisé (Wave, Orange Money, carte)"],
  ["heart-outline", "Service client 7j/7"],
];

function Card({ icon, title, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name={icon} size={18} color={colors.caramel} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Info({ icon, label, value, onPress }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.info}>
      <Ionicons name={icon} size={18} color={colors.caramel} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.text, onPress && { color: colors.brown, textDecorationLine: "underline" }]}>{value}</Text>
      </View>
    </Pressable>
  );
}

export default function AboutScreen() {
  const [shop, setShop] = useState(null);
  useEffect(() => { fetchConfig().then((c) => setShop(c.shop)).catch(() => {}); }, []);
  const s = shop || { address: "Tivaouane, Quartier Seydi Diamil SY, Sénégal", phone: "+221 77 822 84 60", email: "contact@glowluxe.com", hours: "Lun - Ven : 9h00 - 22h00 · Sam : 10h00 - 19h00 · Dim : fermé", lat: 14.95, lng: -16.8167 };
  const maps = Platform.OS === "ios" ? `http://maps.apple.com/?ll=${s.lat},${s.lng}&q=GlowLuxe` : `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

  return (
    <Screen>
      <View style={styles.hero}>
        <Logo size={34} light />
        <Text style={styles.heroText}>LA MODE QUI RÉVÈLE VOTRE ÉCLAT</Text>
      </View>
      <View style={{ padding: 16, marginTop: -30, maxWidth: 820, width: "100%", alignSelf: "center" }}>
        <Card icon="sparkles-outline" title="Notre Histoire">
          <Text style={styles.text}>
            Fondée en 2026, <Text style={styles.bold}>GlowLuxe</Text> est bien plus qu'une simple boutique de mode. C'est une vision, un engagement envers l'excellence et l'élégance. Notre mission est de vous offrir des pièces uniques qui allient qualité supérieure, design raffiné et sophistication.
          </Text>
          <Text style={[styles.text, { marginTop: 10 }]}>
            Chaque vêtement, chaque accessoire que nous sélectionnons incarne l'esprit <Text style={styles.bold}>GlowLuxe</Text> : briller avec classe et confiance. Nous croyons que la mode est une expression de personnalité, et nous nous engageons à vous aider à révéler votre lumière intérieure.
          </Text>
        </Card>
        <Card icon="locate-outline" title="Notre Mission">
          <Text style={styles.text}>
            Révéler votre éclat à travers des vêtements et accessoires qui célèbrent votre personnalité unique. Nous croyons que chaque femme mérite de se sentir élégante, confiante et rayonnante au quotidien.
          </Text>
        </Card>
        <Card icon="diamond-outline" title="Nos Valeurs">
          {VALUES.map(([icon, label]) => (
            <View key={label} style={styles.value}>
              <Ionicons name={icon} size={18} color={colors.brown} />
              <Text style={styles.text}>{label}</Text>
            </View>
          ))}
        </Card>
        <Card icon="location-outline" title="Nos Coordonnées">
          <Info icon="map-outline" label="ADRESSE" value={s.address} onPress={() => Linking.openURL(maps)} />
          <Info icon="call-outline" label="TÉLÉPHONE" value={s.phone} onPress={() => Linking.openURL(`tel:${s.phone.replace(/\s/g, "")}`)} />
          <Info icon="mail-outline" label="EMAIL" value={s.email} onPress={() => Linking.openURL(`mailto:${s.email}`)} />
          <Info icon="time-outline" label="HORAIRES" value={s.hours} />
          {s.whatsapp ? <Info icon="logo-whatsapp" label="WHATSAPP" value="Nous écrire" onPress={() => Linking.openURL(`https://wa.me/${s.whatsapp}`)} /> : null}
        </Card>
        <Card icon="navigate-outline" title="Notre Localisation">
          <Pressable onPress={() => Linking.openURL(maps)} style={styles.map}>
            <Ionicons name="location" size={34} color={colors.caramel} />
            <Text style={[styles.bold, { color: colors.white, marginTop: 6 }]}>GlowLuxe Boutique</Text>
            <Text style={{ color: colors.cream, fontFamily: fonts.sans, fontSize: 12 }}>Ouvrir dans Maps</Text>
          </Pressable>
        </Card>
        <Text style={styles.footer}>GlowLuxe By Sofa · Élégance · Qualité · Confiance</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brown, paddingTop: 34, paddingBottom: 60, alignItems: "center" },
  heroText: { color: colors.cream, fontFamily: fonts.sans, letterSpacing: 3, fontSize: 11, marginTop: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, marginBottom: 14, ...shadow },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardTitle: { fontFamily: fonts.serifBold, fontSize: 15, color: colors.brown },
  text: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.text, flexShrink: 1 },
  bold: { fontFamily: fonts.sansBold },
  value: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 7 },
  info: { flexDirection: "row", gap: 12, paddingVertical: 8 },
  infoLabel: { fontFamily: fonts.sansSemiBold, fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },
  map: { backgroundColor: colors.brownSoft, borderRadius: radius.md, height: 160, alignItems: "center", justifyContent: "center" },
  footer: { textAlign: "center", fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, marginVertical: 16, letterSpacing: 1 },
});
