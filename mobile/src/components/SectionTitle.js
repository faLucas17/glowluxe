import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "../theme";

export default function SectionTitle({ title, subtitle, icon = "sparkles-outline", style }) {
  return (
    <View style={[{ marginVertical: 12 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {icon ? <Ionicons name={icon} size={20} color={colors.caramel} /> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.serifBold, fontSize: 19, color: colors.brown },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2, marginLeft: 28 },
});
