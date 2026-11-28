import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";

import * as G from "../../api/gestion";
import { errorMessage } from "../../api/client";
import { Card, Line, Pill, SmallButton, Title, dateFr, run, styles as ui } from "../../components/admin/ui";
import { colors, money } from "../../theme";
import { confirm } from "../../utils/notify";

export default function AdminClientScreen({ route, navigation }) {
  const { id } = route.params;
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => G.client(id).then((d) => { setC(d); navigation.setOptions({ title: d.name }); }).catch((e) => setError(errorMessage(e))), [id, navigation]);
  useEffect(() => { load(); }, [load]);

  if (!c) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{error ? <Text style={ui.empty}>{error}</Text> : <ActivityIndicator color={colors.caramel} />}</View>;

  const access = (what, title, text, yes) => confirm(title, text, () => run(() => G.clientAccess(c.id, what), { success: "C'est fait.", onDone: setC }), yes);
  const phone = (c.phone_number || c.addresses[0]?.phone || "").replace(/\D/g, "");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.page}>
      <Card>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <Text style={[ui.name, { fontSize: 16 }]}>{c.name}</Text>
          {!c.is_active ? <Pill status="cancelled" label="Bloquée" /> : c.is_staff ? <Pill status="processing" label="Équipe de gestion" /> : null}
        </View>
        <Line label="Email" value={c.email} />
        {c.phone_number ? <Line label="Téléphone" value={c.phone_number} /> : null}
        <Line label="Inscrite le" value={dateFr(c.date_joined, false)} />
        <Line label="Email vérifié" value={c.email_verified ? "Oui" : "Non"} />
        <Line label="Accepte les promos" value={c.newsletter ? "Oui" : "Non"} />
        <Line label="Commandes" value={String(c.orders_count)} />
        <Line label="Total payé" value={money(c.total_spent, true)} strong />
        <View style={ui.actions}>
          {phone ? <SmallButton title="Appeler" icon="call-outline" tone="light" onPress={() => Linking.openURL(`tel:${phone}`)} /> : null}
          {phone ? <SmallButton title="WhatsApp" icon="logo-whatsapp" tone="success" onPress={() => Linking.openURL(`https://wa.me/${phone.startsWith("221") ? phone : `221${phone}`}`)} /> : null}
          <SmallButton title="Email" icon="mail-outline" tone="light" onPress={() => Linking.openURL(`mailto:${c.email}`)} />
        </View>
      </Card>

      <Title>Adresses</Title>
      <Card>
        {c.addresses.length ? c.addresses.map((a) => <Text key={a.id} style={[ui.sub, { paddingVertical: 4 }]} selectable>{a.label} · {a.phone}</Text>) : <Text style={ui.sub}>Aucune adresse.</Text>}
      </Card>

      <Title>Commandes</Title>
      {c.orders.length ? c.orders.map((o) => (
        <Card key={o.id} onPress={() => navigation.navigate("AdminOrder", { id: o.id })}>
          <View style={ui.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.name}>{o.order_number}</Text>
              <Text style={ui.sub}>{dateFr(o.created_at)} · {o.items_count} article(s)</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={ui.amount}>{money(o.total)}</Text>
              <Pill status={o.status} label={o.status_label} />
            </View>
          </View>
        </Card>
      )) : <Card><Text style={ui.sub}>Aucune commande.</Text></Card>}

      <Title>Accès</Title>
      <Card>
        <View style={[ui.actions, { marginTop: 0 }]}>
          {c.is_active
            ? <SmallButton title="Bloquer le compte" icon="ban-outline" tone="danger" onPress={() => access("block", "Bloquer ce compte ?", "La personne ne pourra plus se connecter.", "Bloquer")} />
            : <SmallButton title="Débloquer le compte" icon="lock-open-outline" tone="success" onPress={() => access("unblock", "Débloquer ce compte ?", "")} />}
          {c.is_staff
            ? <SmallButton title="Retirer l'accès gestion" icon="remove-circle-outline" tone="danger" onPress={() => access("remove_staff", "Retirer l'accès ?", "Cette personne ne verra plus l'espace de gestion.", "Retirer")} />
            : <SmallButton title="Donner l'accès gestion" icon="key-outline" tone="dark" onPress={() => access("make_staff", "Donner l'accès gestion ?", "Cette personne pourra tout gérer : commandes, articles, paiements, réglages.", "Donner l'accès")} />}
        </View>
      </Card>
    </ScrollView>
  );
}
