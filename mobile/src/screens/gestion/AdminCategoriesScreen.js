import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";

import * as G from "../../api/gestion";
import { errorMessage } from "../../api/client";
import { Card, Empty, Pill, SmallButton, styles as ui } from "../../components/admin/ui";
import { colors } from "../../theme";

export default function AdminCategoriesScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => G.categories().then((d) => { setItems(d); setError(null); }).catch((e) => setError(errorMessage(e))), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Catégories principales puis leurs sous-catégories, dans l'ordre d'affichage
  const ordered = (items || []).filter((c) => !c.parent).flatMap((p) => [p, ...(items || []).filter((c) => c.parent === p.id)]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={ordered}
      keyExtractor={(c) => c.id}
      contentContainerStyle={ui.listContent}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.caramel} />}
      ListHeaderComponent={<SmallButton title="Ajouter une catégorie" icon="add" tone="caramel" onPress={() => navigation.navigate("AdminCategoryForm", {})} style={{ alignSelf: "flex-start", marginBottom: 12 }} />}
      ListEmptyComponent={items ? <Empty text={error || "Aucune catégorie."} /> : <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} />}
      renderItem={({ item: c }) => (
        <Card onPress={() => navigation.navigate("AdminCategoryForm", { category: c })} style={c.parent ? { marginLeft: 22 } : null}>
          <View style={ui.row}>
            {c.image_url ? <Image source={{ uri: c.image_url }} style={[ui.thumb, { width: 44, height: 44 }]} contentFit="cover" /> : null}
            <View style={{ flex: 1 }}>
              <Text style={ui.name}>{c.parent ? "› " : ""}{c.name}</Text>
              <Text style={ui.sub}>{c.products_count} article(s) · ordre {c.position}</Text>
            </View>
            <Pill status={c.is_active ? "on" : "off"} label={c.is_active ? "Visible" : "Masquée"} />
          </View>
        </Card>
      )}
    />
  );
}
