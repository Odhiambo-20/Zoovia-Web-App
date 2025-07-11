// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fixed API URL configuration - MUST point to your Render backend
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend.onrender.com';
  
  console.log('Environment check:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    API_BASE_URL: API_BASE_URL,
    NODE_ENV: import.meta.env.NODE_ENV,
    MODE: import.meta.env.MODE
  }); // Debug log

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('🔍 Verifying existing token...');
          // Verify token with backend
          const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('Token verification response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Token verification successful:', data);
            setUser({
              id: data.data.user.id,
              name: data.data.user.fullName,
              email: data.data.user.email,
              token: token,
            });
          } else {
            // Token is invalid, remove it
            console.log('❌ Token verification failed, removing token');
            localStorage.removeItem('token');
          }
        } else {
          console.log('No existing token found');
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [API_BASE_URL]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login...');
      console.log('Login URL:', `${API_BASE_URL}/api/auth/login`);
      console.log('Login payload:', { email, password: '***' });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        console.error('❌ Login failed with status:', response.status);
        console.error('Login error data:', data);
        throw new Error(data.error || data.message || `Login failed with status ${response.status}`);
      }

      console.log('✅ Login successful');
      localStorage.setItem('token', data.data.token);
      setUser({
        id: data.data.user.id,
        name: data.data.user.fullName,
        email: data.data.user.email,
        token: data.data.token,
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Login error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('📝 Attempting registration...');
      console.log('Registration URL:', `${API_BASE_URL}/api/auth/register`);
      console.log('Registration payload:', { 
        fullName: name, 
        email, 
        password: '***',
        passwordLength: password.length 
      });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fullName: name, 
          email, 
          password 
        }),
      });

      console.log('Registration response status:', response.status);
      console.log('Registration response headers:', Object.fromEntries(response.headers.entries()));

      // Try to parse response as JSON
      let data;
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
          console.log('Registration response data:', data);
        } catch (jsonError) {
          console.error('❌ Failed to parse JSON response:', jsonError);
          const textData = await response.text();
          console.error('Raw response text:', textData);
          throw new Error(`Registration failed: Invalid JSON response (Status: ${response.status})`);
        }
      } else {
        const textData = await response.text();
        console.error('❌ Non-JSON response received:', textData);
        throw new Error(`Registration failed: Expected JSON response but got ${contentType} (Status: ${response.status})`);
      }

      if (!response.ok) {
        console.error('❌ Registration failed with status:', response.status);
        console.error('Registration error data:', data);
        
        // Handle different error response formats
        let errorMessage = 'Registration failed';
        if (data?.error) {
          errorMessage = data.error;
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.join(', ');
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          errorMessage = `Registration failed with status ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      // Validate response structure
      if (!data || !data.data || !data.data.token || !data.data.user) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Registration failed: Invalid response structure from server');
      }

      console.log('✅ Registration successful');
      localStorage.setItem('token', data.data.token);
      setUser({
        id: data.data.user.id,
        name: data.data.user.fullName,
        email: data.data.user.email,
        token: data.data.token,
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Registration error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // Log additional network-related error info
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Network error detected - possible causes:');
        console.error('1. Backend server is not running');
        console.error('2. CORS issues');
        console.error('3. Invalid API URL:', API_BASE_URL);
        console.error('4. Network connectivity issues');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Attempting logout...');
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Calling logout endpoint...');
        // Call backend logout endpoint
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Logout response status:', response.status);
        
        if (!response.ok) {
          console.warn('⚠️ Logout endpoint returned non-ok status:', response.status);
        } else {
          console.log('✅ Logout successful');
        }
      } else {
        console.log('No token found for logout');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      console.error('Logout error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      console.log('🔓 User logged out and token removed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};