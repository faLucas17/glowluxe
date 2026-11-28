import { useState } from "react";
import { Text, View } from "react-native";

import * as G from "../../api/gestion";
import { Card, Chips, PagedList, Pill, SearchBar, dateFr, styles as ui, usePaged } from "../../components/admin/ui";
import { colors, money } from "../../theme";

const FILTERS = [
  { value: "", label: "Tous" },
  { value: "success", label: "Réussis" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Échoués" },
];

export default function AdminPaymentsScreen({ navigation }) {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const paged = usePaged(G.payments, { status, search });
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucun paiement."
        header={<View><SearchBar value={search} onChangeText={setSearch} placeholder="Référence, n° de commande, téléphone" /><Chips options={FILTERS} value={status} onChange={setStatus} style={{ paddingBottom: 10 }} /></View>}
        renderItem={({ item: p }) => (
          <Card onPress={() => navigation.navigate("AdminOrder", { id: p.order_id })}>
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <Text style={ui.name}>{p.method_label} · {p.order_number}</Text>
                <Text style={ui.sub}>{p.purpose_label} · {dateFr(p.created_at)}</Text>
                <Text style={ui.sub}>{p.reference}{p.payer_phone_number ? ` · ${p.payer_phone_number}` : ""}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={ui.amount}>{money(p.amount)}</Text>
                <Pill status={p.status} label={p.status_label} />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
