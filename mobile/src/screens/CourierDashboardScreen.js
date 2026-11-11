import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";

import { courierAct, courierDashboard, sendLocation, setAvailability } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { colors, fonts, money, radius } from "../theme";
import { confirm, notify } from "../utils/notify";

export default function CourierDashboardScreen() {
  const [data, setData] = useState(null);
  const [gps, setGps] = useState("");
  const [cash, setCash] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const last = useRef(null);
  const watcher = useRef(null);

  const load = useCallback(async () => {
    try {
      setData(await courierDashboard());
    } catch (e) {
      notify("Espace livreur", errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Partage de la position tant que l'écran est ouvert et que le livreur est disponible
  useFocusEffect(useCallback(() => {
    let interval;
    let alive = true;
    (async () => {
      await load();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGps("⚠️ Localisation refusée : autorisez-la pour recevoir les courses proches.");
      } else {
        watcher.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 15 },
          (pos) => { last.current = pos.coords; setGps(`📍 Position partagée (±${Math.round(pos.coords.accuracy || 0)} m)`); }
        );
      }
      const tick = async () => {
        if (!alive) return;
        try {
          const r = await sendLocation(last.current?.latitude?.toFixed(6), last.current?.longitude?.toFixed(6));
          if (r.offers) load();
        } catch {}
      };
      tick();
      interval = setInterval(tick, 15000);
    })();
    return () => {
      alive = false;
      clearInterval(interval);
      watcher.current?.remove?.();
    };
  }, [load]));

  const toggle = async (v) => {
    try {
      await setAvailability(v);
      load();
    } catch (e) {
      notify("Disponibilité", errorMessage(e));
    }
  };

  const act = async (d, action, payload) => {
    try {
      await courierAct(d.id, action, payload);
      load();
    } catch (e) {
      notify("Action impossible", errorMessage(e));
      load();
    }
  };

  if (!data) return <Screen><Text style={{ padding: 20, fontFamily: fonts.sans }}>Chargement…</Text></Screen>;

  return (
    <Screen contentStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.caramel} />}>
      <View style={{ maxWidth: 760, width: "100%", alignSelf: "center" }}>
        <View style={[styles.card, { flexDirection: "row", alignItems: "center", backgroundColor: data.is_available ? colors.successBg : colors.cream }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.is_available ? "🟢 Disponible" : "⚫ Hors ligne"}</Text>
            <Text style={styles.small}>{gps || "Activez pour recevoir des courses."}</Text>
          </View>
          <Switch value={data.is_available} onValueChange={toggle} trackColor={{ true: colors.success }} thumbColor={colors.white} />
        </View>
        <Text style={styles.small}>Gardez l'appli ouverte pendant vos courses : le client suit votre position.</Text>

        {data.offers.map((d) => (
          <View key={d.id} style={[styles.card, { borderColor: colors.caramel, borderWidth: 2 }]}>
            <Text style={styles.title}>🔔 Nouvelle course · {d.order_number}</Text>
            <Text style={styles.small}>Zone : {d.zone || "-"} · {d.items_count} article(s)</Text>
            <Text style={styles.small}>{Number(d.cash_to_collect) > 0 ? `À encaisser : ${money(d.cash_to_collect, true)}` : "Rien à encaisser (déjà payé)"}</Text>
            <Text style={styles.small}>Vous avez {data.offer_minutes} min pour répondre.</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Button small title="✅ Accepter" onPress={() => act(d, "accept")} style={{ flex: 1 }} />
              <Button small title="Refuser" variant="outline" onPress={() => act(d, "decline")} style={{ flex: 1 }} />
            </View>
          </View>
        ))}

        {data.active.map((d) => {
          const c = d.customer || {};
          const nav = c.lat ? (Platform.OS === "ios" ? `http://maps.apple.com/?daddr=${c.lat},${c.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`) : null;
          return (
            <View key={d.id} style={styles.card}>
              <Text style={styles.title}>📦 {d.order_number} · {d.status_display}</Text>
              <Text style={styles.small}>Retrait : {data.shop.address}</Text>
              <Text style={styles.small}>Client : {c.name} · {c.phone}</Text>
              <Text style={styles.small}>Adresse : {c.address}</Text>
              {c.notes ? <Text style={styles.small}>Note : {c.notes}</Text> : null}
              {Number(d.cash_to_collect) > 0 ? <Text style={[styles.small, { color: colors.danger, fontFamily: fonts.sansBold }]}>À encaisser : {money(d.cash_to_collect, true)}</Text> : null}
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {c.phone ? <Button small variant="outline" title="📞 Appeler" onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, "")}`)} /> : null}
                {nav ? <Button small variant="outline" title="🧭 Itinéraire" onPress={() => Linking.openURL(nav)} /> : null}
                {d.status === "accepted" ? <Button small title="Colis récupéré" onPress={() => act(d, "picked_up")} /> : null}
                {d.status === "picked_up" ? <Button small title="En route" onPress={() => act(d, "on_the_way")} /> : null}
              </View>
              {d.status !== "accepted" ? (
                <View style={{ marginTop: 10 }}>
                  {Number(d.cash_to_collect) > 0 ? (
                    <Field label="Montant encaissé" keyboardType="number-pad" value={cash[d.id] ?? String(Math.round(d.cash_to_collect))} onChangeText={(v) => setCash({ ...cash, [d.id]: v })} />
                  ) : null}
                  <Button title="✅ Livrée" onPress={() => act(d, "delivered", { cash_collected: cash[d.id] ?? d.cash_to_collect })} style={{ backgroundColor: colors.success }} />
                </View>
              ) : null}
              <Button small variant="danger" title="Signaler un échec" style={{ marginTop: 8 }}
                onPress={() => confirm("Échec de livraison", "Client injoignable ou absent ?", () => act(d, "failed", { note: "Client injoignable" }), "Signaler")} />
            </View>
          );
        })}

        {!data.offers.length && !data.active.length ? <Text style={[styles.small, { textAlign: "center", marginVertical: 30 }]}>Aucune course pour le moment.</Text> : null}

        {data.history.length ? (
          <>
            <Text style={[styles.title, { marginTop: 10 }]}>Historique</Text>
            {data.history.map((d) => (
              <View key={d.id} style={styles.histRow}>
                <Text style={styles.small}>{d.order_number} · {d.status_display}</Text>
                {d.cash_collected ? <Text style={styles.small}>{money(d.cash_collected)} encaissés</Text> : null}
              </View>
            ))}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginVertical: 8, backgroundColor: colors.white },
  title: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },
  small: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  histRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
