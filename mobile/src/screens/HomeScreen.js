import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { fetchCategories, fetchProducts, fetchPromotions } from "../api";
import { peekCache } from "../api/client";
import AppHeader from "../components/AppHeader";
import Chip from "../components/Chip";
import Empty from "../components/Empty";
import ProductGrid from "../components/ProductGrid";
import SectionTitle from "../components/SectionTitle";
import GridSkeleton from "../components/Skeleton";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radius } from "../theme";
import { useGrid } from "../utils/layout";

export default function HomeScreen({ navigation, route }) {
  const { user } = useAuth();
  const { padding } = useGrid();
  const cached = peekCache("/products/", { page: 1 });
  const [products, setProducts] = useState(cached?.results || []);
  const [next, setNext] = useState(cached?.next || null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState(null);
  const [promos, setPromos] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef(null);

  // Ouvre la barre de recherche quand on touche la loupe de l'en-tête
  useEffect(() => {
    if (route.params?.search) {
      setSearchOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [route.params?.search]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const params = useCallback(
    (p) => ({ page: p, ...(debounced.length >= 2 ? { search: debounced } : {}), ...(category ? { category } : {}) }),
    [debounced, category]
  );

  const load = useCallback(
    async (force = false) => {
      setError(null);
      try {
        const data = await fetchProducts(params(1), force);
        setProducts(data.results ?? data);
        setNext(data.next ?? null);
        setPage(1);
      } catch (e) {
        setError("Impossible de charger la boutique. Vérifiez votre connexion.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchCategories().then((c) => setCategories(c.filter((x) => !x.parent))).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) fetchPromotions().then(setPromos).catch(() => setPromos([]));
    else setPromos([]);
  }, [user]);

  const loadMore = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchProducts(params(page + 1));
      setProducts((prev) => [...prev, ...(data.results ?? [])]);
      setNext(data.next ?? null);
      setPage(page + 1);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  const openProduct = useCallback((p) => navigation.navigate("ProductDetail", { slug: p.slug, preview: p }), [navigation]);
  const searching = debounced.length >= 2;

  const header = (
    <View>
      {searchOpen && (
        <View style={styles.search}>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un produit..."
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textSecondary} /></Pressable>
          ) : <Ionicons name="search" size={18} color={colors.brown} />}
        </View>
      )}

      {promos.slice(0, 1).map((p) => (
        <Pressable key={p.id} style={styles.promo} onPress={() => p.category_slug && setCategory(p.category_slug)}>
          {p.image ? <Image source={{ uri: p.image }} style={styles.promoImg} contentFit="cover" /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>✨ {p.title}</Text>
            <Text style={styles.promoText} numberOfLines={2}>{p.message}</Text>
            {p.code ? <Text style={styles.promoCode}>Code : {p.code}</Text> : null}
          </View>
        </Pressable>
      ))}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
        <Chip label="Tout" active={!category} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <Chip key={c.id} label={c.name} active={category === c.slug} onPress={() => setCategory(category === c.slug ? null : c.slug)} />
        ))}
      </ScrollView>

      <SectionTitle
        title={searching ? `Résultats pour « ${debounced} »` : category ? categories.find((c) => c.slug === category)?.name || "Collection" : "Nouveautés"}
        subtitle={searching ? `${products.length} article(s)` : "Découvrez les dernières pièces de la collection"}
        icon={searching ? "search" : "sparkles-outline"}
      />
      {loading ? <GridSkeleton /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader onSearch={() => { setSearchOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 150); }} />
      <ProductGrid
        products={loading ? [] : products}
        onPressProduct={openProduct}
        header={<View style={{ marginHorizontal: -padding, paddingHorizontal: padding }}>{header}</View>}
        onEndReached={loadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.caramel} />}
        footer={loadingMore ? <ActivityIndicator color={colors.caramel} style={{ margin: 20 }} /> : null}
        empty={
          loading ? null : error ? (
            <Empty icon="cloud-offline-outline" title="Oups" text={error} action="Réessayer" onAction={() => { setLoading(true); load(true); }} />
          ) : (
            <Empty icon="search-outline" title="Aucun article" text={searching ? `Rien pour « ${debounced} ».` : "Cette collection arrive bientôt."} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.cream, borderRadius: radius.md,
    paddingHorizontal: 14, marginTop: 12,
  },
  searchInput: { flex: 1, height: 46, fontFamily: fonts.sans, fontSize: 14, color: colors.text, outlineStyle: "none" },
  promo: {
    flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.brown, borderRadius: radius.md,
    padding: 14, marginTop: 12,
  },
  promoImg: { width: 56, height: 56, borderRadius: 8 },
  promoTitle: { color: colors.caramelLight, fontFamily: fonts.sansBold, fontSize: 14 },
  promoText: { color: colors.cream, fontFamily: fonts.sans, fontSize: 12, marginTop: 2 },
  promoCode: { color: colors.white, fontFamily: fonts.sansBold, fontSize: 12, marginTop: 4 },
});
