import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LinkIcon, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { MetaConnection } from '@/hooks/useMetaConnection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MetaConnectionCardProps {
  connection: MetaConnection | null;
  onConnectionUpdate: () => void;
}

export const MetaConnectionCard: React.FC<MetaConnectionCardProps> = ({
  connection,
  onConnectionUpdate,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado para conectar ao Meta.',
        variant: 'destructive',
      });
      return;
    }

    const clientId = '1123306973217251';
    const redirectUri = 'https://kdwxmroxfbhmwxkyniph.supabase.co/functions/v1/meta-oauth-callback';
    const scope = 'business_management,whatsapp_business_management,whatsapp_business_messaging';
    const state = user.id;
    
    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('meta_connections')
        .update({ is_active: false })
        .eq('id', connection.id);

      if (error) throw error;

      toast({
        title: 'Desconectado',
        description: 'Conexão com Meta foi desativada.',
      });
      
      onConnectionUpdate();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desconectar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!connection) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://kdwxmroxfbhmwxkyniph.supabase.co/functions/v1/meta-token-refresh',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to refresh token');

      toast({
        title: 'Token atualizado',
        description: 'Token de acesso foi renovado com sucesso.',
      });
      
      onConnectionUpdate();
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível renovar o token.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Não conectado ao Meta
          </CardTitle>
          <CardDescription>
            Conecte sua conta Meta para gerenciar templates do WhatsApp Business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            <LinkIcon className="h-4 w-4 mr-2" />
            Conectar com Meta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Conectado ao Meta
        </CardTitle>
        <CardDescription>
          Sua conta está conectada e pronta para uso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Business</p>
            <p className="font-medium">{connection.business_name || connection.business_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">WABA</p>
            <p className="font-medium">{connection.waba_name || connection.waba_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            <p className="font-medium">{connection.phone_number || connection.phone_number_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={connection.is_active ? 'default' : 'secondary'}>
              {connection.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshToken}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Renovar Token
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDisconnect}
            disabled={loading}
          >
            Desconectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
