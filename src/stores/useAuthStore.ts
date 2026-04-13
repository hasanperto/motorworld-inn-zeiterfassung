import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
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
  exitDemoMode: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isDemoMode: false,
      
      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) return { success: false, error: error.message };
        
        set({ 
          token: data.session?.access_token, 
          user: { 
            id: data.user?.id ?? '', 
            name: data.user?.user_metadata?.name || '', 
            email: data.user?.email || email 
          }, 
          isAuthenticated: true,
          isDemoMode: false 
        });
        return { success: true };
      },
      
      register: async (name: string, email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        
        if (error) return { success: false, error: error.message };
        
        set({ 
          token: data.session?.access_token, 
          user: { 
            id: data.user?.id ?? '', 
            name, 
            email 
          }, 
          isAuthenticated: true,
          isDemoMode: false 
        });
        return { success: true };
      },
      
      logout: async () => {
        if (!useAuthStore.getState().isDemoMode) {
          await supabase.auth.signOut();
        }
        set({ token: null, user: null, isAuthenticated: false, isDemoMode: false });
      },
      
      enterDemoMode: () => {
        set({ 
          isDemoMode: true, 
          user: { id: 'demo', name: 'Demo Kullanici', email: 'demo@motorworldinn.de' },
          isAuthenticated: true,
          token: null
        });
      },
      
      exitDemoMode: () => {
        set({ isDemoMode: false });
      },
    }),
    { name: 'motorworld-auth' }
  )
);