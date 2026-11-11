import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";

import { applyCourier, courierApplication } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Chip from "../components/Chip";
import Empty from "../components/Empty";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../theme";
import { notify } from "../utils/notify";

const VEHICLES = [["moto", "Moto / Jakarta"], ["voiture", "Voiture"], ["velo", "Vélo"], ["pied", "À pied"]];

export default function BecomeCourierScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(undefined);
  const [form, setForm] = useState({ phone: user?.phone_number || "", vehicle: "moto", zones: "", motivation: "", accept_terms: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    courierApplication().then((r) => setStatus(r.status)).catch(() => setStatus(null));
  }, [user]);

  if (!user) return <Empty icon="bicycle-outline" title="Devenir livreur" text="Créez un compte ou connectez-vous pour postuler." action="Se connecter" onAction={() => navigation.navigate("Login")} />;
  if (status === "approved") return <Empty icon="checkmark-circle-outline" title="Vous êtes livreur GlowLuxe" action="Ouvrir mon espace livreur" onAction={() => navigation.replace("CourierDashboard")} />;
  if (status === "pending") return <Empty icon="time-outline" title="Candidature en cours d'étude" text="Notre équipe vous contacte pour une vérification d'identité rapide. Vous recevrez un email dès la validation." />;
  if (status && status !== "approved") return <Empty icon="alert-circle-outline" title="Compte livreur inactif" text="Contactez-nous pour plus d'informations." />;

  const submit = async () => {
    setLoading(true);
    try {
      const r = await applyCourier(form);
      setStatus(r.status);
      refreshUser();
      notify("Candidature envoyée", r.detail);
    } catch (e) {
      notify("Candidature", errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 16 }}>
      <View style={{ maxWidth: 600, width: "100%", alignSelf: "center" }}>
        <Text style={{ fontFamily: fonts.serifBold, fontSize: 18, color: colors.brown }}>🛵 Livrez avec GlowLuxe</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginVertical: 10, lineHeight: 19 }}>
          Quand vous êtes disponible, les courses vous sont proposées automatiquement selon votre position. Vous acceptez ou refusez depuis l'appli, le client suit votre trajet.
        </Text>
        <Field label="Téléphone" value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm({ ...form, phone: v })} />
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 13, marginBottom: 8, color: colors.text }}>Moyen de transport</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {VEHICLES.map(([v, l]) => <Chip key={v} label={l} active={form.vehicle === v} onPress={() => setForm({ ...form, vehicle: v })} />)}
        </View>
        <Field label="Zones couvertes" placeholder="Tivaouane, Thiès, Dakar…" value={form.zones} onChangeText={(v) => setForm({ ...form, zones: v })} />
        <Field label="Présentez-vous (facultatif)" multiline value={form.motivation} onChangeText={(v) => setForm({ ...form, motivation: v })} />
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <Switch value={form.accept_terms} onValueChange={(v) => setForm({ ...form, accept_terms: v })} trackColor={{ true: colors.caramel }} thumbColor={colors.white} />
          <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.text }}>J'ai plus de 18 ans et j'accepte une vérification d'identité.</Text>
        </View>
        <Button title="Envoyer ma candidature" onPress={submit} loading={loading} disabled={!form.accept_terms || !form.phone || !form.zones} />
      </View>
    </Screen>
  );
}
