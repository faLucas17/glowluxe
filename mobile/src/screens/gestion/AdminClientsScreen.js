import { useState } from "react";
import { Text, View } from "react-native";

import * as G from "../../api/gestion";
import { Card, Chips, PagedList, Pill, SearchBar, dateFr, styles as ui, usePaged } from "../../components/admin/ui";
import { colors, money } from "../../theme";

export default function AdminClientsScreen({ navigation }) {
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("");
  const paged = usePaged(G.clients, { search, team });
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucune cliente trouvée."
        header={<View><SearchBar value={search} onChangeText={setSearch} placeholder="Nom, email, téléphone" /><Chips options={[{ value: "", label: "Toutes" }, { value: "1", label: "Équipe de gestion" }]} value={team} onChange={setTeam} style={{ paddingBottom: 10 }} /></View>}
        renderItem={({ item: c }) => (
          <Card onPress={() => navigation.navigate("AdminClient", { id: c.id })}>
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <Text style={ui.name}>{c.name}</Text>
                <Text style={ui.sub} numberOfLines={1}>{c.email}{c.phone_number ? ` · ${c.phone_number}` : ""}</Text>
                <Text style={ui.sub}>Inscrite le {dateFr(c.date_joined, false)} · {c.orders_count} commande(s)</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={ui.amount}>{money(c.total_spent)}</Text>
                {!c.is_active ? <Pill status="cancelled" label="Bloquée" /> : c.is_staff ? <Pill status="processing" label="Gestion" /> : null}
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
