import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      
      login: async (email: string, password: string) => {
        try {
          const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (res.ok) {
            set({ token: data.token, user: data.user, isAuthenticated: true });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      
      register: async (name: string, email: string, password: string) => {
        try {
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          });
          const data = await res.json();
          if (res.ok) {
            set({ token: data.token, user: data.user, isAuthenticated: true });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    { name: 'motorworld-auth' }
  )
);
