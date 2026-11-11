import { Alert, Platform } from "react-native";

/** Alert.alert ne fait rien sur le web : on passe par window.alert / confirm. */
export function notify(title, message = "") {
  if (Platform.OS === "web") window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

export function confirm(title, message, onYes, yesLabel = "Oui") {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: "Annuler", style: "cancel" },
    { text: yesLabel, style: "destructive", onPress: onYes },
  ]);
}
