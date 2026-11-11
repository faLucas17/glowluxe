import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { deleteAddress, fetchAddresses } from "../api";
import Button from "../components/Button";
import Empty from "../components/Empty";
import Screen from "../components/Screen";
import { colors, fonts, radius } from "../theme";
import { confirm, notify } from "../utils/notify";

export default function AddressesScreen({ navigation }) {
  const [list, setList] = useState(null);
  const load = useCallback(() => { fetchAddresses().then(setList).catch(() => setList([])); }, []);
  useFocusEffect(load);
  return (
    <Screen contentStyle={{ padding: 16 }}>
      {list && !list.length ? <Empty icon="location-outline" title="Aucune adresse" text="Ajoutez votre adresse de livraison." /> : null}
      {(list || []).map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={styles.name}>{a.full_name}{a.is_default ? "  ·  par défaut" : ""}</Text>
          <Text style={styles.line}>{a.one_line}</Text>
          <Text style={styles.line}>{a.phone_number}</Text>
          <Pressable onPress={() => confirm("Supprimer", "Supprimer cette adresse ?", async () => {
            try { await deleteAddress(a.id); load(); } catch { notify("Impossible", "Cette adresse est liée à une commande."); }
          }, "Supprimer")}>
            <Text style={styles.del}>Supprimer</Text>
          </Pressable>
        </View>
      ))}
      <Button title="+ Ajouter une adresse" variant="outline" onPress={() => navigation.navigate("AddressForm")} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  name: { fontFamily: fonts.sansSemiBold, color: colors.text },
  line: { fontFamily: fonts.sans, color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  del: { fontFamily: fonts.sansMedium, color: colors.danger, fontSize: 12, marginTop: 8 },
});
