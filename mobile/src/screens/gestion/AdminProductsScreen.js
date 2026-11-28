import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import * as G from "../../api/gestion";
import { Card, Chips, PagedList, Pill, SearchBar, SmallButton, styles as ui, usePaged } from "../../components/admin/ui";
import { colors, money } from "../../theme";

const STATES = [
  { value: "", label: "Tous" },
  { value: "active", label: "En ligne" },
  { value: "inactive", label: "Masqués" },
  { value: "low", label: "Stock bas" },
];

export default function AdminProductsScreen({ navigation }) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [cats, setCats] = useState([]);
  const paged = usePaged(G.products, { search, state, category });

  useEffect(() => { G.categories().then(setCats).catch(() => {}); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucun article."
        header={
          <View>
            <SmallButton title="Ajouter un article" icon="add" tone="caramel" onPress={() => navigation.navigate("AdminProductForm", {})} style={{ alignSelf: "flex-start", marginBottom: 12 }} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, référence, catégorie" />
            <Chips options={STATES} value={state} onChange={setState} />
            <Chips options={[{ value: "", label: "Toutes catégories" }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} value={category} onChange={setCategory} style={{ paddingBottom: 10 }} />
          </View>
        }
        renderItem={({ item: p }) => (
          <Card onPress={() => navigation.navigate("AdminProductForm", { id: p.id })}>
            <View style={ui.row}>
              <Image source={p.thumbnail ? { uri: p.thumbnail } : null} style={ui.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={ui.name} numberOfLines={2}>{p.name}</Text>
                <Text style={ui.sub}>{p.category_name} · {p.made_to_order ? "Sur commande" : `Stock : ${p.stock_quantity}`} · {p.sold} vendu(s)</Text>
                <View style={[ui.row, { gap: 6, marginTop: 5 }]}>
                  <Pill status={p.is_active ? "on" : "off"} label={p.is_active ? "En ligne" : "Masqué"} />
                  {p.is_handmade ? <Pill status="processing" label="Fait main" /> : null}
                  {!p.made_to_order && p.stock_quantity <= 3 ? <Pill status="cancelled" label={p.stock_quantity ? "Stock bas" : "Épuisé"} /> : null}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={ui.amount}>{money(p.price)}</Text>
                {p.compare_at_price ? <Text style={[ui.sub, { textDecorationLine: "line-through" }]}>{money(p.compare_at_price)}</Text> : null}
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
