import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radius, spacing } from "../theme";

/** variant : "primary" (caramel), "dark" (marron), "outline", "danger" */
export default function Button({ title, onPress, loading, disabled, variant = "primary", style, icon, small }) {
  const v = variants[variant] || variants.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base, small && styles.small, v.box, (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.text.color} /> : (
        <>
          {icon}
          <Text style={[styles.text, small && { fontSize: 13 }, v.text]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const variants = {
  primary: { box: { backgroundColor: colors.caramel }, text: { color: colors.white } },
  dark: { box: { backgroundColor: colors.brown }, text: { color: colors.white, letterSpacing: 2 } },
  outline: { box: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.brown }, text: { color: colors.brown } },
  danger: { box: { backgroundColor: colors.dangerBg }, text: { color: colors.danger } },
  light: { box: { backgroundColor: colors.cream }, text: { color: colors.brown } },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 50, borderRadius: radius.pill, paddingHorizontal: spacing(3),
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  small: { minHeight: 38, paddingHorizontal: spacing(2) },
  text: { fontFamily: fonts.sansSemiBold, fontSize: 15 },
});
