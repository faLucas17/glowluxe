import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { fetchOrders } from "../api";
import Button from "../components/Button";
import Empty from "../components/Empty";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, money, radius } from "../theme";

const COLORS = { pending: colors.caramel, delivered: colors.success, cancelled: colors.danger };

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchOrders();
      setOrders(data.results ?? data);
    } catch {
      setOrders([]);
    } finally {
      setRefreshing(false);
    }
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!user) {
    return <Empty icon="receipt-outline" title="Vos commandes" text="Connectez-vous pour voir et suivre vos commandes." action="Se connecter" onAction={() => navigation.navigate("Login")} />;
  }
  return (
    <FlatList
      data={orders || []}
      keyExtractor={(o) => o.id}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, maxWidth: 800, width: "100%", alignSelf: "center" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.caramel} />}
      ListEmptyComponent={orders ? <Empty icon="receipt-outline" title="Aucune commande" text="Vos commandes apparaîtront ici." action="Voir la boutique" onAction={() => navigation.navigate("Boutique")} /> : null}
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate("OrderDetail", { id: item.id })}>
          <View style={{ flex: 1 }}>
            <Text style={styles.num}>{item.order_number}</Text>
            <Text style={[styles.status, { color: COLORS[item.status] || colors.brownSoft }]}>{item.status_display}</Text>
            <Text style={styles.total}>{money(item.total, true)}{Number(item.amount_due) > 0 && item.status !== "pending" && item.status !== "cancelled" ? `  ·  reste ${money(item.amount_due)}` : ""}</Text>
          </View>
          {item.status === "pending" ? <Button small title="Payer" onPress={() => navigation.navigate("OrderDetail", { id: item.id })} /> : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 10, backgroundColor: colors.white },
  num: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },
  status: { fontFamily: fonts.sansMedium, fontSize: 11, marginTop: 2 },
  total: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
