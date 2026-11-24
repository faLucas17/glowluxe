import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radius } from "../theme";

export default function Chip({ label, active, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active, style]} accessibilityRole="button">
      <Text style={[styles.text, active && { color: colors.white }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1, borderColor: colors.caramelLight, borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.white,
  },
  active: { backgroundColor: colors.brown, borderColor: colors.brown },
  text: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.brown, letterSpacing: 0.5 },
});
