import { Platform } from "react-native";

import api from "./client";

/** API de l'espace de gestion (réservée aux comptes gérante). */
const G = "/gestion";
const get = async (url, params) => (await api.get(G + url, { params })).data;
const post = async (url, body) => (await api.post(G + url, body)).data;
const patch = async (url, body) => (await api.patch(G + url, body)).data;
const del = async (url) => (await api.delete(G + url)).data;

export const dashboard = () => get("/tableau-de-bord/");

export const orders = (params) => get("/commandes/", params);
export const order = (id) => get(`/commandes/${id}/`);
export const orderStatus = (id, status) => post(`/commandes/${id}/status/`, { status });
export const orderPayment = (id, amount, method) => post(`/commandes/${id}/payment/`, { amount, method });
export const orderRelaunch = (id) => post(`/commandes/${id}/relaunch/`);
export const orderNotes = (id, notes) => patch(`/commandes/${id}/`, { notes });
export const payments = (params) => get("/paiements/", params);

export const products = (params) => get("/articles/", params);
export const product = (id) => get(`/articles/${id}/`);
export const saveProduct = (id, body) => (id ? patch(`/articles/${id}/`, body) : post("/articles/", body));
export const deleteProduct = (id) => del(`/articles/${id}/`);
export const setPrimaryImage = (id, imageId) => patch(`/articles/${id}/images/${imageId}/`, { is_primary: true });
export const deleteImage = (id, imageId) => del(`/articles/${id}/images/${imageId}/`);

export const categories = () => get("/categories/");
export const saveCategory = (id, body) => (id ? patch(`/categories/${id}/`, body) : post("/categories/", body));
export const deleteCategory = (id) => del(`/categories/${id}/`);

export const reviews = (params) => get("/avis/", params);
export const deleteReview = (id) => del(`/avis/${id}/`);

export const clients = (params) => get("/clientes/", params);
export const client = (id) => get(`/clientes/${id}/`);
export const clientAccess = (id, what) => post(`/clientes/${id}/access/`, { what });

export const couriers = (params) => get("/livreurs/", params);
export const courierDecision = (id, what) => post(`/livreurs/${id}/decision/`, { what });

export const zones = () => get("/zones/");
export const saveZone = (id, body) => (id ? patch(`/zones/${id}/`, body) : post("/zones/", body));
export const deleteZone = (id) => del(`/zones/${id}/`);

export const promotions = (params) => get("/promotions/", params);
export const savePromotion = (id, body) => (id ? patch(`/promotions/${id}/`, body) : post("/promotions/", body));
export const deletePromotion = (id) => del(`/promotions/${id}/`);
export const sendPromotion = (id) => post(`/promotions/${id}/send/`);

export const settings = () => get("/reglages/");
export const saveSettings = (body) => patch("/reglages/", body);

/** Photos choisies avec expo-image-picker -> envoi multipart (téléphone et navigateur). */
async function toFormData(assets, field, extra = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null) form.append(k, String(v));
  for (const [i, a] of assets.entries()) {
    const name = a.fileName || `photo-${Date.now()}-${i}.jpg`;
    if (Platform.OS === "web") {
      const blob = a.file || (await (await fetch(a.uri)).blob());
      form.append(field, blob, name);
    } else {
      form.append(field, { uri: a.uri, name, type: a.mimeType || "image/jpeg" });
    }
  }
  return form;
}
const multipart = Platform.OS === "web" ? {} : { headers: { "Content-Type": "multipart/form-data" } };

export async function uploadProductImages(id, assets) {
  return (await api.post(`${G}/articles/${id}/images/`, await toFormData(assets, "image"), { ...multipart, timeout: 120000 })).data;
}
export async function uploadImageField(url, asset) {
  return (await api.patch(G + url, await toFormData([asset], "image"), { ...multipart, timeout: 120000 })).data;
}
