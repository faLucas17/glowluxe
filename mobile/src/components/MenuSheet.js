import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors, fonts, radius, shadow } from "../theme";
import { confirm } from "../utils/notify";

function Row({ icon, label, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cream }]}>
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.brown} />
      <Text style={[styles.rowText, danger && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
    </Pressable>
  );
}

/** Menu (bouton ☰) : compte, commandes, favoris, livreur, paramètres, déconnexion. */
export default function MenuSheet({ visible, onClose }) {
  const nav = useNavigation();
  const { user, logout } = useAuth();
  const go = (...args) => {
    onClose();
    nav.navigate(...args);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView>
            <View style={styles.head}>
              <View style={styles.avatar}><Ionicons name="person" size={22} color={colors.white} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{user ? user.first_name || user.username : "Bienvenue"}</Text>
                <Text style={styles.email}>{user ? user.email : "Connectez-vous pour commander"}</Text>
              </View>
            </View>
            {user ? (
              <>
                <Row icon="receipt-outline" label="Mes commandes" onPress={() => go("Commandes")} />
                <Row icon="heart-outline" label="Mes favoris" onPress={() => go("Favoris")} />
                <Row icon="location-outline" label="Mes adresses" onPress={() => go("Profil", { screen: "Addresses" })} />
                <Row
                  icon="bicycle-outline"
                  label={user.is_courier ? "Espace livreur" : "Devenir livreur"}
                  onPress={() => go("Profil", { screen: user.is_courier ? "CourierDashboard" : "BecomeCourier" })}
                />
                <Row icon="settings-outline" label="Paramètres" onPress={() => go("Profil", { screen: "Settings" })} />
              </>
            ) : (
              <>
                <Row icon="log-in-outline" label="Se connecter" onPress={() => go("Login")} />
                <Row icon="person-add-outline" label="Créer un compte" onPress={() => go("Register")} />
                <Row icon="heart-outline" label="Mes favoris" onPress={() => go("Favoris")} />
              </>
            )}
            <Row icon="information-circle-outline" label="À propos" onPress={() => go("À propos")} />
            {user ? (
              <Pressable
                style={styles.logout}
                onPress={() => confirm("Déconnexion", "Voulez-vous vous déconnecter ?", async () => { onClose(); await logout(); }, "Se déconnecter")}
                accessibilityLabel="Se déconnecter"
              >
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(43,29,22,0.45)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 18, maxWidth: 420, width: "100%", alignSelf: "center", maxHeight: "85%", ...shadow },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.caramel, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.sansBold, color: colors.text, fontSize: 15 },
  email: { fontFamily: fonts.sans, color: colors.textSecondary, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 4, borderRadius: 8 },
  rowText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  logout: { marginTop: 12, backgroundColor: colors.dangerBg, borderRadius: radius.md, alignItems: "center", paddingVertical: 12 },
});
