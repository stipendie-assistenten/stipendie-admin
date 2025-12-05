import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode'; // You might need to install this: npm install jwt-decode

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in on app start by checking token
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const decoded = jwtDecode(token) as any;
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.userId || 'admin',
            email: decoded.email || 'admin@stipendie.labb.site',
            name: decoded.name || 'Admin User',
            role: decoded.role || 'admin'
          });
        } else {
          // Token is expired, remove it
          localStorage.removeItem('adminToken');
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('adminToken');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // In a real implementation, this would call your backend API
    // For now, we'll simulate a successful login
    try {
      // This is a mock implementation - replace with real API call
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      //
      // const data = await response.json();
      // if (response.ok) {
      //   localStorage.setItem('adminToken', data.token);
      //   setUser(data.user);
      //   return true;
      // }
      
      // Mock successful login
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5Ac3RpcGVuZGllLmxhYmIuc2l0ZSIsIm5hbWUiOiJBZG1pbiBVc2VyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMjU0OTl9.abcdef';
      localStorage.setItem('adminToken', mockToken);
      setUser({
        id: 'admin',
        email: email,
        name: 'Admin User',
        role: 'admin'
      });
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};