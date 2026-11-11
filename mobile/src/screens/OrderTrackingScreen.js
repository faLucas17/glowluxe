import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { fetchTracking } from "../api";
import Button from "../components/Button";
import Screen from "../components/Screen";
import WebMap from "../components/WebMap";
import { colors, fonts, money, radius } from "../theme";

export default function OrderTrackingScreen({ route }) {
  const { id } = route.params;
  const [data, setData] = useState(null);
  const [active, setActive] = useState(true);

  const load = useCallback(() => fetchTracking(id).then(setData).catch(() => {}), [id]);
  useFocusEffect(useCallback(() => { setActive(true); return () => setActive(false); }, []));
  useEffect(() => {
    if (!active) return undefined;
    load();
    const t = setInterval(load, 8000); // mise à jour automatique
    return () => clearInterval(t);
  }, [active, load]);

  if (!data) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={colors.caramel} /></View>;
  const c = data.courier;
  return (
    <Screen contentStyle={{ padding: 16 }}>
      <View style={{ maxWidth: 900, width: "100%", alignSelf: "center" }}>
        <Text style={styles.status}>{data.status_display}</Text>
        {c?.eta_min ? <Text style={styles.eta}>Arrivée estimée dans ~{c.eta_min} min ({c.distance_km} km)</Text> : null}
        {!data.status ? <Text style={styles.small}>Votre commande est en préparation. Un livreur vous sera attribué dès qu'elle sera prête.</Text> : null}
        <View style={{ marginTop: 14 }}><WebMap url={data.map_url} height={340} /></View>
        {c ? (
          <View style={styles.card}>
            <View style={styles.avatar}><Text style={{ fontSize: 24 }}>🛵</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.small}>{c.vehicle}{c.lat != null ? "  ·  position en direct" : ""}</Text>
            </View>
            <Button small title="Appeler" onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} />
          </View>
        ) : null}
        {Number(data.amount_due) > 0 ? <Text style={[styles.small, { marginTop: 12 }]}>À remettre au livreur : <Text style={{ fontFamily: fonts.sansBold, color: colors.brown }}>{money(data.amount_due, true)}</Text></Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { fontFamily: fonts.serifBold, fontSize: 19, color: colors.brown },
  eta: { fontFamily: fonts.sansSemiBold, color: colors.caramel, marginTop: 4 },
  small: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginTop: 6 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.cream, borderRadius: radius.md, padding: 14, marginTop: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.sansBold, color: colors.text },
});
