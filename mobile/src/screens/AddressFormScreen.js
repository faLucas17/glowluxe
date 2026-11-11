import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { createAddress } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../theme";
import { notify } from "../utils/notify";

export default function AddressFormScreen({ navigation }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: [user?.first_name, user?.last_name].filter(Boolean).join(" "),
    phone_number: user?.phone_number || "",
    city: "", street_address: "", landmark: "", country: "Sénégal",
  });
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const locate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return notify("Localisation refusée", "Indiquez bien un point de repère pour le livreur.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6), accuracy: Math.round(pos.coords.accuracy || 0) });
    } catch {
      notify("Localisation", "Position indisponible pour le moment.");
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Nom obligatoire";
    if (!form.phone_number.trim()) e.phone_number = "Téléphone obligatoire";
    if (!form.city.trim()) e.city = "Ville obligatoire";
    if (!form.street_address.trim()) e.street_address = "Adresse obligatoire";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await createAddress({ ...form, ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}), is_default: true });
      navigation.goBack();
    } catch (err) {
      notify("Adresse", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 16 }}>
      <View style={{ maxWidth: 600, width: "100%", alignSelf: "center" }}>
        <Field label="Nom complet" value={form.full_name} onChangeText={set("full_name")} error={errors.full_name} />
        <Field label="Téléphone" value={form.phone_number} onChangeText={set("phone_number")} keyboardType="phone-pad" placeholder="77 123 45 67" error={errors.phone_number} />
        <Field label="Ville / quartier" value={form.city} onChangeText={set("city")} placeholder="Tivaouane, Dakar…" error={errors.city} />
        <Field label="Adresse" value={form.street_address} onChangeText={set("street_address")} placeholder="Rue, numéro de maison…" error={errors.street_address} />
        <Field label="Point de repère" value={form.landmark} onChangeText={set("landmark")} placeholder="Près de la mosquée, pharmacie…" />
        <Field label="Pays" value={form.country} onChangeText={set("country")} />
        <Pressable onPress={locate} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
          <Ionicons name={coords ? "checkmark-circle" : "locate"} size={20} color={coords ? colors.success : colors.caramel} />
          <Text style={{ fontFamily: fonts.sansMedium, color: coords ? colors.success : colors.caramel }}>
            {locating ? "Localisation…" : coords ? `Position enregistrée (~${coords.accuracy} m)` : "Utiliser ma position actuelle (recommandé)"}
          </Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
          Avec votre position, le livreur vous trouve plus vite et vous voyez le temps d'arrivée.
        </Text>
        <Button title="Enregistrer l'adresse" onPress={save} loading={saving} />
      </View>
    </Screen>
  );
}
