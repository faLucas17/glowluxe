import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Logo from "../components/Logo";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors, fonts } from "../theme";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pwdRef = useRef(null);

  const submit = async () => {
    if (!email || !password) return setError("Saisissez votre email et votre mot de passe.");
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigation.goBack();
    } catch (e) {
      setError(e.response?.status === 401 ? "Email ou mot de passe incorrect." : errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen contentStyle={{ padding: 24 }} background={colors.cream}>
        <View style={styles.box}>
          <View style={{ alignItems: "center", marginBottom: 24 }}><Logo size={36} /></View>
          <Text style={styles.title}>Bon retour !</Text>
          <Text style={styles.sub}>Connectez-vous à votre compte</Text>
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => pwdRef.current?.focus()} />
          <Field ref={pwdRef} label="Mot de passe" value={password} onChangeText={setPassword} secure autoComplete="password"
            textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => navigation.navigate("ForgotPassword", { email })} style={{ alignSelf: "flex-end", marginBottom: 16 }}>
            <Text style={styles.link}>Mot de passe oublié ?</Text>
          </Pressable>
          <Button title="Se connecter" onPress={submit} loading={loading} />
          <Pressable onPress={() => navigation.replace("Register")} style={{ marginTop: 18, alignItems: "center" }}>
            <Text style={styles.sub}>Pas encore de compte ? <Text style={styles.link}>Créer un compte</Text></Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: 20, padding: 22, maxWidth: 440, width: "100%", alignSelf: "center" },
  title: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.brown, textAlign: "center" },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 18 },
  link: { fontFamily: fonts.sansSemiBold, color: colors.caramel, fontSize: 13 },
  error: { color: colors.danger, fontFamily: fonts.sansMedium, fontSize: 13, marginBottom: 10, textAlign: "center" },
});
