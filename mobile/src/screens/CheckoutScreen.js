import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { checkout, fetchAddresses, fetchConfig, quote as getQuote } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors, fonts, money, radius } from "../theme";
import { notify } from "../utils/notify";
import { setPendingPayment } from "../utils/payment";

function Option({ selected, onPress, title, subtitle, right }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionOn]} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={18} color={selected ? colors.caramel : colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optTitle, selected && { color: colors.caramel }]}>{title}</Text>
        {subtitle ? <Text style={styles.optSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export default function CheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const { refresh: refreshCart } = useCart();
  const [config, setConfig] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(null);
  const [zoneId, setZoneId] = useState(null);
  const [plan, setPlan] = useState("full");
  const [feeLater, setFeeLater] = useState(false);
  const [method, setMethod] = useState("wave");
  const [phone, setPhone] = useState(user?.phone_number || "");
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchConfig(true).then((c) => {
      setConfig(c);
      if (c.zones?.length && !zoneId) setZoneId(c.zones[0].id);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => {
    fetchAddresses().then((list) => {
      setAddresses(list);
      setAddressId((cur) => cur && list.some((a) => a.id === cur) ? cur : list[0]?.id || null);
    }).catch(() => {});
  }, []));

  useEffect(() => {
    let cancelled = false;
    setQuoting(true);
    getQuote({ zone_id: zoneId, payment_plan: plan, fee_on_arrival: feeLater })
      .then((r) => { if (!cancelled) { setQ(r); if (r.plan !== plan) setPlan(r.plan); } })
      .catch(() => {})
      .finally(() => !cancelled && setQuoting(false));
    return () => { cancelled = true; };
  }, [zoneId, plan, feeLater]);

  const submit = async () => {
    if (!addressId) return notify("Adresse manquante", "Ajoutez une adresse de livraison.");
    if (!zoneId) return notify("Zone manquante", "Choisissez votre zone de livraison.");
    setSubmitting(true);
    try {
      const res = await checkout({
        shipping_address_id: addressId, zone_id: zoneId, payment_plan: plan, fee_on_arrival: feeLater,
        payment_method: method, payer_phone_number: phone, notes,
      });
      refreshCart();
      if (res.payment) setPendingPayment(res.order.id, res.payment);
      navigation.getParent()?.navigate("Commandes", { screen: "OrderDetail", params: { id: res.order.id } });
      navigation.popToTop();
      if (res.detail) notify("Commande enregistrée", res.detail);
    } catch (e) {
      notify("Paiement", errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const methods = config?.payment_methods || [];

  return (
    <Screen contentStyle={{ padding: 16 }}>
      <View style={{ maxWidth: 720, width: "100%", alignSelf: "center" }}>
        <Text style={styles.h}>Adresse de livraison</Text>
        {addresses.map((a) => (
          <Option key={a.id} selected={a.id === addressId} onPress={() => setAddressId(a.id)} title={a.full_name} subtitle={`${a.one_line} · ${a.phone_number}`} />
        ))}
        <Pressable onPress={() => navigation.navigate("AddressForm")} style={{ paddingVertical: 8 }}>
          <Text style={styles.link}>+ Ajouter une nouvelle adresse</Text>
        </Pressable>

        <Text style={styles.h}>Zone de livraison</Text>
        {(config?.zones || []).map((z) => (
          <Option key={z.id} selected={z.id === zoneId} onPress={() => setZoneId(z.id)} title={z.name} subtitle={z.estimated_time}
            right={<Text style={styles.optPrice}>{money(z.fee)}</Text>} />
        ))}
        {!config && <ActivityIndicator color={colors.caramel} />}

        <Text style={styles.h}>Comment voulez-vous payer ?</Text>
        <Option selected={plan === "full"} onPress={() => setPlan("full")} title="Payer la totalité maintenant" subtitle="Rien à prévoir à la livraison" />
        {q?.deposit_option ? (
          <Option selected={plan === "deposit"} onPress={() => setPlan("deposit")} title={`Verser un acompte de ${money(q.deposit_option)}`}
            subtitle="Le reste en ligne plus tard ou en espèces au livreur" />
        ) : config ? (
          <Text style={styles.small}>💡 Acompte possible dès {money(config.deposit.threshold)} d'achats, ou pour les articles faits sur commande (crochet).</Text>
        ) : null}
        {config?.allow_fee_on_arrival && Number(q?.delivery_fee) > 0 ? (
          <View style={styles.switchRow}>
            <Text style={[styles.optTitle, { flex: 1 }]}>Payer la livraison au livreur à son arrivée</Text>
            <Switch value={feeLater} onValueChange={setFeeLater} trackColor={{ true: colors.caramel }} thumbColor={colors.white} />
          </View>
        ) : null}

        <Text style={styles.h}>Mode de paiement</Text>
        {methods.map((m) => (
          <Option key={m.code} selected={method === m.code} onPress={() => setMethod(m.code)} title={m.label} subtitle={m.description}
            right={<Ionicons name={m.code === "card" ? "card-outline" : "phone-portrait-outline"} size={18} color={colors.brown} />} />
        ))}
        {method !== "card" ? (
          <Field placeholder="Numéro de téléphone pour le paiement" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={{ marginTop: 6 }} />
        ) : null}
        <Field label="Instructions pour le livreur (facultatif)" placeholder="Appeler avant d'arriver, portail bleu…" value={notes} onChangeText={setNotes} maxLength={300} />

        <View style={styles.summary}>
          <Row label="Articles" value={money(q?.subtotal)} />
          <Row label={`Livraison${feeLater ? " (au livreur)" : ""}`} value={money(q?.delivery_fee)} />
          <Row label="Total" value={money(q?.total, true)} bold />
          <Row label="À payer maintenant" value={money(q?.pay_now, true)} color={colors.success} bold />
          {Number(q?.pay_later) > 0 ? <Row label="À la livraison / plus tard" value={money(q?.pay_later, true)} color={colors.brownSoft} /> : null}
        </View>

        <Button title={`Confirmer et payer ${q ? money(q.pay_now) : ""}`} onPress={submit} loading={submitting} disabled={quoting || !q} />
        <Text style={[styles.small, { textAlign: "center", marginTop: 10 }]}>🔒 Paiement sécurisé. Confirmation envoyée par email.</Text>
      </View>
    </Screen>
  );
}

function Row({ label, value, bold, color }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
      <Text style={[styles.rowText, bold && { fontFamily: fonts.sansBold }, color && { color }]}>{label}</Text>
      <Text style={[styles.rowText, bold && { fontFamily: fonts.sansBold }, color && { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text, marginTop: 18, marginBottom: 10 },
  option: {
    flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.caramelLight,
    borderRadius: radius.md, padding: 13, marginBottom: 8, backgroundColor: colors.white,
  },
  optionOn: { borderColor: colors.caramel, backgroundColor: "#FDF8F3" },
  optTitle: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  optSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  optPrice: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.brown },
  link: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.caramel },
  small: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  summary: { backgroundColor: colors.cream, borderRadius: radius.md, padding: 14, marginVertical: 16 },
  rowText: { fontFamily: fonts.sans, fontSize: 13, color: colors.text },
});
