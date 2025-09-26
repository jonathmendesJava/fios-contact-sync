import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Building, Calendar, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ViewOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
}

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  environment: string;
  custom_org_id: string | null;
  max_users: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  users: Array<{
    user_id: string;
    role: string;
    email: string;
    created_at: string;
  }>;
}

export function ViewOrganizationDialog({ open, onOpenChange, organizationId }: ViewOrganizationDialogProps) {
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && organizationId) {
      fetchOrganizationDetails();
    }
  }, [open, organizationId]);

  const fetchOrganizationDetails = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // Get users in organization
      const { data: usersData, error: usersError } = await supabase
        .from('user_tenants')
        .select(`
          user_id,
          role,
          created_at
        `)
        .eq('tenant_id', organizationId);

      if (usersError) throw usersError;

      // Get user details via edge function
      const { data: authUsers, error: authError } = await supabase.functions.invoke('get-auth-users');
      if (authError) throw authError;

      // Match users with auth data
      const usersWithDetails = (usersData || []).map(userTenant => {
        const authUser = authUsers.users.find((u: any) => u.id === userTenant.user_id);
        return {
          ...userTenant,
          email: authUser?.email || 'Email não encontrado'
        };
      });

      setOrganization({
        ...orgData,
        users: usersWithDetails
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      case 'member': return 'Membro';
      default: return role;
    }
  };

  const getRoleVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'owner': return 'destructive';
      case 'admin': return 'default';
      case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  if (!organization && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Detalhes da Organização
          </DialogTitle>
          <DialogDescription>
            Visualize informações detalhadas e usuários da organização
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : organization ? (
          <div className="space-y-6">
            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{organization.name}</span>
                  <Badge variant={organization.is_active ? "default" : "secondary"}>
                    {organization.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </CardTitle>
                <CardDescription>{organization.slug}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {organization.description && (
                  <div>
                    <h4 className="font-medium mb-1">Descrição</h4>
                    <p className="text-sm text-muted-foreground">{organization.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Ambiente</h4>
                    <Badge variant="outline">{organization.environment}</Badge>
                  </div>
                  
                  {organization.custom_org_id && (
                    <div>
                      <h4 className="font-medium mb-1">ID Personalizado</h4>
                      <p className="text-sm text-muted-foreground">{organization.custom_org_id}</p>
                    </div>
                  )}
                  
                  {organization.max_users && (
                    <div>
                      <h4 className="font-medium mb-1">Máximo de Usuários</h4>
                      <p className="text-sm text-muted-foreground">{organization.max_users}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium mb-1">Criada em</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(organization.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários ({organization.users.length})
                </CardTitle>
                <CardDescription>
                  Usuários com acesso a esta organização
                </CardDescription>
              </CardHeader>
              <CardContent>
                {organization.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum usuário encontrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {organization.users.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Adicionado em {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={getRoleVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}