import { useState } from "react";
import { Text, View } from "react-native";

import { requestPasswordReset } from "../api";
import { errorMessage } from "../api/client";
import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";
import { notify } from "../utils/notify";
import { styles } from "./LoginScreen";

export default function ForgotPasswordScreen({ navigation, route }) {
  const { resetWithCode } = useAuth();
  const [email, setEmail] = useState(route.params?.email || "");
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setStep(2);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  const confirmCode = async () => {
    setLoading(true);
    setError("");
    try {
      await resetWithCode({ email: email.trim().toLowerCase(), code: code.trim(), new_password: password });
      navigation.goBack();
      notify("Mot de passe modifié", "Vous êtes connecté(e).");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={{ padding: 24 }} background={colors.cream}>
      <View style={styles.box}>
        <Text style={styles.title}>Mot de passe oublié</Text>
        {step === 1 ? (
          <>
            <Text style={styles.sub}>Nous vous envoyons un code à 6 chiffres par email.</Text>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Recevoir le code" onPress={send} loading={loading} disabled={!email} />
          </>
        ) : (
          <>
            <Text style={styles.sub}>Code envoyé à {email} (pensez aux spams). Valable 15 minutes.</Text>
            <Field label="Code reçu" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
            <Field label="Nouveau mot de passe" value={password} onChangeText={setPassword} secure hint="8 caractères minimum" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Changer le mot de passe" onPress={confirmCode} loading={loading} disabled={code.length < 6 || password.length < 8} />
            <Button title="Renvoyer un code" variant="outline" onPress={send} style={{ marginTop: 10 }} />
          </>
        )}
      </View>
    </Screen>
  );
}
