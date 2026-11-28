import { Text, View } from "react-native";

import * as G from "../../api/gestion";
import { Card, PagedList, Pill, SmallButton, dateFr, styles as ui, usePaged } from "../../components/admin/ui";
import { colors } from "../../theme";

export default function AdminPromotionsScreen({ navigation }) {
  const paged = usePaged(G.promotions, {});
  const now = Date.now();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucune promotion pour le moment."
        header={<SmallButton title="Nouvelle promotion" icon="add" tone="caramel" onPress={() => navigation.navigate("AdminPromotionForm", {})} style={{ alignSelf: "flex-start", marginBottom: 12 }} />}
        renderItem={({ item: p }) => {
          const ended = p.ends_at && new Date(p.ends_at).getTime() < now;
          const live = p.active && !ended && new Date(p.starts_at).getTime() <= now;
          return (
            <Card onPress={() => navigation.navigate("AdminPromotionForm", { promo: p })}>
              <View style={ui.row}>
                <View style={{ flex: 1 }}>
                  <Text style={ui.name}>{p.title}{p.code ? ` · ${p.code}` : ""}</Text>
                  <Text style={ui.sub} numberOfLines={2}>{p.message}</Text>
                  <Text style={ui.sub}>Du {dateFr(p.starts_at, false)}{p.ends_at ? ` au ${dateFr(p.ends_at, false)}` : ""}{p.emailed_at ? ` · email envoyé à ${p.emailed_count}` : ""}</Text>
                </View>
                <Pill status={live ? "on" : "off"} label={live ? "En cours" : ended ? "Terminée" : p.active ? "À venir" : "Désactivée"} />
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}
