import { useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BerkshireSwash_400Regular } from "@expo-google-fonts/berkshire-swash";
import { Merriweather_300Light, Merriweather_400Regular, Merriweather_700Bold } from "@expo-google-fonts/merriweather";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { loading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold,
    Merriweather_300Light, Merriweather_400Regular, Merriweather_700Bold, BerkshireSwash_400Regular,
  });
  const ready = (fontsLoaded || fontError) && !loading;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Root />
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
