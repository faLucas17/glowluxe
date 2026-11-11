import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";

import { cancelOrder, fetchConfig, fetchOrder, payOrder } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Chip from "../components/Chip";
import Screen from "../components/Screen";
import { colors, fonts, money, radius } from "../theme";
import { confirm, notify } from "../utils/notify";
import { openCheckout, takePendingPayment, watchPayment } from "../utils/payment";

const STEPS = [
  ["Paiement", ["deposit_paid", "paid", "processing", "ready", "shipped", "in_transit", "out_for_delivery", "delivered"]],
  ["Préparation", ["processing", "ready", "shipped", "in_transit", "out_for_delivery", "delivered"]],
  ["En route", ["shipped", "in_transit", "out_for_delivery", "delivered"]],
  ["Livrée", ["delivered"]],
];

export default function OrderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [order, setOrder] = useState(null);
  const [methods, setMethods] = useState([]);
  const [method, setMethod] = useState("wave");
  const [paying, setPaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const stopWatch = useRef(null);
  const started = useRef(false);

  const load = useCallback(async () => {
    try {
      setOrder(await fetchOrder(id));
    } catch {} finally {
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { fetchConfig().then((c) => setMethods(c.payment_methods || [])).catch(() => {}); }, []);
  useEffect(() => () => stopWatch.current?.(), []);

  const follow = useCallback((pay) => {
    setWaiting(true);
    stopWatch.current?.();
    stopWatch.current = watchPayment(pay.reference, (s) => {
      if (s.status === "success") {
        setWaiting(false);
        load();
        notify("Paiement confirmé 🎉", "Merci ! Un email de confirmation vous a été envoyé.");
      } else if (s.status === "failed") {
        setWaiting(false);
        load();
      }
    });
  }, [load]);

  // Juste après « Confirmer et payer » : on ouvre la page de paiement
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const payment = takePendingPayment(id);
    if (payment?.checkout_url) openCheckout(payment.checkout_url).then(() => follow(payment));
  }, [id, follow]);

  const pay = async () => {
    setPaying(true);
    try {
      const p = await payOrder(id, { payment_method: method });
      await openCheckout(p.checkout_url);
      follow(p);
    } catch (e) {
      notify("Paiement", errorMessage(e));
    } finally {
      setPaying(false);
    }
  };

  if (!order) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.caramel} /></View>;
  const due = Number(order.amount_due);

  return (
    <Screen contentStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.caramel} />}>
      <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <Text style={styles.num}>{order.order_number}</Text>
        <Text style={styles.status}>{order.status_display}</Text>
        {order.status !== "cancelled" && (
          <View style={styles.steps}>
            {STEPS.map(([label, ok]) => (
              <View key={label} style={[styles.step, ok.includes(order.status) && styles.stepOn]}>
                <Text style={[styles.stepText, ok.includes(order.status) && { color: colors.brown }]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {waiting && (
          <View style={styles.waiting}>
            <ActivityIndicator color={colors.caramel} />
            <Text style={styles.waitingText}>Confirmation du paiement en cours… Revenez ici après avoir payé.</Text>
          </View>
        )}

        {order.items.map((it) => (
          <View key={it.id} style={styles.item}>
            <Image source={it.product_detail?.primary_image ? { uri: it.product_detail.primary_image } : null} style={styles.img} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{it.product_name}</Text>
              {it.variant_label ? <Text style={styles.small}>{it.variant_label}</Text> : null}
              <Text style={styles.small}>{money(it.unit_price)} × {it.quantity}</Text>
            </View>
            <Text style={styles.itemTotal}>{money(it.subtotal)}</Text>
          </View>
        ))}

        <View style={styles.box}>
          <Row l="Articles" v={money(order.subtotal)} />
          <Row l={`Livraison${order.zone_name ? ` (${order.zone_name})` : ""}${order.delivery_fee_on_arrival ? " · au livreur" : ""}`} v={money(order.shipping_cost)} />
          <Row l="Total" v={money(order.total, true)} b />
          <Row l="Déjà payé" v={money(order.amount_paid, true)} c={colors.success} />
          {due > 0 && order.status !== "cancelled" ? <Row l="Reste à payer" v={money(due, true)} c={colors.danger} b /> : null}
        </View>

        <Text style={styles.h}>Livraison</Text>
        <Text style={styles.small}>{order.address_snapshot?.full_name} · {order.address_snapshot?.phone}</Text>
        <Text style={styles.small}>{order.address_snapshot?.line}</Text>
        {order.delivery?.courier ? (
          <View style={[styles.box, { marginTop: 10 }]}>
            <Text style={styles.itemName}>🛵 {order.delivery.courier.name} · {order.delivery.courier.vehicle}</Text>
            <Text style={styles.small}>{order.delivery.status_display}</Text>
            <Button small variant="outline" title={`Appeler ${order.delivery.courier.phone}`} style={{ marginTop: 8 }}
              onPress={() => Linking.openURL(`tel:${order.delivery.courier.phone.replace(/\s/g, "")}`)} />
          </View>
        ) : null}
        {!["pending", "cancelled"].includes(order.status) ? (
          <Button title="📍 Suivre ma livraison" variant="dark" style={{ marginTop: 12 }} onPress={() => navigation.navigate("Tracking", { id: order.id })} />
        ) : null}

        {order.can_pay_online && !waiting ? (
          <>
            <Text style={styles.h}>{order.status === "pending" ? `Valider la commande : ${money(order.first_payment_amount - order.amount_paid, true)}` : `Régler le solde en ligne : ${money(due, true)}`}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {methods.map((m) => <Chip key={m.code} label={m.label} active={method === m.code} onPress={() => setMethod(m.code)} />)}
            </View>
            <Button title="Payer maintenant" onPress={pay} loading={paying} />
            {order.status !== "pending" ? <Text style={[styles.small, { textAlign: "center", marginTop: 6 }]}>Ou en espèces au livreur.</Text> : null}
          </>
        ) : null}

        {order.status === "pending" ? (
          <Button title="Annuler la commande" variant="danger" style={{ marginTop: 12 }} onPress={() => confirm("Annuler", "Annuler cette commande ?", async () => {
            try { setOrder(await cancelOrder(order.id)); } catch (e) { notify("Annulation", errorMessage(e)); }
          }, "Annuler la commande")} />
        ) : null}

        {order.payments?.length ? (
          <>
            <Text style={styles.h}>Paiements reçus</Text>
            {order.payments.map((p) => <Row key={p.reference} l={`${p.method} · ${p.purpose}`} v={money(p.amount)} />)}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Row({ l, v, b, c }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={[styles.rowText, b && { fontFamily: fonts.sansBold }, c && { color: c }]}>{l}</Text>
      <Text style={[styles.rowText, b && { fontFamily: fonts.sansBold }, c && { color: c }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  num: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.brown },
  status: { fontFamily: fonts.sansMedium, color: colors.caramel, marginTop: 2 },
  steps: { flexDirection: "row", gap: 4, marginVertical: 14 },
  step: { flex: 1, borderTopWidth: 4, borderTopColor: colors.border, paddingTop: 6 },
  stepOn: { borderTopColor: colors.caramel },
  stepText: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.textSecondary, textAlign: "center" },
  waiting: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.cream, padding: 12, borderRadius: radius.md, marginBottom: 12 },
  waitingText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.brown },
  item: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  img: { width: 56, height: 66, borderRadius: 8, backgroundColor: colors.cream },
  itemName: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  itemTotal: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.caramel },
  small: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  box: { backgroundColor: colors.cream, borderRadius: radius.md, padding: 14, marginTop: 14 },
  h: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text, marginTop: 20, marginBottom: 8 },
  rowText: { fontFamily: fonts.sans, fontSize: 13, color: colors.text },
});
