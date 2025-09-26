import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: Tenant[];
  loading: boolean;
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  const fetchUserTenants = async () => {
    if (!user) {
      setUserTenants([]);
      setCurrentTenant(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_tenants')
        .select(`
          role,
          tenant:tenants (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const tenants = data?.map(item => ({
        id: item.tenant.id,
        name: item.tenant.name,
        slug: item.tenant.slug,
        role: item.role as 'owner' | 'admin' | 'member'
      })) || [];

      setUserTenants(tenants);

      // Set current tenant from localStorage or first available tenant
      const savedTenantId = localStorage.getItem('currentTenantId');
      const savedTenant = tenants.find(t => t.id === savedTenantId);
      
      if (savedTenant) {
        setCurrentTenant(savedTenant);
      } else if (tenants.length > 0) {
        setCurrentTenant(tenants[0]);
        localStorage.setItem('currentTenantId', tenants[0].id);
      }
    } catch (error) {
      console.error('Error fetching user tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = (tenantId: string) => {
    const tenant = userTenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      localStorage.setItem('currentTenantId', tenantId);
    }
  };

  const refreshTenants = async () => {
    setLoading(true);
    await fetchUserTenants();
  };

  useEffect(() => {
    if (session) {
      fetchUserTenants();
    } else {
      setUserTenants([]);
      setCurrentTenant(null);
      setLoading(false);
    }
  }, [session, user]);

  const value = {
    currentTenant,
    userTenants,
    loading,
    switchTenant,
    refreshTenants
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}