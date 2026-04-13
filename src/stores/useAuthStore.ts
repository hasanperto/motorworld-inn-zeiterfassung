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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      
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
          isAuthenticated: true 
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
          isAuthenticated: true 
        });
        return { success: true };
      },
      
      logout: async () => {
        await supabase.auth.signOut();
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    { name: 'motorworld-auth' }
  )
);
