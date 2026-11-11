import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import * as API from "../api";
import { getJSON, setJSON } from "../api/storage";
import { useAuth } from "./AuthContext";

/**
 * Panier :
 * - client connecté : panier sur le serveur (retrouvé sur tous ses appareils) ;
 * - visiteur : panier gardé sur le téléphone, fusionné automatiquement à la connexion.
 */
const CartContext = createContext(null);
const LOCAL_KEY = "guest_cart_v2";

function localTotals(items) {
  return {
    items,
    total: items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0),
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const previousUser = useRef(null);

  const loadLocal = useCallback(async () => setCart(localTotals(await getJSON(LOCAL_KEY, []))), []);

  const refresh = useCallback(async () => {
    if (!user) return loadLocal();
    setLoading(true);
    try {
      setCart(await API.fetchCart());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user, loadLocal]);

  useEffect(() => {
    (async () => {
      if (user && !previousUser.current) {
        const local = await getJSON(LOCAL_KEY, []);
        if (local.length) {
          try {
            await API.mergeCart(local.map((i) => ({ product: i.product, variant: i.variant, quantity: i.quantity })));
            await setJSON(LOCAL_KEY, []);
          } catch {}
        }
      }
      previousUser.current = user;
      refresh();
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback(
    async (product, variant, quantity = 1) => {
      if (user) {
        setCart(await API.addToCart({ product: product.id, variant: variant?.id, quantity }));
        return;
      }
      const items = await getJSON(LOCAL_KEY, []);
      const key = `${product.id}:${variant?.id || ""}`;
      const found = items.find((i) => i.id === key);
      if (found) found.quantity = Math.min(found.quantity + quantity, 20);
      else
        items.push({
          id: key,
          product: product.id,
          variant: variant?.id || null,
          variant_label: variant?.label && variant.label !== "Unique" ? variant.label : "",
          quantity,
          unit_price: Number(product.price) + Number(variant?.extra_price || 0),
          product_detail: {
            id: product.id, name: product.name, slug: product.slug, price: product.price,
            primary_image: product.primary_image || product.images?.[0]?.image || null,
            category_name: product.category_name || product.category?.name,
          },
        });
      await setJSON(LOCAL_KEY, items);
      setCart(localTotals(items));
    },
    [user]
  );

  const setQuantity = useCallback(
    async (item, quantity) => {
      if (user) {
        setCart(await API.updateCartItem(item.id, quantity));
        return;
      }
      let items = await getJSON(LOCAL_KEY, []);
      items = quantity <= 0 ? items.filter((i) => i.id !== item.id) : items.map((i) => (i.id === item.id ? { ...i, quantity: Math.min(quantity, 20) } : i));
      await setJSON(LOCAL_KEY, items);
      setCart(localTotals(items));
    },
    [user]
  );

  const remove = useCallback((item) => setQuantity(item, 0), [setQuantity]);

  const value = useMemo(
    () => ({ cart, count: cart.count || 0, loading, refresh, add, setQuantity, remove, setCart }),
    [cart, loading, refresh, add, setQuantity, remove]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
