import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Image } from "expo-image";

import * as G from "../../api/gestion";
import Button from "../../components/Button";
import Field from "../../components/Field";
import { Card, Select, SmallButton, Title, Toggle, dateFr, pickImages, run, styles as ui } from "../../components/admin/ui";
import { colors } from "../../theme";
import { confirm, notify } from "../../utils/notify";

/** "25/12/2026" -> ISO ; vide -> null ; invalide -> undefined */
function parseDate(text, endOfDay = false) {
  if (!text.trim()) return null;
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), endOfDay ? 23 : 0, endOfDay ? 59 : 0);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function AdminPromotionFormScreen({ route, navigation }) {
  const initial = route.params?.promo;
  const [p, setP] = useState(initial || { title: "", message: "", code: "", category: null, active: true });
  const [start, setStart] = useState(initial ? dateFr(initial.starts_at, false) : dateFr(new Date(), false));
  const [end, setEnd] = useState(initial?.ends_at ? dateFr(initial.ends_at, false) : "");
  const [cats, setCats] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    navigation.setOptions({ title: p.id ? "Modifier la promotion" : "Nouvelle promotion" });
    G.categories().then((all) => setCats(all.filter((c) => !c.parent))).catch(() => {});
  }, []); // eslint-disable-line

  const save = async () => {
    const starts_at = parseDate(start), ends_at = parseDate(end, true);
    if (starts_at === undefined || ends_at === undefined) return notify("Dates", "Écrivez les dates sous la forme JJ/MM/AAAA, par exemple 25/12/2026.");
    setSaving(true);
    const r = await run(() => G.savePromotion(p.id, {
      title: p.title.trim(), message: p.message.trim(), code: p.code.trim().toUpperCase(), category: p.category || null,
      active: p.active, starts_at: starts_at || new Date().toISOString(), ends_at,
    }), { success: "Promotion enregistrée." });
    setSaving(false);
    if (r) setP(r);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.form} keyboardShouldPersistTaps="handled">
      <Card>
        <Field label="Titre *" value={p.title} onChangeText={set("title")} placeholder="Ex : Spécial Tabaski -20 %" />
        <Field label="Message *" value={p.message} onChangeText={set("message")} multiline placeholder="Ce que verront les clientes dans l'appli et dans l'email" />
        <Field label="Code promo" value={p.code} onChangeText={set("code")} autoCapitalize="characters" placeholder="Facultatif" />
        <Select label="Catégorie mise en avant" options={cats.map((c) => ({ value: c.id, label: c.name }))} value={p.category} onChange={set("category")} allowEmpty emptyLabel="Toute la boutique" />
        <Field label="Début (JJ/MM/AAAA)" value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" />
        <Field label="Fin (JJ/MM/AAAA)" value={end} onChangeText={setEnd} keyboardType="numbers-and-punctuation" hint="Laisser vide : sans date de fin." />
        <Toggle label="Promotion active" value={p.active} onChange={set("active")} />
      </Card>

      {p.id ? (
        <>
          <Title>Image</Title>
          <Card>
            {p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: "100%", height: 160, borderRadius: 10, marginBottom: 10 }} contentFit="cover" /> : <Text style={[ui.sub, { marginBottom: 10 }]}>Pas d'image.</Text>}
            <SmallButton title={p.image_url ? "Changer l'image" : "Ajouter une image"} icon="image-outline" tone="light" style={{ alignSelf: "flex-start" }}
              onPress={async () => { const [a] = await pickImages(false); if (a) await run(() => G.uploadImageField(`/promotions/${p.id}/`, a), { success: "Image enregistrée.", onDone: setP }); }} />
          </Card>
          <Title>Envoyer aux clientes</Title>
          <Card>
            <Text style={[ui.sub, { marginBottom: 10 }]}>
              Email envoyé aux clientes inscrites qui acceptent les promotions et ont vérifié leur email.
              {p.emailed_at ? ` Dernier envoi le ${dateFr(p.emailed_at)} à ${p.emailed_count} cliente(s).` : ""}
            </Text>
            <SmallButton title="Envoyer par email" icon="mail-outline" tone="dark" style={{ alignSelf: "flex-start" }}
              onPress={() => confirm("Envoyer la promotion ?", "Toutes les clientes inscrites la recevront par email.", () => run(() => G.sendPromotion(p.id), { onDone: (r) => r?.promotion && setP(r.promotion) }), "Envoyer")} />
          </Card>
        </>
      ) : null}

      <Button title={p.id ? "Enregistrer" : "Créer la promotion"} onPress={save} loading={saving} disabled={!p.title.trim() || !p.message.trim()} style={{ marginTop: 20 }} />
      {p.id ? (
        <SmallButton title="Supprimer" icon="trash-outline" tone="danger" style={{ marginTop: 14, alignSelf: "center" }}
          onPress={() => confirm("Supprimer cette promotion ?", "", async () => { if (await run(() => G.deletePromotion(p.id), { success: "Promotion supprimée." })) navigation.goBack(); }, "Supprimer")} />
      ) : null}
    </ScrollView>
  );
}
