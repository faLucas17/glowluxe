import { createElement } from "react";
import { Platform, View } from "react-native";
import { WebView } from "react-native-webview";

/** Carte de suivi (page Leaflet servie par l'API) : WebView sur téléphone, iframe sur ordinateur. */
export default function WebMap({ url, height = 320 }) {
  if (!url) return <View style={{ height, backgroundColor: "#EFE6DC", borderRadius: 14 }} />;
  if (Platform.OS === "web") {
    return createElement("iframe", {
      src: url, title: "Carte de suivi",
      style: { width: "100%", height, border: 0, borderRadius: 14 },
    });
  }
  return (
    <View style={{ height, borderRadius: 14, overflow: "hidden" }}>
      <WebView source={{ uri: url }} originWhitelist={["https://*", "http://*"]} javaScriptEnabled domStorageEnabled />
    </View>
  );
}
