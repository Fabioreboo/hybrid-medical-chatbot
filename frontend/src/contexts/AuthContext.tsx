import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAxios } from '../api/axiosConfig';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Set default auth header
      authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Use authAxios which points to NestJS
      authAxios.get('/auth/me')
        .then(response => {
          setUser(response.data);
          // Store in sessionStorage
          sessionStorage.setItem('userEmail', response.data.email);
          sessionStorage.setItem('userName', response.data.name);
          sessionStorage.setItem('userRole', response.data.role);
        })
        .catch((error) => {
          // Token might be invalid or server unavailable - keep it for now
          // API calls will fail if token is truly invalid
          console.log('Auth check failed, will retry on next API call');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    sessionStorage.setItem('userEmail', userData.email);
    sessionStorage.setItem('userName', userData.name);
    sessionStorage.setItem('userRole', userData.role);
    authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('adminPinVerified');
    delete authAxios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};