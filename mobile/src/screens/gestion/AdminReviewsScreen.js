import { Text, View } from "react-native";

import * as G from "../../api/gestion";
import { Card, PagedList, SmallButton, dateFr, run, styles as ui, usePaged } from "../../components/admin/ui";
import { colors } from "../../theme";
import { confirm } from "../../utils/notify";

export default function AdminReviewsScreen() {
  const paged = usePaged(G.reviews, {});
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PagedList
        paged={paged}
        emptyText="Aucun avis pour le moment."
        renderItem={({ item: r }) => (
          <Card>
            <Text style={ui.name}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.product_name}</Text>
            <Text style={ui.sub}>{r.client} · {dateFr(r.created_at, false)}</Text>
            {r.comment ? <Text style={[ui.sub, { color: colors.text, marginTop: 6 }]}>{r.comment}</Text> : null}
            <SmallButton title="Supprimer l'avis" icon="trash-outline" tone="danger" style={{ alignSelf: "flex-start", marginTop: 10 }}
              onPress={() => confirm("Supprimer cet avis ?", "", async () => { if (await run(() => G.deleteReview(r.id), { success: "Avis supprimé." })) paged.setItems((l) => l.filter((x) => x.id !== r.id)); }, "Supprimer")} />
          </Card>
        )}
      />
    </View>
  );
}
