import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fonts } from "../theme";
import Button from "./Button";

export default function Empty({ icon = "bag-handle-outline", title, text, action, onAction }) {
  return (
    <View style={styles.box}>
      <View style={styles.circle}><Ionicons name={icon} size={34} color={colors.caramel} /></View>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: 18, alignSelf: "stretch" }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", padding: 32, paddingTop: 60 },
  circle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontFamily: fonts.serifBold, fontSize: 17, color: colors.brown, textAlign: "center" },
  text: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 19 },
});
