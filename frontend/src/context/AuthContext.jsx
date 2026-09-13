import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, role: data.role, _id: data._id }));
      setUser({ name: data.name, email: data.email, role: data.role, _id: data._id });
      setToken(data.token);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const check = async () => {
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser({ name: data.name, email: data.email, role: data.role, _id: data._id });
        } catch {
          logout();
        }
      }
    };
    check();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);