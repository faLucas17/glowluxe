import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useFavorites } from "../context/FavoritesContext";
import { colors, fonts, money, radius } from "../theme";

function ProductCard({ product, width, onPress }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width, marginBottom: 18 }, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={product.name}>
      <View style={[styles.imageBox, { height: width * 1.22 }]}>
        <Image
          source={product.primary_image ? { uri: product.primary_image } : null}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={String(product.id)}
          placeholder={{ blurhash: "L9I4]O~q00of%Mt7j[WB00WB?bWB" }}
        />
        {product.discount_percent > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>-{product.discount_percent}%</Text></View>
        )}
        {product.is_handmade && (
          <View style={[styles.badge, styles.handmade]}><Text style={styles.badgeText}>Fait main</Text></View>
        )}
        <Pressable onPress={() => toggle(product)} hitSlop={10} style={styles.heart} accessibilityLabel={fav ? "Retirer des favoris" : "Ajouter aux favoris"}>
          <Ionicons name={fav ? "heart" : "heart-outline"} size={17} color={fav ? colors.caramel : colors.brown} />
        </Pressable>
      </View>
      {product.category_name ? <Text style={styles.cat} numberOfLines={1}>{product.category_name.toUpperCase()}</Text> : null}
      <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{money(product.price)}</Text>
        {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) ? (
          <Text style={styles.old}>{money(product.compare_at_price)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(ProductCard);

const styles = StyleSheet.create({
  imageBox: { borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.cream },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: colors.caramel, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  handmade: { top: undefined, bottom: 8, backgroundColor: "rgba(74,44,33,0.85)" },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.sansBold },
  heart: {
    position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center",
  },
  cat: { marginTop: 8, fontSize: 9.5, letterSpacing: 0.8, color: colors.textSecondary, fontFamily: fonts.sansMedium },
  name: { fontSize: 13, color: colors.text, fontFamily: fonts.sansMedium, marginTop: 2, lineHeight: 17 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontSize: 13, color: colors.caramel, fontFamily: fonts.sansBold },
  old: { fontSize: 11, color: colors.textSecondary, textDecorationLine: "line-through", fontFamily: fonts.sans },
});
