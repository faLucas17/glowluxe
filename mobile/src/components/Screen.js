import { ScrollView, StyleSheet, View } from "react-native";

import { colors } from "../theme";

/** Conteneur centré (largeur max sur tablette/ordinateur). */
export function Container({ children, style }) {
  return <View style={[styles.container, style]}>{children}</View>;
}

export default function Screen({ children, scroll = true, style, contentStyle, refreshControl, background = colors.background }) {
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: background }, style]}>{children}</View>;
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: background }, style]}
      contentContainerStyle={[{ paddingBottom: 40 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <Container>{children}</Container>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 1280, alignSelf: "center" },
});
