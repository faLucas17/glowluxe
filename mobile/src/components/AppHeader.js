import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { colors, fonts } from "../theme";
import Logo from "./Logo";
import MenuSheet from "./MenuSheet";

function IconBadge({ name, count, onPress, label }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.icon} accessibilityLabel={label}>
      <Ionicons name={name} size={22} color={colors.brown} />
      {count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text></View>}
    </Pressable>
  );
}

/** En-tête de la vidéo : menu, logo au centre, recherche, favoris et panier avec compteurs. */
export default function AppHeader({ onSearch }) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { count } = useCart();
  const favs = useFavorites();
  const [menu, setMenu] = useState(false);
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Pressable onPress={() => setMenu(true)} hitSlop={8} style={styles.icon} accessibilityLabel="Menu">
          <Ionicons name="menu" size={26} color={colors.brown} />
        </Pressable>
        <Pressable style={styles.logo} onPress={() => nav.navigate("Boutique", { screen: "Accueil" })} accessibilityLabel="Accueil">
          <Logo size={20} />
        </Pressable>
        <View style={styles.right}>
          <Pressable onPress={onSearch || (() => nav.navigate("Boutique", { screen: "Accueil", params: { search: Date.now() } }))} hitSlop={8} style={styles.icon} accessibilityLabel="Rechercher">
            <Ionicons name="search" size={22} color={colors.brown} />
          </Pressable>
          <IconBadge name="heart-outline" count={favs.count} onPress={() => nav.navigate("Favoris")} label="Favoris" />
          <IconBadge name="bag-handle-outline" count={count} onPress={() => nav.navigate("Panier")} label="Panier" />
        </View>
      </View>
      <MenuSheet visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  row: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, maxWidth: 1280, width: "100%", alignSelf: "center" },
  logo: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: -1 },
  right: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 },
  icon: { padding: 6 },
  badge: {
    position: "absolute", top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: colors.caramel, alignItems: "center", justifyContent: "center",
  },
  badgeText: { color: colors.white, fontSize: 9, fontFamily: fonts.sansBold },
});
