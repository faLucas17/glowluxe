import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import * as G from "../../api/gestion";
import { errorMessage } from "../../api/client";
import Button from "../../components/Button";
import Field from "../../components/Field";
import { Card, Select, SmallButton, Title, Toggle, pickImages, run, styles as ui } from "../../components/admin/ui";
import { colors, fonts, radius } from "../../theme";
import { confirm, notify } from "../../utils/notify";

const GENDERS = [
  { value: "women", label: "Femme" },
  { value: "men", label: "Homme" },
  { value: "kids", label: "Enfant" },
  { value: "unisex", label: "Unisexe" },
];
const EMPTY = {
  name: "", category: null, description: "", gender: "women", price: "", compare_at_price: "", sku: "",
  stock_quantity: "0", material: "", is_handmade: false, made_to_order: false, production_days: "0",
  is_featured: false, is_active: true, variants: [], images: [],
};
const num = (v) => String(v ?? "").replace(/[^\d]/g, "");

export default function AdminProductFormScreen({ route, navigation }) {
  const [id, setId] = useState(route.params?.id || null);
  const [f, setF] = useState(EMPTY);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const fromApi = (p) => ({
    ...p,
    price: num(Math.round(p.price)), compare_at_price: p.compare_at_price ? num(Math.round(p.compare_at_price)) : "",
    stock_quantity: String(p.stock_quantity), production_days: String(p.production_days),
    variants: p.variants.map((v) => ({ ...v, stock_quantity: String(v.stock_quantity), extra_price: num(Math.round(v.extra_price)) })),
  });

  useEffect(() => {
    navigation.setOptions({ title: id ? "Modifier l'article" : "Nouvel article" });
    G.categories().then(setCats).catch(() => {});
    if (id) G.product(id).then((p) => setF(fromApi(p))).catch((e) => notify("Oups", errorMessage(e))).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const save = async () => {
    const e = {};
    if (!f.name.trim()) e.name = "Nom obligatoire";
    if (!f.category) e.category = "Choisissez une catégorie";
    if (!Number(f.price)) e.price = "Prix obligatoire";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const body = {
        name: f.name.trim(), category: f.category, description: f.description, gender: f.gender,
        price: Number(f.price), compare_at_price: Number(f.compare_at_price) || null, sku: f.sku,
        stock_quantity: Number(f.stock_quantity) || 0, material: f.material, is_handmade: f.is_handmade,
        made_to_order: f.made_to_order, production_days: Number(f.production_days) || 0,
        is_featured: f.is_featured, is_active: f.is_active,
        variants: f.variants.filter((v) => v.size || v.color).map((v) => ({
          ...(v.id ? { id: v.id } : {}), size: v.size || "", color: v.color || "", color_hex: v.color_hex || "",
          stock_quantity: Number(v.stock_quantity) || 0, extra_price: Number(v.extra_price) || 0,
        })),
      };
      const p = await G.saveProduct(id, body);
      setF(fromApi(p));
      if (!id) {
        setId(p.id);
        notify("Article créé", "Ajoutez maintenant ses photos.");
      } else notify("Article enregistré");
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === "object") setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)])));
      notify("Oups", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addPhotos = async () => {
    const assets = await pickImages(true);
    if (!assets.length) return;
    setUploading(true);
    await run(() => G.uploadProductImages(id, assets), { success: "Photo(s) ajoutée(s).", onDone: (p) => setF(fromApi(p)) });
    setUploading(false);
  };

  const remove = () =>
    confirm("Supprimer cet article ?", "S'il a déjà été commandé, il sera seulement masqué de la boutique.", async () => {
      const r = await run(() => G.deleteProduct(id));
      if (r) navigation.goBack();
    }, "Supprimer");

  if (loading) return <ActivityIndicator color={colors.caramel} style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={ui.form} keyboardShouldPersistTaps="handled">
      <Title>Photos</Title>
      {id ? (
        <Card>
          <View style={s.photos}>
            {f.images.map((img) => (
              <View key={img.id} style={s.photo}>
                <Image source={{ uri: img.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                {img.is_primary ? <View style={s.primary}><Text style={s.primaryText}>Principale</Text></View> : null}
                <View style={s.photoActions}>
                  {!img.is_primary ? (
                    <Pressable hitSlop={6} onPress={() => run(() => G.setPrimaryImage(id, img.id), { onDone: (p) => setF(fromApi(p)) })} style={s.photoBtn} accessibilityLabel="Photo principale">
                      <Ionicons name="star-outline" size={15} color={colors.brown} />
                    </Pressable>
                  ) : null}
                  <Pressable hitSlop={6} onPress={() => confirm("Supprimer cette photo ?", "", () => run(() => G.deleteImage(id, img.id), { onDone: (p) => setF(fromApi(p)) }), "Supprimer")} style={s.photoBtn} accessibilityLabel="Supprimer la photo">
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable onPress={addPhotos} style={[s.photo, s.addPhoto]} disabled={uploading}>
              {uploading ? <ActivityIndicator color={colors.caramel} /> : <><Ionicons name="camera-outline" size={24} color={colors.caramel} /><Text style={s.addText}>Ajouter</Text></>}
            </Pressable>
          </View>
          <Text style={ui.hint}>L'étoile choisit la photo principale. Les photos sont compressées automatiquement.</Text>
        </Card>
      ) : (
        <Card><Text style={ui.sub}>Enregistrez d'abord l'article, puis ajoutez ses photos.</Text></Card>
      )}

      <Title>Informations</Title>
      <Card>
        <Field label="Nom de l'article *" value={f.name} onChangeText={set("name")} error={errors.name} />
        <Select label="Catégorie *" options={cats.map((c) => ({ value: c.id, label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name }))} value={f.category} onChange={set("category")} />
        {errors.category ? <Text style={s.err}>{errors.category}</Text> : null}
        <Select label="Pour" options={GENDERS} value={f.gender} onChange={set("gender")} />
        <Field label="Description" value={f.description} onChangeText={set("description")} multiline style={{ minHeight: 60 }} />
        <Field label="Matière" value={f.material} onChangeText={set("material")} placeholder="Ex : coton, laine, soie, wax" />
      </Card>

      <Title>Prix et stock</Title>
      <Card>
        <View style={s.two}>
          <Field style={{ flex: 1 }} label="Prix (F) *" value={f.price} onChangeText={(t) => set("price")(num(t))} keyboardType="number-pad" error={errors.price} />
          <Field style={{ flex: 1 }} label="Ancien prix (promo)" value={f.compare_at_price} onChangeText={(t) => set("compare_at_price")(num(t))} keyboardType="number-pad" error={errors.compare_at_price} hint="Laisser vide sans promo" />
        </View>
        <View style={s.two}>
          <Field style={{ flex: 1 }} label="Stock" value={f.stock_quantity} onChangeText={(t) => set("stock_quantity")(num(t))} keyboardType="number-pad" />
          <Field style={{ flex: 1 }} label="Référence" value={f.sku} onChangeText={set("sku")} placeholder="Automatique" autoCapitalize="characters" />
        </View>
        <Toggle label="Fait main" value={f.is_handmade} onChange={set("is_handmade")} />
        <Toggle label="Fabriqué sur commande" hint="Crochet, sur-mesure : commandable sans stock, avec acompte." value={f.made_to_order} onChange={set("made_to_order")} />
        {f.made_to_order ? <Field label="Délai de fabrication (jours)" value={f.production_days} onChangeText={(t) => set("production_days")(num(t))} keyboardType="number-pad" style={{ marginTop: 12 }} /> : null}
        <Toggle label="Visible dans la boutique" value={f.is_active} onChange={set("is_active")} />
        <Toggle label="Mis en avant" value={f.is_featured} onChange={set("is_featured")} />
      </Card>

      <Title right={<SmallButton title="Ajouter" icon="add" tone="light" onPress={() => set("variants")([...f.variants, { size: "", color: "", stock_quantity: "0", extra_price: "0" }])} />}>Tailles et couleurs</Title>
      <Card>
        {f.variants.length ? f.variants.map((v, i) => {
          const upd = (k) => (val) => set("variants")(f.variants.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
          return (
            <View key={v.id || `n${i}`} style={s.variant}>
              <View style={s.two}>
                <Field style={{ flex: 1 }} label="Taille" value={v.size} onChangeText={upd("size")} placeholder="S, M, 38..." />
                <Field style={{ flex: 1 }} label="Couleur" value={v.color} onChangeText={upd("color")} placeholder="Rouge..." />
              </View>
              <View style={s.two}>
                <Field style={{ flex: 1 }} label="Stock" value={v.stock_quantity} onChangeText={(t) => upd("stock_quantity")(num(t))} keyboardType="number-pad" />
                <Field style={{ flex: 1 }} label="Supplément (F)" value={v.extra_price} onChangeText={(t) => upd("extra_price")(num(t))} keyboardType="number-pad" />
              </View>
              <SmallButton title="Retirer cette variante" icon="trash-outline" tone="danger" onPress={() => set("variants")(f.variants.filter((_, j) => j !== i))} style={{ alignSelf: "flex-start" }} />
            </View>
          );
        }) : <Text style={ui.sub}>Aucune variante : l'article se vend tel quel avec le stock ci-dessus.</Text>}
      </Card>

      <Button title={id ? "Enregistrer" : "Créer l'article"} onPress={save} loading={saving} style={{ marginTop: 20 }} />
      {id ? <SmallButton title="Supprimer l'article" icon="trash-outline" tone="danger" onPress={remove} style={{ marginTop: 14, alignSelf: "center" }} /> : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  photo: { width: 96, height: 116, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.cream },
  addPhoto: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.caramel, gap: 4 },
  addText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.caramel },
  primary: { position: "absolute", left: 4, bottom: 4, backgroundColor: colors.brown, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  primaryText: { color: colors.white, fontFamily: fonts.sansSemiBold, fontSize: 9.5 },
  photoActions: { position: "absolute", top: 4, right: 4, gap: 4 },
  photoBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  two: { flexDirection: "row", gap: 10 },
  variant: { paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  err: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, marginTop: -8, marginBottom: 10 },
});
