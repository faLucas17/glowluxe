import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts, radius, spacing } from "../theme";

const Field = forwardRef(function Field({ label, error, secure, style, hint, ...props }, ref) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={[{ marginBottom: spacing(1.75) }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, error && { borderColor: colors.danger }]}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          secureTextEntry={secure && hidden}
          autoCapitalize={secure ? "none" : props.autoCapitalize}
          {...props}
        />
        {secure ? (
          <Pressable onPress={() => setHidden(!hidden)} hitSlop={10} accessibilityLabel="Afficher le mot de passe">
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

export default Field;

const styles = StyleSheet.create({
  label: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.caramelLight,
    borderRadius: radius.md, backgroundColor: colors.white, paddingHorizontal: spacing(1.75),
  },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.sans, fontSize: 15, color: colors.text, outlineStyle: "none" },
  error: { color: colors.danger, fontSize: 12, marginTop: 4, fontFamily: fonts.sans },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontFamily: fonts.sans },
});
