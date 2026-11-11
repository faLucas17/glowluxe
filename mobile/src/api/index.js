import api, { cachedGet } from "./client";
import { tokens } from "./storage";

// ── Compte ──
export async function login(email, password) {
  const { data } = await api.post("/auth/login/", { email: email.trim().toLowerCase(), password });
  await tokens.set("access_token", data.access);
  await tokens.set("refresh_token", data.refresh);
  return data.user;
}
export async function register(payload) {
  const { data } = await api.post("/auth/register/", payload);
  await tokens.set("access_token", data.access);
  await tokens.set("refresh_token", data.refresh);
  return data.user;
}
export async function logout() {
  const refresh = await tokens.get("refresh_token");
  try {
    if (refresh) await api.post("/auth/logout/", { refresh });
  } catch {}
  await tokens.clear();
}
export const getMe = async () => (await api.get("/auth/me/")).data;
export const updateMe = async (payload) => (await api.patch("/auth/me/", payload)).data;
export const resendVerification = async () => (await api.post("/auth/verify-email/resend/")).data;
export const requestPasswordReset = async (email) => (await api.post("/auth/password/reset/", { email })).data;
export async function confirmPasswordReset(payload) {
  const { data } = await api.post("/auth/password/reset/confirm/", payload);
  await tokens.set("access_token", data.access);
  await tokens.set("refresh_token", data.refresh);
  return data.user;
}
export async function changePassword(payload) {
  const { data } = await api.post("/auth/password/change/", payload);
  await tokens.set("access_token", data.access);
  await tokens.set("refresh_token", data.refresh);
  return data.user;
}
export const hasToken = async () => !!(await tokens.get("access_token"));

// ── Adresses ──
export const fetchAddresses = async () => (await api.get("/auth/addresses/")).data;
export const createAddress = async (payload) => (await api.post("/auth/addresses/", payload)).data;
export const deleteAddress = async (id) => api.delete(`/auth/addresses/${id}/`);

// ── Catalogue ──
export const fetchProducts = (params = {}, force = false) => cachedGet("/products/", params, { maxAge: 120000, force });
export const fetchProduct = (slug, force) => cachedGet(`/products/${slug}/`, null, { maxAge: 120000, force });
export const fetchRelated = (slug) => cachedGet(`/products/${slug}/related/`, null, { maxAge: 300000 });
export const fetchCategories = () => cachedGet("/categories/", null, { maxAge: 600000 });
export const fetchConfig = (force) => cachedGet("/config/", null, { maxAge: 600000, force });
export const fetchPromotions = async () => (await api.get("/promotions/")).data;

// ── Panier ──
export const fetchCart = async () => (await api.get("/cart/")).data;
export const addToCart = async ({ product, variant, quantity = 1 }) =>
  (await api.post("/cart/add_item/", { product, variant: variant || null, quantity })).data;
export const updateCartItem = async (id, quantity) => (await api.patch(`/cart/update-item/${id}/`, { quantity })).data;
export const removeCartItem = async (id) => (await api.delete(`/cart/remove-item/${id}/`)).data;
export const mergeCart = async (items) => (await api.post("/cart/merge/", { items })).data;

// ── Commandes / paiements ──
export const quote = async (payload) => (await api.post("/orders/quote/", payload)).data;
export const checkout = async (payload) => (await api.post("/orders/checkout/", payload)).data;
export const fetchOrders = async () => (await api.get("/orders/")).data;
export const fetchOrder = async (id) => (await api.get(`/orders/${id}/`)).data;
export const payOrder = async (id, payload) => (await api.post(`/orders/${id}/pay/`, payload)).data;
export const cancelOrder = async (id) => (await api.post(`/orders/${id}/cancel/`)).data;
export const paymentStatus = async (ref) => (await api.get(`/payments/${ref}/status/`)).data;
export const fetchTracking = async (orderId) => (await api.get(`/tracking/${orderId}/`)).data;

// ── Livreurs ──
export const courierApplication = async () => (await api.get("/courier/apply/")).data;
export const applyCourier = async (payload) => (await api.post("/courier/apply/", payload)).data;
export const courierDashboard = async () => (await api.get("/courier/dashboard/")).data;
export const setAvailability = async (is_available) => (await api.post("/courier/availability/", { is_available })).data;
export const sendLocation = async (lat, lng) => (await api.post("/courier/location/", { lat, lng })).data;
export const courierAct = async (id, act, payload = {}) => (await api.post(`/courier/deliveries/${id}/${act}/`, payload)).data;
