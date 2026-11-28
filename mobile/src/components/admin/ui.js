import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { errorMessage } from "../../api/client";
import { colors, fonts, radius } from "../../theme";
import { notify } from "../../utils/notify";

/** Petits éléments communs à l'espace de gestion (téléphone et ordinateur). */

export const STATUS_COLORS = {
  pending: ["#FFF4E0", "#9A6200"],
  deposit_paid: ["#EAF2FF", "#2557A7"],
  paid: ["#E8F5E9", "#2E7D32"],
  processing: ["#F3E9FF", "#6B3FA0"],
  ready: ["#FFF0E6", "#B4531A"],
  shipped: ["#E6F6F8", "#1F7A85"],
  in_transit: ["#E6F6F8", "#1F7A85"],
  out_for_delivery: ["#E6F6F8", "#1F7A85"],
  delivered: ["#E8F5E9", "#2E7D32"],
  cancelled: ["#FBEDEB", "#B23B2E"],
  refunded: ["#F2F2F2", "#666666"],
  success: ["#E8F5E9", "#2E7D32"],
  failed: ["#FBEDEB", "#B23B2E"],
  approved: ["#E8F5E9", "#2E7D32"],
  suspended: ["#FBEDEB", "#B23B2E"],
  rejected: ["#F2F2F2", "#666666"],
  searching: ["#FFF4E0", "#9A6200"],
  offered: ["#FFF0E6", "#B4531A"],
  on: ["#E8F5E9", "#2E7D32"],
  off: ["#F2F2F2", "#666666"],
};

export function Pill({ status, label }) {
  const [bg, fg] = STATUS_COLORS[status] || ["#F2F2F2", "#555"];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const inner = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return inner;
  return <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.85 }}>{inner}</Pressable>;
}

export function Title({ children, right, style }) {
  return (
    <View style={[styles.titleRow, style]}>
      <Text style={styles.title}>{children}</Text>
      {right}
    </View>
  );
}

export function Line({ label, value, strong, color }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, strong && { fontFamily: fonts.sansBold }, color && { color }]} selectable>{value}</Text>
    </View>
  );
}

export function SmallButton({ title, icon, onPress, tone = "dark", disabled, busy, style }) {
  const tones = {
    dark: [colors.brown, colors.white],
    light: [colors.cream, colors.brown],
    caramel: [colors.caramel, colors.white],
    danger: [colors.dangerBg, colors.danger],
    success: [colors.successBg, colors.success],
  };
  const [bg, fg] = tones[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [styles.small, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
      accessibilityRole="button"
    >
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.smallText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chips({ options, value, onChange, style }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8, paddingVertical: 4 }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipOn]}>
            <Text style={[styles.chipText, active && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchBar({ value, onChangeText, placeholder = "Rechercher..." }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={17} color={colors.textSecondary} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSecondary} style={styles.searchInput} autoCorrect={false} returnKeyType="search" />
      {value ? <Pressable onPress={() => onChangeText("")} hitSlop={8}><Ionicons name="close-circle" size={17} color={colors.textSecondary} /></Pressable> : null}
    </View>
  );
}

export function Toggle({ label, hint, value, onChange }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch value={!!value} onValueChange={onChange} trackColor={{ true: colors.caramel, false: colors.creamDark }} thumbColor={colors.white} />
    </View>
  );
}

