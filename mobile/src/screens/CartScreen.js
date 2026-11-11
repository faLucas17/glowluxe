import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Empty from "../components/Empty";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors, fonts, money } from "../theme";
import { notify } from "../utils/notify";

export default function CartScreen({ navigation }) {
  const { user } = useAuth();
  const { cart, refresh, setQuantity, remove, loading } = useCart();
  const [busy, setBusy] = useState(null);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const change = async (item, q) => {
    setBusy(item.id);
    try {
      await setQuantity(item, q);
    } catch (e) {
      notify("Panier", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const items = cart.items || [];
  if (!items.length) {
    return <Empty icon="bag-handle-outline" title="Votre panier est vide" text="Découvrez nos nouveautés et nos pièces en crochet fait main." action="Voir la boutique" onAction={() => navigation.navigate("Boutique")} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, maxWidth: 800, width: "100%", alignSelf: "center" }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.caramel} />}
        renderItem={({ item }) => {
          const p = item.product_detail || {};
          return (
            <View style={[styles.row, busy === item.id && { opacity: 0.5 }]}>
              <Pressable onPress={() => navigation.navigate("Boutique", { screen: "ProductDetail", params: { slug: p.slug, preview: p } })}>
                <Image source={p.primary_image ? { uri: p.primary_image } : null} style={styles.img} contentFit="cover" cachePolicy="memory-disk" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{p.name}</Text>
                {item.variant_label ? <Text style={styles.variant}>{item.variant_label}</Text> : null}
                <Text style={styles.price}>{money(item.unit_price)}</Text>
                <View style={styles.stepper}>
                  <Pressable onPress={() => change(item, item.quantity - 1)} style={styles.step} accessibilityLabel="Moins"><Ionicons name="remove" size={14} color={colors.brown} /></Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable onPress={() => change(item, item.quantity + 1)} style={styles.step} accessibilityLabel="Plus"><Ionicons name="add" size={14} color={colors.brown} /></Pressable>
                </View>
              </View>
              <Pressable onPress={() => remove(item)} hitSlop={8}><Text style={styles.remove}>Retirer</Text></Pressable>
            </View>
          );
        }}
      />
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{money(cart.total, true)}</Text>
        </View>
        <Text style={styles.hint}>Livraison et acompte éventuel calculés à l'étape suivante.</Text>
        <Button
          title={user ? "Passer la commande" : "Se connecter pour commander"}
          onPress={() => (user ? navigation.navigate("Checkout") : navigation.navigate("Login", { next: "Panier" }))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: "flex-start" },
  img: { width: 72, height: 86, borderRadius: 8, backgroundColor: colors.cream },
  name: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  variant: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  price: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.caramel, marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  step: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: colors.caramelLight, alignItems: "center", justifyContent: "center" },
  qty: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text, minWidth: 16, textAlign: "center" },
  remove: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.danger },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, padding: 16, backgroundColor: colors.white, maxWidth: 800, width: "100%", alignSelf: "center" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: fonts.sans, color: colors.textSecondary },
  total: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.caramel },
  hint: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, marginVertical: 8 },
});
