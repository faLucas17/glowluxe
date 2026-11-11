import { useCallback } from "react";
import { FlatList, View } from "react-native";

import { useGrid } from "../utils/layout";
import ProductCard from "./ProductCard";

/** Grille responsive : 2 colonnes téléphone, 3-4 tablette, 5 ordinateur. */
export default function ProductGrid({ products, onPressProduct, header, footer, empty, onEndReached, refreshControl }) {
  const { columns, itemWidth, gap, padding, contentWidth } = useGrid();
  const renderItem = useCallback(
    ({ item }) => <ProductCard product={item} width={itemWidth} onPress={() => onPressProduct(item)} />,
    [itemWidth, onPressProduct]
  );
  return (
    <FlatList
      key={`grid-${columns}`}
      data={products}
      numColumns={columns}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      columnWrapperStyle={{ gap }}
      contentContainerStyle={{ paddingHorizontal: padding, paddingBottom: 40, width: contentWidth, alignSelf: "center" }}
      ListHeaderComponent={header}
      ListFooterComponent={footer || <View style={{ height: 20 }} />}
      ListEmptyComponent={empty}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      refreshControl={refreshControl}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={9}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
    />
  );
}
