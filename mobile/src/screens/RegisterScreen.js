import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Switch, Text, View } from "react-native";

import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Logo from "../components/Logo";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../theme";
import { notify } from "../utils/notify";
import { styles } from "./LoginScreen";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone_number: "", password: "", newsletter: true });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Prénom obligatoire";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Email invalide";
    if (form.password.length < 8) e.password = "8 caractères minimum";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await register({ ...form, email: form.email.trim().toLowerCase() });
      navigation.goBack();
      notify("Bienvenue ✨", `Un email de confirmation a été envoyé à ${form.email.trim()}.`);
    } catch (err) {
      const d = err.response?.data || {};
      setErrors({
        email: d.email?.[0], password: d.password?.[0] || d.non_field_errors?.[0],
        phone_number: d.phone_number?.[0], general: d.email || d.password || d.phone_number ? "" : errorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen contentStyle={{ padding: 24 }} background={colors.cream}>
        <View style={styles.box}>
          <View style={{ alignItems: "center", marginBottom: 18 }}><Logo size={32} /></View>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.sub}>Rejoignez GlowLuxe</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="Prénom" value={form.first_name} onChangeText={set("first_name")} error={errors.first_name} style={{ flex: 1 }} autoComplete="given-name" />
            <Field label="Nom" value={form.last_name} onChangeText={set("last_name")} style={{ flex: 1 }} autoComplete="family-name" />
          </View>
          <Field label="Email" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" error={errors.email} autoComplete="email" />
          <Field label="Téléphone" value={form.phone_number} onChangeText={set("phone_number")} keyboardType="phone-pad" placeholder="77 123 45 67" error={errors.phone_number} />
          <Field label="Mot de passe" value={form.password} onChangeText={set("password")} secure error={errors.password} hint="8 caractères minimum, pas uniquement des chiffres" autoComplete="new-password" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Switch value={form.newsletter} onValueChange={set("newsletter")} trackColor={{ true: colors.caramel }} thumbColor={colors.white} />
            <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: 12, color: colors.text }}>Recevoir les promotions et nouveautés par email</Text>
          </View>
          {errors.general ? <Text style={styles.error}>{errors.general}</Text> : null}
          <Button title="S'inscrire" onPress={submit} loading={loading} />
          <Pressable onPress={() => navigation.replace("Login")} style={{ marginTop: 18, alignItems: "center" }}>
            <Text style={styles.sub}>Déjà un compte ? <Text style={styles.link}>Se connecter</Text></Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
