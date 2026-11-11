import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as API from "../api";
import { clearCache, setSessionExpiredHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    (async () => {
      if (await API.hasToken()) {
        try {
          setUser(await API.getMe());
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => setUser(await API.login(email, password)), []);
  const register = useCallback(async (payload) => setUser(await API.register(payload)), []);
  const resetWithCode = useCallback(async (payload) => setUser(await API.confirmPasswordReset(payload)), []);
  const refreshUser = useCallback(async () => {
    try {
      setUser(await API.getMe());
    } catch {}
  }, []);
  const logout = useCallback(async () => {
    await API.logout();
    clearCache();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser, resetWithCode, setUser }),
    [user, loading, login, register, logout, refreshUser, resetWithCode]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
