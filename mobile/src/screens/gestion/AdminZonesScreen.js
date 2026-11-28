import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import * as G from "../../api/gestion";
import Field from "../../components/Field";
import { Card, Pill, SmallButton, Toggle, run, styles as ui } from "../../components/admin/ui";
import { colors, money } from "../../theme";
import { confirm } from "../../utils/notify";

const NEW = { name: "", fee: "", estimated_time: "24 à 48 h", position: "0", is_active: true };

/** Zones et prix de livraison : modification directe dans la liste. */
export default function AdminZonesScreen() {
  const [zones, setZones] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => G.zones().then(setZones).catch(() => {}), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    const z = editing;
    const r = await run(() => G.saveZone(z.id, { name: z.name.trim(), fee: Number(z.fee) || 0, estimated_time: z.estimated_time, position: Number(z.position) || 0, is_active: z.is_active }), { success: "Zone enregistrée." });
    if (r) { setEditing(null); load(); }
  };

  const form = editing && (
    <Card style={{ borderColor: colors.caramel }}>
      <Field label="Nom de la zone" value={editing.name} onChangeText={(t) => setEditing({ ...editing, name: t })} placeholder="Ex : Thiès" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Field style={{ flex: 1 }} label="Prix (F)" value={String(editing.fee)} onChangeText={(t) => setEditing({ ...editing, fee: t.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Ordre" value={String(editing.position)} onChangeText={(t) => setEditing({ ...editing, position: t.replace(/\D/g, "") })} keyboardType="number-pad" />
      </View>
      <Field label="Délai indicatif" value={editing.estimated_time} onChangeText={(t) => setEditing({ ...editing, estimated_time: t })} />
      <Toggle label="Proposée aux clientes" value={editing.is_active} onChange={(v) => setEditing({ ...editing, is_active: v })} />
      <View style={ui.actions}>
        <SmallButton title="Enregistrer" icon="checkmark" tone="caramel" onPress={save} disabled={!editing.name.trim()} />
        <SmallButton title="Annuler" tone="light" onPress={() => setEditing(null)} />
        {editing.id ? <SmallButton title="Supprimer" icon="trash-outline" tone="danger" onPress={() => confirm("Supprimer cette zone ?", "Si des commandes l'utilisent, elle sera seulement désactivée.", async () => { if (await run(() => G.deleteZone(editing.id))) { setEditing(null); load(); } }, "Supprimer")} /> : null}
      </View>
    </Card>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.form} keyboardShouldPersistTaps="handled">
      {!editing ? <SmallButton title="Ajouter une zone" icon="add" tone="caramel" onPress={() => setEditing(NEW)} style={{ alignSelf: "flex-start", marginBottom: 12 }} /> : null}
      {editing && !editing.id ? form : null}
      {zones.map((z) => (editing?.id === z.id ? <View key={z.id}>{form}</View> : (
        <Card key={z.id} onPress={() => setEditing({ ...z, fee: String(z.fee), position: String(z.position) })}>
          <View style={ui.row}>
            <View style={{ flex: 1 }}>
              <Text style={ui.name}>{z.name}</Text>
              <Text style={ui.sub}>{z.estimated_time}</Text>
            </View>
            <Text style={ui.amount}>{money(z.fee)}</Text>
            <Pill status={z.is_active ? "on" : "off"} label={z.is_active ? "Active" : "Inactive"} />
          </View>
        </Card>
      )))}
    </ScrollView>
  );
}
