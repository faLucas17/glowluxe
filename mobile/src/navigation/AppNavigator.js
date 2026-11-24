import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";

import AppHeader from "../components/AppHeader";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { colors, fonts } from "../theme";

import AboutScreen from "../screens/AboutScreen";
import AddressFormScreen from "../screens/AddressFormScreen";
import AddressesScreen from "../screens/AddressesScreen";
import BecomeCourierScreen from "../screens/BecomeCourierScreen";
import CartScreen from "../screens/CartScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import CourierDashboardScreen from "../screens/CourierDashboardScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import OrderDetailScreen from "../screens/OrderDetailScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderTrackingScreen from "../screens/OrderTrackingScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SettingsScreen from "../screens/SettingsScreen";
import WelcomeScreen from "../screens/WelcomeScreen";

const Root = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, card: colors.white, text: colors.text, border: colors.border, primary: colors.caramel },
};

const stackOptions = {
  headerTintColor: colors.brown,
  headerTitleStyle: { fontFamily: fonts.sansSemiBold, color: colors.text, fontSize: 16 },
  headerStyle: { backgroundColor: colors.white },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: colors.background },
  animation: Platform.OS === "android" ? "fade_from_bottom" : "default",
};
const withAppHeader = { header: () => <AppHeader /> };

function BoutiqueStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Accueil" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "" }} />
    </Stack.Navigator>
  );
}

function FavorisStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="FavorisList" component={FavoritesScreen} options={withAppHeader} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: "" }} />
    </Stack.Navigator>
  );
}

function PanierStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="PanierDetail" component={CartScreen} options={withAppHeader} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Paiement" }} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} options={{ title: "Nouvelle adresse" }} />
    </Stack.Navigator>
  );
}

function CommandesStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Orders" component={OrdersScreen} options={withAppHeader} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Ma commande" }} />
      <Stack.Screen name="Tracking" component={OrderTrackingScreen} options={{ title: "Suivi du colis" }} />
    </Stack.Navigator>
  );
}

function AboutStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AboutDetail" component={AboutScreen} options={withAppHeader} />
    </Stack.Navigator>
  );
}

function ProfilStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="ProfilDetail" component={ProfileScreen} options={withAppHeader} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Paramètres" }} />
      <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: "Mes adresses" }} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} options={{ title: "Nouvelle adresse" }} />
      <Stack.Screen name="BecomeCourier" component={BecomeCourierScreen} options={{ title: "Devenir livreur" }} />
      <Stack.Screen name="CourierDashboard" component={CourierDashboardScreen} options={{ title: "Espace livreur" }} />
    </Stack.Navigator>
  );
}

const ICONS = {
  Boutique: "storefront",
  Favoris: "heart",
  Panier: "bag-handle",
  Commandes: "receipt",
  "À propos": "information-circle",
  Profil: "person",
};

function MainTabs() {
  const { count } = useCart();
  const favs = useFavorites();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.caramel,
        tabBarInactiveTintColor: colors.brown,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 10 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarBadgeStyle: { backgroundColor: colors.caramel, fontSize: 10 },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Boutique" component={BoutiqueStack} />
      <Tab.Screen name="Favoris" component={FavorisStack} options={{ tabBarBadge: favs.count || undefined }} />
      <Tab.Screen name="Panier" component={PanierStack} options={{ tabBarBadge: count || undefined }} />
      <Tab.Screen name="Commandes" component={CommandesStack} />
      <Tab.Screen name="À propos" component={AboutStack} />
      <Tab.Screen name="Profil" component={ProfilStack} />
    </Tab.Navigator>
  );
}

/** Adresses web (version ordinateur) et liens des emails : /commandes/<id>/suivi, /produit/<slug>… */
const linking = {
  prefixes: [Linking.createURL("/"), "https://glowluxe.sn", "https://www.glowluxe.sn"],
  config: {
    screens: {
      Welcome: "bienvenue",
      Login: "connexion",
      Register: "inscription",
      ForgotPassword: "mot-de-passe-oublie",
      MainTabs: {
        screens: {
          Boutique: { path: "", screens: { Accueil: "", ProductDetail: "produit/:slug" } },
          Favoris: { path: "favoris", screens: { FavorisList: "" } },
          Panier: { path: "panier", screens: { PanierDetail: "", Checkout: "paiement" } },
          Commandes: { path: "commandes", screens: { Orders: "", OrderDetail: ":id", Tracking: ":id/suivi" } },
          "À propos": { path: "a-propos", screens: { AboutDetail: "" } },
          Profil: {
            path: "profil",
            screens: { ProfilDetail: "", Settings: "parametres", Addresses: "adresses", BecomeCourier: "devenir-livreur", CourierDashboard: "livreur" },
          },
        },
      },
    },
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={theme} linking={linking} documentTitle={{ formatter: () => "GlowLuxe By Sofa" }}>
      <Root.Navigator initialRouteName={Platform.OS === "web" ? "MainTabs" : "Welcome"} screenOptions={{ ...stackOptions, headerShown: false }}>
        <Root.Screen name="Welcome" component={WelcomeScreen} options={{ animation: "fade" }} />
        <Root.Screen name="MainTabs" component={MainTabs} options={{ animation: "fade" }} />
        <Root.Group screenOptions={{ presentation: "modal", headerShown: true }}>
          <Root.Screen name="Login" component={LoginScreen} options={{ title: "Connexion" }} />
          <Root.Screen name="Register" component={RegisterScreen} options={{ title: "Créer un compte" }} />
          <Root.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Mot de passe oublié" }} />
        </Root.Group>
      </Root.Navigator>
    </NavigationContainer>
  );
}
