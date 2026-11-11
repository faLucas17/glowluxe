import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getJSON, setJSON } from "../api/storage";

const FavoritesContext = createContext(null);
const KEY = "favorites_v2";

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getJSON(KEY, []).then(setItems);
  }, []);

  const toggle = useCallback((product) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.filter((p) => p.id !== product.id)
        : [
            {
              id: product.id, slug: product.slug, name: product.name, price: product.price,
              compare_at_price: product.compare_at_price, discount_percent: product.discount_percent,
              category_name: product.category_name || product.category?.name,
              primary_image: product.primary_image || product.images?.[0]?.image || null,
            },
            ...prev,
          ];
      setJSON(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ items, count: items.length, toggle, isFavorite: (id) => items.some((p) => p.id === id) }),
    [items, toggle]
  );
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export const useFavorites = () => useContext(FavoritesContext);
