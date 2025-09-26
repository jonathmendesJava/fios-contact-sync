import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdmin {
  id: string;
  username: string;
  full_name: string;
  email: string;
}

interface AuthResponse {
  success: boolean;
  admin?: SuperAdmin;
  error?: string;
}

interface SuperAdminContextType {
  superAdmin: SuperAdmin | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored super admin session
    const storedAdmin = localStorage.getItem('superAdmin');
    if (storedAdmin) {
      try {
        setSuperAdmin(JSON.parse(storedAdmin));
      } catch (error) {
        localStorage.removeItem('superAdmin');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('authenticate_super_admin', {
        _username: username,
        _password: password
      });

      if (error) throw error;

      const authResponse = data as unknown as AuthResponse;

      if (authResponse.success && authResponse.admin) {
        const adminData = authResponse.admin;
        setSuperAdmin(adminData);
        localStorage.setItem('superAdmin', JSON.stringify(adminData));
        
        // Log the action
        await supabase.rpc('log_super_admin_action', {
          _admin_id: adminData.id,
          _action: 'login',
          _resource_type: 'auth',
          _details: { timestamp: new Date().toISOString() }
        });

        return { success: true };
      } else {
        return { success: false, error: authResponse.error || 'Credenciais inválidas' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signOut = () => {
    if (superAdmin) {
      // Log the logout action
      supabase.rpc('log_super_admin_action', {
        _admin_id: superAdmin.id,
        _action: 'logout',
        _resource_type: 'auth',
        _details: { timestamp: new Date().toISOString() }
      });
    }
    
    setSuperAdmin(null);
    localStorage.removeItem('superAdmin');
  };

  const value = {
    superAdmin,
    loading,
    signIn,
    signOut
  };

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin() {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
}