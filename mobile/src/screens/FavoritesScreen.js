import { View } from "react-native";

import Empty from "../components/Empty";
import ProductGrid from "../components/ProductGrid";
import SectionTitle from "../components/SectionTitle";
import { useFavorites } from "../context/FavoritesContext";
import { colors } from "../theme";

export default function FavoritesScreen({ navigation }) {
  const { items } = useFavorites();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProductGrid
        products={items}
        onPressProduct={(p) => navigation.navigate("ProductDetail", { slug: p.slug, preview: p })}
        header={items.length ? <SectionTitle title="Mes favoris" subtitle={`${items.length} article(s) que vous aimez`} icon="heart-outline" /> : null}
        empty={<Empty icon="heart-outline" title="Aucun favori" text="Touchez le cœur d'un article pour le retrouver ici." action="Voir la boutique" onAction={() => navigation.navigate("Boutique")} />}
      />
    </View>
  );
}
