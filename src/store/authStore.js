import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      company: null,
      
      login: (userData, token) => {
        set({ 
          user: userData, 
          token,
          company: userData.company 
        });
      },
      
      logout: () => {
        set({ user: null, token: null, company: null });
      },
      
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },
      
      isAuthenticated: () => {
        return !!get().token;
      },
      
      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        
        if (role === 'superadmin') return user.role === 'superadmin';
        if (role === 'admin') return ['admin', 'superadmin'].includes(user.role);
        return true; // Any authenticated user
      },

      getUserCompanyId: () => {
        const user = get().user;
        return user?.company_id;
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);