import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import * as G from "../../api/gestion";
import { errorMessage } from "../../api/client";
import { Card, Pill, Stat, Title, dateFr, styles as ui } from "../../components/admin/ui";
import { useAuth } from "../../context/AuthContext";
import { colors, fonts, money, radius } from "../../theme";

const SECTIONS = [
  { icon: "receipt-outline", label: "Commandes", screen: "AdminOrders" },
  { icon: "shirt-outline", label: "Articles", screen: "AdminProducts" },
  { icon: "albums-outline", label: "Catégories", screen: "AdminCategories" },
  { icon: "pricetags-outline", label: "Promotions", screen: "AdminPromotions" },
  { icon: "people-outline", label: "Clientes", screen: "AdminClients" },
  { icon: "bicycle-outline", label: "Livreurs", screen: "AdminCouriers" },
  { icon: "map-outline", label: "Zones de livraison", screen: "AdminZones" },
  { icon: "card-outline", label: "Paiements", screen: "AdminPayments" },
  { icon: "star-outline", label: "Avis", screen: "AdminReviews" },
  { icon: "settings-outline", label: "Réglages boutique", screen: "AdminSettings" },
];

/** Accueil de l'espace de gestion : chiffres clés, ventes de la semaine, raccourcis. */
export default function GestionHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const cols = width >= 900 ? 4 : 2;
  const statW = `${100 / cols - 2}%`;

  const load = useCallback(async () => {
    try {
      setData(await G.dashboard());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const go = (screen, params) => navigation.navigate(screen, params);
  const max = Math.max(1, ...(data?.week || []).map((d) => d.amount));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={ui.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.caramel} />}
    >
      <Text style={s.hello}>Bonjour {user?.first_name || ""}</Text>
      <Text style={s.helloSub}>Voici votre boutique aujourd'hui.</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.grid}>
        <Stat style={{ width: statW }} icon="cash-outline" label="Encaissé aujourd'hui" value={money(data?.revenue_today)} />
        <Stat style={{ width: statW }} icon="trending-up-outline" label="Encaissé ce mois" value={money(data?.revenue_month)} />
        <Stat style={{ width: statW }} icon="cube-outline" label="À préparer" value={data?.to_prepare ?? "-"} onPress={() => go("AdminOrders", { status: "a_traiter" })} />
        <Stat style={{ width: statW }} icon="time-outline" label="En attente de paiement" value={data?.awaiting_payment ?? "-"} onPress={() => go("AdminOrders", { status: "pending" })} />
        <Stat style={{ width: statW }} icon="bicycle-outline" label="Sans livreur" value={data?.awaiting_courier ?? "-"} tone={data?.awaiting_courier ? colors.danger : colors.caramel} onPress={() => go("AdminOrders", { status: "en_livraison" })} />
        <Stat style={{ width: statW }} icon="navigate-outline" label="En livraison" value={data?.in_delivery ?? "-"} onPress={() => go("AdminOrders", { status: "en_livraison" })} />
        <Stat style={{ width: statW }} icon="person-add-outline" label="Candidatures livreur" value={data?.courier_applications ?? "-"} onPress={() => go("AdminCouriers", { status: "pending" })} />
        <Stat style={{ width: statW }} icon="people-outline" label="Clientes inscrites" value={data?.clients ?? "-"} onPress={() => go("AdminClients")} />
      </View>

      <Title>Encaissements des 7 derniers jours</Title>
      <Card>
        <View style={s.chart}>
          {(data?.week || []).map((d) => (
            <View key={d.date} style={s.barCol}>
              <Text style={s.barValue} numberOfLines={1}>{d.amount ? `${Math.round(d.amount / 1000)}k` : ""}</Text>
              <View style={[s.bar, { height: Math.max(4, (d.amount / max) * 110) }]} />
              <Text style={s.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Title>Gérer</Title>
      <View style={s.grid}>
        {SECTIONS.map((x) => (
          <Pressable key={x.screen} onPress={() => go(x.screen)} style={({ pressed }) => [s.tile, { width: width >= 900 ? "18.6%" : width >= 600 ? "31.5%" : "48%" }, pressed && { opacity: 0.85 }]}>
            <Ionicons name={x.icon} size={22} color={colors.caramel} />
            <Text style={s.tileText}>{x.label}</Text>
          </Pressable>
        ))}
      </View>

      <Title right={<Text style={s.link} onPress={() => go("AdminOrders")}>Tout voir</Text>}>Dernières commandes</Title>
      {(data?.recent_orders || []).map((o) => (
        <Card key={o.id} onPress={() => go("AdminOrder", { id: o.id })}>
          <View style={ui.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.name}>{o.order_number} · {o.client}</Text>
              <Text style={ui.sub}>{dateFr(o.created_at)} · {o.items_count} article(s)</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={ui.amount}>{money(o.total)}</Text>
              <Pill status={o.status} label={o.status_label} />
            </View>
          </View>
        </Card>
      ))}

      {data?.low_stock?.length ? (
        <>
          <Title>Stock bas</Title>
          <Card>
            {data.low_stock.map((p) => (
              <Pressable key={p.id} onPress={() => go("AdminProductForm", { id: p.id })} style={s.lowRow}>
                <Text style={ui.name} numberOfLines={1}>{p.name}</Text>
                <Text style={[ui.amount, { color: p.stock === 0 ? colors.danger : colors.caramel }]}>{p.stock === 0 ? "Épuisé" : `${p.stock} restant(s)`}</Text>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hello: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.brown, marginTop: 4 },
  helloSub: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  error: { fontFamily: fonts.sans, color: colors.danger, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 150, paddingTop: 10 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "55%", maxWidth: 34, backgroundColor: colors.caramel, borderRadius: 6 },
  barValue: { fontFamily: fonts.sansMedium, fontSize: 9.5, color: colors.textSecondary, marginBottom: 4 },
  barLabel: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.brown, marginTop: 6 },
  tile: { backgroundColor: colors.cream, borderRadius: radius.md, padding: 14, gap: 8, minHeight: 84, justifyContent: "center" },
  tileText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.brown },
  link: { fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: colors.caramel },
  lowRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, gap: 10 },
});
