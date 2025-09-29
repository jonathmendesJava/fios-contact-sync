import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface MetaConnection {
  id: string;
  user_id: string;
  business_id: string;
  business_name: string | null;
  waba_id: string;
  waba_name: string | null;
  phone_number_id: string;
  phone_number: string | null;
  access_token: string;
  token_type: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useMetaConnection = () => {
  const { user } = useAuth();
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConnection(null);
      setLoading(false);
      return;
    }

    fetchConnection();
  }, [user]);

  const fetchConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error('Error fetching meta connection:', error);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    connection,
    loading,
    refetch: fetchConnection,
    isConnected: !!connection,
  };
};
