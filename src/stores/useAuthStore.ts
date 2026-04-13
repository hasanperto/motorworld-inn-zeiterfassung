import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = 'https://api.webotonom.de';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  enterDemoMode: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isDemoMode: false,
      
      login: async (email: string, password: string) => {
        const res = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        
        if (res.ok) {
          set({ token: data.token, user: data.user, isAuthenticated: true, isDemoMode: false });
          return { success: true };
        }
        return { success: false, error: data.error };
      },
      
      register: async (name: string, email: string, password: string) => {
        const res = await fetch(`${API_URL}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        
        if (res.ok) {
          set({ token: data.token, user: data.user, isAuthenticated: true, isDemoMode: false });
          return { success: true };
        }
        return { success: false, error: data.error };
      },
      
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, isDemoMode: false });
      },
      
      enterDemoMode: () => {
        set({ isDemoMode: true, user: { id: 0, name: 'Demo', email: 'demo@webotonom.de' } });
      },
    }),
    { name: 'motorworld-auth' }
  )
);
