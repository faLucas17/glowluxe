import { useState } from "react";
import { Text, View } from "react-native";

import * as G from "../../api/gestion";
import { Card, Chips, PagedList, Pill, SearchBar, dateFr, styles as ui, usePaged } from "../../components/admin/ui";
import { colors, money } from "../../theme";

const FILTERS = [
  { value: "", label: "Toutes" },
  { value: "a_traiter", label: "À traiter" },
  { value: "pending", label: "Attente paiement" },
  { value: "en_livraison", label: "En livraison" },
  { value: "delivered", label: "Livrées" },
  { value: "cancelled", label: "Annulées" },
];

export default function AdminOrdersScreen({ navigation, route }) {
  const [status, setStatus] = useState(route.params?.status || "");
  const [search, setSearch] = useState("");
  const paged = usePaged(G.orders, { status, search });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucune commande ici."
        header={
          <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="N° de commande, nom, email, téléphone" />
            <Chips options={FILTERS} value={status} onChange={setStatus} style={{ paddingBottom: 10 }} />
          </View>
        }
        renderItem={({ item: o }) => (
          <Card onPress={() => navigation.navigate("AdminOrder", { id: o.id })}>
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <Text style={ui.name}>{o.order_number}</Text>
                <Text style={ui.sub} numberOfLines={1}>{o.client} · {o.items_count} article(s){o.zone ? ` · ${o.zone}` : ""}</Text>
                <Text style={ui.sub}>{dateFr(o.created_at)}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={ui.amount}>{money(o.total)}</Text>
                {o.amount_due > 0 && o.status !== "cancelled" ? <Text style={[ui.sub, { color: colors.danger }]}>Reste {money(o.amount_due)}</Text> : null}
                <Pill status={o.status} label={o.status_label} />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
