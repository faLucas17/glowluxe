import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import * as G from "../../api/gestion";
import { errorMessage } from "../../api/client";
import Field from "../../components/Field";
import { Card, Line, Pill, Select, SmallButton, Title, dateFr, run, styles as ui } from "../../components/admin/ui";
import { colors, fonts, money } from "../../theme";
import { confirm } from "../../utils/notify";

const ACTIONS = {
  processing: "Passer en préparation",
  ready: "Prête : chercher un livreur",
  out_for_delivery: "Marquer en cours de livraison",
  delivered: "Marquer livrée",
  cancelled: "Annuler la commande",
  refunded: "Marquer remboursée",
};
const METHODS = [
  { value: "manual", label: "WhatsApp / virement" },
  { value: "wave", label: "Wave (direct)" },
  { value: "orange_money", label: "Orange Money (direct)" },
  { value: "cash", label: "Espèces" },
];

export default function AdminOrderScreen({ route, navigation }) {
  const { id } = route.params;
  const [o, setO] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("manual");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await G.order(id);
      setO(d);
      setNotes(d.notes || "");
      setAmount(d.amount_due ? String(d.amount_due) : "");
      setError(null);
      navigation.setOptions({ title: d.order_number });
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, navigation]);
  useEffect(() => { load(); }, [load]);

  const act = async (key, fn, question) => {
    const go = async () => {
      setBusy(key);
      await run(fn, { onDone: (r) => r?.order && (setO(r.order), setAmount(r.order.amount_due ? String(r.order.amount_due) : "")) });
      setBusy(null);
    };
    if (question) confirm(question[0], question[1], go, question[2] || "Oui");
    else go();
  };

  if (!o) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{error ? <Text style={ui.empty}>{error}</Text> : <ActivityIndicator color={colors.caramel} />}</View>;
  }
  const addr = o.address_snapshot || {};
  const phone = (addr.phone || o.customer.phone || "").replace(/\D/g, "");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.page} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.caramel} />}>
      <Card>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <View style={{ flex: 1 }}>
            <Text style={ui.name}>{o.order_number}</Text>
            <Text style={ui.sub}>Passée le {dateFr(o.created_at)}</Text>
          </View>
          <Pill status={o.status} label={o.status_label} />
        </View>
        <View style={{ marginTop: 10 }}>
          <Line label="Articles" value={money(o.subtotal)} />
          <Line label={`Livraison${o.zone ? ` (${o.zone})` : ""}`} value={`${money(o.shipping_cost)}${o.delivery_fee_on_arrival ? " · payée au livreur" : ""}`} />
          <Line label="Total" value={money(o.total, true)} strong />
          {o.payment_plan === "deposit" ? <Line label="Acompte demandé" value={money(o.deposit_amount)} /> : null}
          <Line label="Déjà payé" value={money(o.amount_paid)} color={colors.success} />
          <Line label="Reste à payer" value={money(o.amount_due)} strong color={o.amount_due ? colors.danger : colors.success} />
        </View>
      </Card>

      {o.next_statuses.length ? (
        <>
          <Title>Faire avancer la commande</Title>
          <View style={[ui.actions, { marginTop: 0 }]}>
            {o.next_statuses.map((n) => (
              <SmallButton
                key={n.value}
                title={ACTIONS[n.value] || n.label}
                tone={n.value === "cancelled" ? "danger" : n.value === "delivered" ? "success" : "dark"}
                busy={busy === n.value}
                onPress={() => act(n.value, () => G.orderStatus(o.id, n.value), n.value === "cancelled" ? ["Annuler la commande ?", "Le stock sera remis et la cliente prévenue par email.", "Annuler la commande"] : null)}
              />
            ))}
          </View>
        </>
      ) : null}

      {o.amount_due > 0 && !["cancelled", "refunded"].includes(o.status) ? (
        <>
          <Title>Enregistrer un paiement reçu</Title>
          <Card>
            <Text style={[ui.sub, { marginBottom: 10 }]}>Pour un paiement reçu hors de l'appli (WhatsApp, Wave ou Orange Money envoyé directement, espèces).</Text>
            <Field label="Montant (F)" value={amount} onChangeText={(t) => setAmount(t.replace(/\D/g, ""))} keyboardType="number-pad" />
            <Select label="Moyen" options={METHODS} value={method} onChange={setMethod} />
            <SmallButton title="Valider le paiement" icon="checkmark-circle-outline" tone="caramel" busy={busy === "pay"} disabled={!Number(amount)}
              onPress={() => act("pay", () => G.orderPayment(o.id, Number(amount), method), ["Confirmer le paiement ?", `${money(amount)} reçus pour ${o.order_number}. La cliente recevra un email.`])} />
          </Card>
        </>
      ) : null}

      <Title>Cliente</Title>
      <Card>
        <Text style={ui.name}>{addr.full_name || o.customer.name || o.client}</Text>
        <Text style={ui.sub} selectable>{o.customer.email}</Text>
        {addr.phone ? <Text style={ui.sub} selectable>{addr.phone}</Text> : null}
        {addr.line ? <Text style={[ui.sub, { marginTop: 6 }]} selectable>{addr.line}</Text> : null}
        <View style={ui.actions}>
          {phone ? <SmallButton title="Appeler" icon="call-outline" tone="light" onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}
          {phone ? <SmallButton title="WhatsApp" icon="logo-whatsapp" tone="success" onPress={() => Linking.openURL(`https://wa.me/${phone.startsWith("221") ? phone : `221${phone}`}?text=${encodeURIComponent(`Bonjour, au sujet de votre commande GlowLuxe ${o.order_number}`)}`)} /> : null}
          <SmallButton title="Fiche cliente" icon="person-outline" tone="light" onPress={() => navigation.navigate("AdminClient", { id: o.customer.id })} />
        </View>
      </Card>

      <Title>Articles</Title>
      <Card>
        {o.items.map((it) => (
          <View key={it.id} style={[ui.row, s.item]}>
            <Image source={it.image ? { uri: it.image } : null} style={ui.thumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={ui.name}>{it.name}</Text>
              <Text style={ui.sub}>{it.variant ? `${it.variant} · ` : ""}{it.quantity} x {money(it.unit_price)}{it.made_to_order ? " · sur commande" : ""}</Text>
            </View>
            <Text style={ui.amount}>{money(it.total)}</Text>
          </View>
        ))}
      </Card>

      <Title>Livraison</Title>
      <Card>
        {o.delivery ? (
          <>
            <View style={[ui.row, { justifyContent: "space-between" }]}>
              <Text style={ui.name}>{o.delivery.courier ? o.delivery.courier.name : "Pas encore de livreur"}</Text>
              <Pill status={o.delivery.status} label={o.delivery.status_label} />
            </View>
            {o.delivery.courier ? <Text style={ui.sub}>{o.delivery.courier.vehicle} · {o.delivery.courier.phone}</Text> : null}
            <Line label="À encaisser par le livreur" value={money(o.delivery.cash_to_collect)} />
            {o.delivery.cash_collected !== null ? <Line label="Encaissé" value={money(o.delivery.cash_collected)} color={colors.success} /> : null}
            {o.delivery.note ? <Text style={ui.sub}>Note du livreur : {o.delivery.note}</Text> : null}
            <View style={ui.actions}>
              {o.delivery.courier?.phone ? <SmallButton title="Appeler le livreur" icon="call-outline" tone="light" onPress={() => Linking.openURL(`tel:${o.delivery.courier.phone}`)} /> : null}
              {["searching", "offered", "failed"].includes(o.delivery.status) ? (
                <SmallButton title="Relancer la recherche" icon="refresh" tone="dark" busy={busy === "relaunch"} onPress={() => act("relaunch", () => G.orderRelaunch(o.id))} />
              ) : null}
            </View>
          </>
        ) : (
          <Text style={ui.sub}>La recherche d'un livreur démarre quand la commande passe en « Prête ».</Text>
        )}
      </Card>

      <Title>Paiements</Title>
      <Card>
        {o.payments.length ? o.payments.map((p) => (
          <View key={p.id} style={[ui.row, s.item]}>
            <View style={{ flex: 1 }}>
              <Text style={ui.name}>{p.method_label} · {p.purpose_label}</Text>
              <Text style={ui.sub}>{dateFr(p.created_at)} · {p.reference}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={ui.amount}>{money(p.amount)}</Text>
              <Pill status={p.status} label={p.status_label} />
            </View>
          </View>
        )) : <Text style={ui.sub}>Aucun paiement pour le moment.</Text>}
      </Card>

      <Title>Note interne</Title>
      <Card>
        <Field value={notes} onChangeText={setNotes} placeholder="Visible seulement par vous" multiline style={{ marginBottom: 8 }} />
        <SmallButton title="Enregistrer la note" tone="light" busy={busy === "notes"} onPress={async () => { setBusy("notes"); await run(() => G.orderNotes(o.id, notes), { success: "Note enregistrée." }); setBusy(null); }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
