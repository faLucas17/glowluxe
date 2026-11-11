import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { fetchProduct, fetchRelated } from "../api";
import { errorMessage, peekCache } from "../api/client";
import Button from "../components/Button";
import Chip from "../components/Chip";
import Empty from "../components/Empty";
import ProductCard from "../components/ProductCard";
import { Container } from "../components/Screen";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { colors, fonts, money, radius } from "../theme";
import { notify } from "../utils/notify";

export default function ProductDetailScreen({ route, navigation }) {
  const { slug, preview } = route.params;
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const imageWidth = wide ? Math.min(width, 1280) * 0.5 - 24 : width;
  const [product, setProduct] = useState(peekCache(`/products/${slug}/`) || null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [related, setRelated] = useState([]);
  const listRef = useRef(null);
  const { add } = useCart();
  const { isFavorite, toggle } = useFavorites();

  useEffect(() => {
    fetchProduct(slug).then(setProduct).catch((e) => setError(errorMessage(e, "Article introuvable.")));
    fetchRelated(slug).then(setRelated).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (product?.variants?.length === 1) setVariant(product.variants[0]);
  }, [product]);

  const p = product || preview;
  if (!p) return error ? <Empty icon="alert-circle-outline" title="Article introuvable" text={error} /> : <View style={{ flex: 1, backgroundColor: colors.cream }} />;

  const images = product?.images?.length ? product.images : p.primary_image ? [{ id: "p", image: p.primary_image, thumbnail: p.primary_image }] : [];
  const fav = isFavorite(p.id);
  const variants = product?.variants || [];
  const price = Number(p.price) + Number(variant?.extra_price || 0);
  const maxQty = product?.made_to_order ? 20 : Math.max(1, Math.min(20, variant ? variant.stock_quantity : product?.stock_quantity ?? 20));
  const outOfStock = product && !product.in_stock;

  const onAdd = async () => {
    if (variants.length && !variant) return notify("Choisissez une option", "Sélectionnez la taille / couleur.");
    setAdding(true);
    try {
      await add(product || p, variant, qty);
      notify("Ajouté au panier ✨", `${p.name} x${qty}`);
    } catch (e) {
      notify("Impossible d'ajouter", errorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const gallery = (
    <View style={{ width: imageWidth }}>
      <FlatList
        ref={listRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => String(i.id)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth))}
        renderItem={({ item }) => (
          <Image source={{ uri: item.image }} style={{ width: imageWidth, height: imageWidth * 1.1, backgroundColor: colors.cream }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
        )}
        ListEmptyComponent={<View style={{ width: imageWidth, height: imageWidth * 1.1, backgroundColor: colors.cream }} />}
      />
      {images.length > 1 && (
        <View style={styles.thumbs}>
          {images.map((img, i) => (
            <Pressable key={img.id} onPress={() => { setIndex(i); listRef.current?.scrollToIndex({ index: i, animated: true }); }}
              style={[styles.thumb, i === index && { borderColor: colors.brown, borderWidth: 2 }]}>
              <Image source={{ uri: img.thumbnail || img.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const info = (
    <View style={{ padding: 16, flex: 1 }}>
      <Text style={styles.cat}>{(p.category_name || product?.category?.name || "").toUpperCase()}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Text style={styles.name}>{p.name}</Text>
        <Pressable onPress={() => toggle(product || p)} hitSlop={10} style={{ marginLeft: "auto", paddingLeft: 12 }} accessibilityLabel="Favori">
          <Ionicons name={fav ? "heart" : "heart-outline"} size={24} color={fav ? colors.caramel : colors.brown} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
        <Text style={styles.price}>{money(price, true)}</Text>
        {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) ? <Text style={styles.old}>{money(p.compare_at_price, true)}</Text> : null}
        {p.discount_percent > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>-{p.discount_percent}%</Text></View> : null}
      </View>

      {product && (product.is_handmade || product.made_to_order || product.material) ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {product.is_handmade && <View style={styles.tag}><Text style={styles.tagText}>🧶 Fait main</Text></View>}
          {product.made_to_order && <View style={styles.tag}><Text style={styles.tagText}>Sur commande{product.production_days ? ` · ${product.production_days} jours` : ""}</Text></View>}
          {product.material ? <View style={styles.tag}><Text style={styles.tagText}>{product.material}</Text></View> : null}
        </View>
      ) : null}

      {variants.length > 0 && (
        <>
          <Text style={styles.label}>Taille / Couleur</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {variants.map((v) => (
              <Chip key={v.id} label={`${v.label}${Number(v.extra_price) ? ` (+${money(v.extra_price)})` : ""}`} active={variant?.id === v.id}
                onPress={() => { setVariant(v); setQty(1); }} style={!product?.made_to_order && v.stock_quantity === 0 ? { opacity: 0.4 } : null} />
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Quantité</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={styles.stepBtn} accessibilityLabel="Moins"><Ionicons name="remove" size={18} color={colors.brown} /></Pressable>
        <Text style={styles.qty}>{qty}</Text>
        <Pressable onPress={() => setQty(Math.min(maxQty, qty + 1))} style={styles.stepBtn} accessibilityLabel="Plus"><Ionicons name="add" size={18} color={colors.brown} /></Pressable>
      </View>

      {p.description || product?.description ? (
        <>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.desc}>{product?.description || p.description}</Text>
        </>
      ) : null}
      {product?.average_rating ? <Text style={[styles.desc, { marginTop: 8 }]}>★ {product.average_rating} / 5 ({product.reviews.length} avis)</Text> : null}

      <Button
        title={outOfStock ? "Rupture de stock" : "Ajouter au panier"}
        onPress={onAdd}
        loading={adding}
        disabled={outOfStock || !product}
        style={{ marginTop: 20 }}
      />
      {product?.made_to_order ? <Text style={styles.hint}>Article fabriqué pour vous : un acompte est demandé à la commande.</Text> : null}
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Container>
        {wide ? <View style={{ flexDirection: "row", gap: 24, padding: 12 }}>{gallery}{info}</View> : <>{gallery}{info}</>}
        {related.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={[styles.label, { fontSize: 16 }]}>Vous aimerez aussi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {related.map((r) => (
                <ProductCard key={r.id} product={r} width={150} onPress={() => navigation.push("ProductDetail", { slug: r.slug, preview: r })} />
              ))}
            </ScrollView>
          </View>
        )}
      </Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  thumbs: { flexDirection: "row", gap: 8, padding: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  cat: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: 1, color: colors.textSecondary },
  name: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.text, marginTop: 4, flex: 1 },
  price: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.caramel },
  old: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, textDecorationLine: "line-through" },
  badge: { backgroundColor: colors.caramel, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: colors.white, fontFamily: fonts.sansBold, fontSize: 11 },
  tag: { backgroundColor: colors.cream, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.brown },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text, marginTop: 18, marginBottom: 8 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.caramelLight, borderRadius: 999, paddingHorizontal: 6 },
  stepBtn: { padding: 8 },
  qty: { fontFamily: fonts.sansBold, fontSize: 15, minWidth: 20, textAlign: "center", color: colors.text },
  desc: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 8, textAlign: "center" },
});
