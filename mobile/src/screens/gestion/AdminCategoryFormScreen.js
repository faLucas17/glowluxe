import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Image } from "expo-image";

import * as G from "../../api/gestion";
import Button from "../../components/Button";
import Field from "../../components/Field";
import { Card, Select, SmallButton, Title, Toggle, pickImages, run, styles as ui } from "../../components/admin/ui";
import { colors } from "../../theme";
import { confirm } from "../../utils/notify";

const GENDERS = [
  { value: "women", label: "Femme" },
  { value: "men", label: "Homme" },
  { value: "kids", label: "Enfant" },
  { value: "unisex", label: "Unisexe" },
];

export default function AdminCategoryFormScreen({ route, navigation }) {
  const initial = route.params?.category;
  const [c, setC] = useState(initial || { name: "", parent: null, gender: "unisex", position: 0, is_active: true });
  const [parents, setParents] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setC((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    navigation.setOptions({ title: c.id ? c.name : "Nouvelle catégorie" });
    G.categories().then((all) => setParents(all.filter((x) => !x.parent && x.id !== c.id))).catch(() => {});
  }, []); // eslint-disable-line

  const save = async () => {
    setSaving(true);
    const r = await run(() => G.saveCategory(c.id, { name: c.name.trim(), parent: c.parent || null, gender: c.gender, position: Number(c.position) || 0, is_active: c.is_active }), { success: "Catégorie enregistrée." });
    setSaving(false);
    if (r) setC(r);
  };

  const photo = async () => {
    const [asset] = await pickImages(false);
    if (asset) await run(() => G.uploadImageField(`/categories/${c.id}/`, asset), { success: "Image enregistrée.", onDone: setC });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.form} keyboardShouldPersistTaps="handled">
      <Card>
        <Field label="Nom *" value={c.name} onChangeText={set("name")} />
        <Select label="Ranger dans" options={parents.map((p) => ({ value: p.id, label: p.name }))} value={c.parent} onChange={set("parent")} allowEmpty emptyLabel="Catégorie principale" />
        <Select label="Pour" options={GENDERS} value={c.gender} onChange={set("gender")} />
        <Field label="Ordre d'affichage" value={String(c.position ?? 0)} onChangeText={(t) => set("position")(t.replace(/\D/g, ""))} keyboardType="number-pad" hint="Les plus petits numéros s'affichent en premier." />
        <Toggle label="Visible dans la boutique" value={c.is_active} onChange={set("is_active")} />
      </Card>
      {c.id ? (
        <>
          <Title>Image</Title>
          <Card>
            {c.image_url ? <Image source={{ uri: c.image_url }} style={{ width: 120, height: 120, borderRadius: 10, marginBottom: 10 }} contentFit="cover" /> : <Text style={[ui.sub, { marginBottom: 10 }]}>Pas d'image.</Text>}
            <SmallButton title={c.image_url ? "Changer l'image" : "Ajouter une image"} icon="image-outline" tone="light" onPress={photo} style={{ alignSelf: "flex-start" }} />
          </Card>
        </>
      ) : null}
      <Button title={c.id ? "Enregistrer" : "Créer la catégorie"} onPress={save} loading={saving} disabled={!c.name.trim()} style={{ marginTop: 20 }} />
      {c.id ? (
        <SmallButton title="Supprimer" icon="trash-outline" tone="danger" style={{ marginTop: 14, alignSelf: "center" }}
          onPress={() => confirm("Supprimer cette catégorie ?", "Possible seulement si elle ne contient aucun article.", async () => { if (await run(() => G.deleteCategory(c.id))) navigation.goBack(); }, "Supprimer")} />
      ) : null}
    </ScrollView>
  );
}
