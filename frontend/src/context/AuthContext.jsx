import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('d2d_token'));

  const saveToken = (newToken) => {
    localStorage.setItem('d2d_token', newToken);
    setToken(newToken);
  };

  const clearAuth = () => {
    localStorage.removeItem('d2d_token');
    setToken(null);
    setUser(null);
  };

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authAPI.getMe();
        setUser(data.user);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await authAPI.login({ email, password });
    saveToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (formData) => {
    const data = await authAPI.register(formData);
    saveToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
