import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, Pressable } from "react-native";

import AppHeader from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
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
import AdminCategoriesScreen from "../screens/gestion/AdminCategoriesScreen";
import AdminCategoryFormScreen from "../screens/gestion/AdminCategoryFormScreen";
import AdminClientScreen from "../screens/gestion/AdminClientScreen";
import AdminClientsScreen from "../screens/gestion/AdminClientsScreen";
import AdminCouriersScreen from "../screens/gestion/AdminCouriersScreen";
import AdminOrderScreen from "../screens/gestion/AdminOrderScreen";
import AdminOrdersScreen from "../screens/gestion/AdminOrdersScreen";
import AdminPaymentsScreen from "../screens/gestion/AdminPaymentsScreen";
import AdminProductFormScreen from "../screens/gestion/AdminProductFormScreen";
import AdminProductsScreen from "../screens/gestion/AdminProductsScreen";
import AdminPromotionFormScreen from "../screens/gestion/AdminPromotionFormScreen";
import AdminPromotionsScreen from "../screens/gestion/AdminPromotionsScreen";
import AdminReviewsScreen from "../screens/gestion/AdminReviewsScreen";
import AdminSettingsScreen from "../screens/gestion/AdminSettingsScreen";
import AdminZonesScreen from "../screens/gestion/AdminZonesScreen";
import GestionHomeScreen from "../screens/gestion/GestionHomeScreen";

const Root = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background, card: colors.white, text: colors.text, border: colors.border, primary: colors.caramel },
};

const baseStackOptions = {
  headerTintColor: colors.brown,
  headerTitleStyle: { fontFamily: fonts.sansSemiBold, color: colors.text, fontSize: 16 },
  headerStyle: { backgroundColor: colors.white },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: colors.background },
  animation: Platform.OS === "android" ? "fade_from_bottom" : "default",
};
/**
 * Bouton retour toujours présent : si l'écran a été ouvert directement (menu, lien d'email,
 * page web rechargée), il n'y a rien « derrière » lui ; la flèche ramène alors à l'accueil de l'onglet.
 */
function stackOptions({ navigation, route }) {
  const state = navigation.getState();
  const home = state?.routeNames?.[0];
  // Un écran est déjà dessous dans cet onglet : la flèche normale suffit
  if (!state || state.index > 0 || !home || route.name === home) return baseStackOptions;
  return {
    ...baseStackOptions,
    headerLeft: () => (
      <Pressable
        onPress={() => navigation.reset({ index: 0, routes: [{ name: home }] })}
        hitSlop={12}
        style={{ paddingRight: 12, paddingVertical: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} size={24} color={colors.brown} />
      </Pressable>
    ),
  };
}
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

/** Espace de gestion (comptes gérante uniquement) : remplace l'ancienne administration Django. */
function GestionStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="GestionHome" component={GestionHomeScreen} options={withAppHeader} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: "Commandes" }} />
      <Stack.Screen name="AdminOrder" component={AdminOrderScreen} options={{ title: "Commande" }} />
      <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} options={{ title: "Paiements" }} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: "Articles" }} />
      <Stack.Screen name="AdminProductForm" component={AdminProductFormScreen} options={{ title: "Article" }} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ title: "Catégories" }} />
      <Stack.Screen name="AdminCategoryForm" component={AdminCategoryFormScreen} options={{ title: "Catégorie" }} />
      <Stack.Screen name="AdminPromotions" component={AdminPromotionsScreen} options={{ title: "Promotions" }} />
      <Stack.Screen name="AdminPromotionForm" component={AdminPromotionFormScreen} options={{ title: "Promotion" }} />
      <Stack.Screen name="AdminClients" component={AdminClientsScreen} options={{ title: "Clientes" }} />
      <Stack.Screen name="AdminClient" component={AdminClientScreen} options={{ title: "Cliente" }} />
      <Stack.Screen name="AdminCouriers" component={AdminCouriersScreen} options={{ title: "Livreurs" }} />
      <Stack.Screen name="AdminZones" component={AdminZonesScreen} options={{ title: "Zones de livraison" }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: "Réglages de la boutique" }} />
      <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} options={{ title: "Avis" }} />
      <Stack.Screen name="GestionAbout" component={AboutScreen} options={withAppHeader} />
    </Stack.Navigator>
  );
}

const ICONS = {
  Boutique: "storefront",
  Favoris: "heart",
  Panier: "bag-handle",
  Commandes: "receipt",
  "À propos": "information-circle",
  Gestion: "briefcase",
  Profil: "person",
};

function MainTabs() {
  const { user } = useAuth();
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
      {/* Compte gérante : l'onglet « Gestion » prend la place de « À propos » (toujours dans le menu) */}
      {user?.is_staff ? <Tab.Screen name="Gestion" component={GestionStack} /> : <Tab.Screen name="À propos" component={AboutStack} />}
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
          Gestion: {
            path: "gestion",
            screens: {
              GestionHome: "", AdminOrders: "commandes", AdminOrder: "commandes/:id", AdminPayments: "paiements",
              AdminProducts: "articles", AdminProductForm: "article", AdminCategories: "categories", AdminCategoryForm: "categorie",
              AdminPromotions: "promotions", AdminPromotionForm: "promotion", AdminClients: "clientes", AdminClient: "clientes/:id",
              AdminCouriers: "livreurs", AdminZones: "zones", AdminSettings: "reglages", AdminReviews: "avis", GestionAbout: "a-propos",
            },
          },
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
      <Root.Navigator initialRouteName={Platform.OS === "web" ? "MainTabs" : "Welcome"} screenOptions={{ ...baseStackOptions, headerShown: false }}>
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
