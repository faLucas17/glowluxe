import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { changePassword, updateMe } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../theme";
import { notify } from "../utils/notify";

export default function SettingsScreen() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, phone_number: user.phone_number, newsletter: user.newsletter });
  const [pwd, setPwd] = useState({ old_password: "", new_password: "" });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      setUser(await updateMe(form));
      notify("Enregistré", "Vos informations sont à jour.");
    } catch (e) {
      notify("Erreur", errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const change = async () => {
    setChanging(true);
    try {
      setUser(await changePassword(pwd));
      setPwd({ old_password: "", new_password: "" });
      notify("Mot de passe modifié", "");
    } catch (e) {
      notify("Erreur", errorMessage(e));
    } finally {
      setChanging(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 16 }}>
      <View style={{ maxWidth: 600, width: "100%", alignSelf: "center" }}>
        <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, marginBottom: 12, color: colors.text }}>Mes informations</Text>
        <Field label="Prénom" value={form.first_name} onChangeText={(v) => setForm({ ...form, first_name: v })} />
        <Field label="Nom" value={form.last_name} onChangeText={(v) => setForm({ ...form, last_name: v })} />
        <Field label="Téléphone" value={form.phone_number} keyboardType="phone-pad" onChangeText={(v) => setForm({ ...form, phone_number: v })} />
        <Field label="Email" value={user.email} editable={false} hint={user.email_verified ? "Email vérifié ✓" : "Email non vérifié"} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Text style={{ flex: 1, fontFamily: fonts.sansMedium, color: colors.text }}>Recevoir les promotions par email</Text>
          <Switch value={form.newsletter} onValueChange={(v) => setForm({ ...form, newsletter: v })} trackColor={{ true: colors.caramel }} thumbColor={colors.white} />
        </View>
        <Button title="Enregistrer" onPress={save} loading={saving} />

        <Text style={{ fontFamily: fonts.sansBold, fontSize: 15, marginVertical: 14, marginTop: 30, color: colors.text }}>Mot de passe</Text>
        <Field label="Mot de passe actuel" secure value={pwd.old_password} onChangeText={(v) => setPwd({ ...pwd, old_password: v })} />
        <Field label="Nouveau mot de passe" secure value={pwd.new_password} onChangeText={(v) => setPwd({ ...pwd, new_password: v })} hint="8 caractères minimum, pas uniquement des chiffres" />
        <Button title="Changer le mot de passe" variant="outline" onPress={change} loading={changing} disabled={!pwd.old_password || !pwd.new_password} />
      </View>
    </Screen>
  );
}