/** Choix parmi une liste (affiché en pastilles). */
export function Select({ label, options, value, onChange, allowEmpty, emptyLabel = "Aucune" }) {
  const list = allowEmpty ? [{ value: null, label: emptyLabel }, ...options] : options;
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.selectWrap}>
        {list.map((o) => {
          const active = (o.value ?? null) === (value ?? null);
          return (
            <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipOn]}>
              <Text style={[styles.chipText, active && { color: colors.white }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stat({ icon, label, value, tone = colors.caramel, onPress, style }) {
  return (
    <View style={style}>
      <Card style={[styles.stat, { flex: 1 }]} onPress={onPress}>
        <View style={[styles.statIcon, { backgroundColor: colors.cream }]}><Ionicons name={icon} size={18} color={tone} /></View>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </Card>
    </View>
  );
}

export function Empty({ text }) {
  return <Text style={styles.empty}>{text}</Text>;
}

/** Choix de photos (galerie). Renvoie les fichiers sélectionnés, ou [] si annulé. */
export async function pickImages(multiple = true) {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify("Photos", "Autorisez l'accès aux photos dans les réglages du téléphone.");
      return [];
    }
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 10 : 1,
    quality: 0.85,
  });
  return res.canceled ? [] : res.assets;
}

/** Liste paginée + recherche + tirer pour rafraîchir. */
export function usePaged(fetcher, params) {
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params || {});
  const latest = useRef(0);
  const loadedOnce = useRef(false);

  const load = useCallback(async (p = 1, mode = "load") => {
    const ticket = ++latest.current;
    if (mode === "refresh") setRefreshing(true);
    else if (p === 1) setLoading(true);
    try {
      const data = await fetcher({ ...(params || {}), page: p });
      if (ticket !== latest.current) return;
      const results = Array.isArray(data) ? data : data.results || [];
      setItems((prev) => (p === 1 ? results : [...prev, ...results]));
      setNext(Array.isArray(data) ? null : data.next);
      setPage(p);
      setError(null);
      loadedOnce.current = true;
    } catch (e) {
      if (ticket === latest.current) setError(errorMessage(e));
    } finally {
      if (ticket === latest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
  }, [load]);

  // Retour sur l'écran (après une modification) : liste remise à jour
  useFocusEffect(useCallback(() => { if (loadedOnce.current) load(1, "refresh"); }, [load]));

  return {
    items, setItems, loading, refreshing, error,
    reload: () => load(1, "refresh"),
    loadMore: () => next && !loading && load(page + 1, "more"),
    hasMore: !!next,
  };
}

export function PagedList({ paged, renderItem, header, emptyText = "Rien pour le moment.", keyExtractor = (i) => String(i.id) }) {
  return (
    <FlatList
      data={paged.items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={header}
      ListEmptyComponent={paged.loading ? <ActivityIndicator color={colors.caramel} style={{ marginTop: 40 }} /> : <Empty text={paged.error || emptyText} />}
      ListFooterComponent={paged.hasMore ? <ActivityIndicator color={colors.caramel} style={{ margin: 16 }} /> : <View style={{ height: 40 }} />}
      onEndReached={paged.loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={paged.refreshing} onRefresh={paged.reload} tintColor={colors.caramel} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

export function dateFr(value, withTime = true) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return withTime ? `${day} à ${pad(d.getHours())}h${pad(d.getMinutes())}` : day;
}

export async function run(action, { success, onDone } = {}) {
  try {
    const res = await action();
    if (success || res?.message) notify(success || res.message);
    onDone?.(res);
    return res === undefined || res === "" ? true : res; // suppression : réponse vide = réussite
  } catch (e) {
    notify("Oups", errorMessage(e));
    return null;
  }
}

export const styles = StyleSheet.create({
  listContent: { padding: 16, maxWidth: 1000, width: "100%", alignSelf: "center" },
  page: { padding: 16, maxWidth: 1000, width: "100%", alignSelf: "center", paddingBottom: 60 },
  form: { padding: 16, maxWidth: 720, width: "100%", alignSelf: "center", paddingBottom: 60 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 8, gap: 8 },
  title: { fontFamily: fonts.serifBold, fontSize: 17, color: colors.brown, flexShrink: 1 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
  pillText: { fontFamily: fonts.sansSemiBold, fontSize: 10.5 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  lineLabel: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary },
  lineValue: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: "right" },
  small: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.pill, paddingHorizontal: 14, minHeight: 38 },
  smallText: { fontFamily: fonts.sansSemiBold, fontSize: 12.5 },
  chip: { borderWidth: 1, borderColor: colors.caramelLight, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.brown, borderColor: colors.brown },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.brown },
  selectWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, height: 44, fontFamily: fonts.sans, fontSize: 14, color: colors.text, outlineStyle: "none" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleLabel: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fieldLabel: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text, marginBottom: 8 },
  stat: { padding: 12, marginBottom: 0 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.brown },
  statLabel: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.textSecondary, marginTop: 2 },
  empty: { textAlign: "center", fontFamily: fonts.sans, color: colors.textSecondary, marginTop: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.text },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  amount: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.caramel },
  thumb: { width: 54, height: 64, borderRadius: 8, backgroundColor: colors.cream },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
});
