import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { resendVerification } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Logo from "../components/Logo";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radius } from "../theme";
import { confirm, notify } from "../utils/notify";

function Row({ icon, label, onPress, badge }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cream }]}>
      <Ionicons name={icon} size={20} color={colors.brown} />
      <Text style={styles.rowText}>{label}</Text>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: badge ? 6 : "auto" }} />
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  useFocusEffect(useCallback(() => { if (user) refreshUser(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <Screen contentStyle={{ padding: 24, alignItems: "center" }}>
        <View style={{ marginVertical: 30 }}><Logo size={36} /></View>
        <Text style={styles.title}>Bienvenue chez GlowLuxe</Text>
        <Text style={styles.sub}>Connectez-vous pour commander, suivre vos livraisons et recevoir nos promotions en avant-première.</Text>
        <Button title="Se connecter" onPress={() => navigation.navigate("Login")} style={{ alignSelf: "stretch", marginTop: 24, maxWidth: 420 }} />
        <Button title="Créer un compte" variant="outline" onPress={() => navigation.navigate("Register")} style={{ alignSelf: "stretch", marginTop: 10, maxWidth: 420 }} />
      </Screen>
    );
  }

  const resend = async () => {
    setSending(true);
    try {
      const r = await resendVerification();
      notify("Email envoyé", r.detail);
    } catch (e) {
      notify("Email", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 16 }}>
      <View style={{ maxWidth: 640, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", marginVertical: 20 }}>
          <View style={styles.avatar}><Ionicons name="person" size={36} color={colors.white} /></View>
          <Text style={styles.title}>{user.first_name || user.username}</Text>
          <Text style={styles.sub}>{user.email}</Text>
        </View>
        {!user.email_verified && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>Confirmez votre email pour recevoir vos confirmations de commande et nos promos.</Text>
            <Button small title="Renvoyer l'email" onPress={resend} loading={sending} style={{ marginTop: 8, alignSelf: "flex-start" }} />
          </View>
        )}
        <View style={styles.list}>
          <Row icon="receipt-outline" label="Mes commandes" onPress={() => navigation.navigate("Commandes")} />
          <Row icon="heart-outline" label="Mes favoris" onPress={() => navigation.navigate("Favoris")} />
          <Row icon="location-outline" label="Mes adresses" onPress={() => navigation.navigate("Addresses")} />
          <Row
            icon="bicycle-outline"
            label={user.is_courier ? "Espace livreur" : "Devenir livreur"}
            badge={user.courier_status === "pending" ? "En attente" : null}
            onPress={() => navigation.navigate(user.is_courier ? "CourierDashboard" : "BecomeCourier")}
          />
          <Row icon="settings-outline" label="Paramètres" onPress={() => navigation.navigate("Settings")} />
        </View>
        <Pressable style={styles.logout} onPress={() => confirm("Déconnexion", "Voulez-vous vous déconnecter ?", logout, "Se déconnecter")}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={{ color: colors.danger, fontFamily: fonts.sansSemiBold }}>Se déconnecter</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.caramel, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title: { fontFamily: fonts.serifBold, fontSize: 18, color: colors.text, textAlign: "center" },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 4, lineHeight: 19 },
  warn: { backgroundColor: "#FFF4E5", borderRadius: radius.md, padding: 14, marginBottom: 14 },
  warnText: { fontFamily: fonts.sans, fontSize: 13, color: "#8A5300" },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  badge: { marginLeft: "auto", fontFamily: fonts.sansMedium, fontSize: 11, color: colors.caramel },
  logout: { flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.dangerBg, borderRadius: radius.md, padding: 14, marginTop: 20 },
});
