import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { 
  Building2, 
  Users, 
  Activity, 
  AlertTriangle,
  Plus,
  Settings,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  recentActivity: number;
}

interface Organization {
  id: string;
  name: string;
  custom_org_id: string | null;
  environment: string;
  is_active: boolean;
  max_users: number;
  created_at: string;
  user_count: number;
}

const SuperAdminDashboard = () => {
  const { superAdmin } = useSuperAdmin();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    recentActivity: 0
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch organizations with user counts
      const { data: orgsData, error: orgsError } = await supabase
        .from('tenants')
        .select(`
          *,
          user_tenants (count)
        `)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      const organizations = orgsData?.map(org => ({
        ...org,
        user_count: org.user_tenants?.[0]?.count || 0
      })) || [];

      setOrganizations(organizations);

      // Calculate stats
      const totalOrgs = organizations.length;
      const activeOrgs = organizations.filter(org => org.is_active).length;
      const totalUsers = organizations.reduce((sum, org) => sum + org.user_count, 0);

      setStats({
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalUsers,
        recentActivity: 0 // Placeholder for now
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganizationStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: !currentStatus })
        .eq('id', orgId);

      if (error) throw error;

      // Log the action
      if (superAdmin) {
        await supabase.rpc('log_super_admin_action', {
          _admin_id: superAdmin.id,
          _action: currentStatus ? 'deactivate_organization' : 'activate_organization',
          _resource_type: 'organization',
          _resource_id: orgId,
          _details: { previous_status: currentStatus, new_status: !currentStatus }
        });
      }

      toast({
        title: "Sucesso",
        description: `Organização ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`,
      });

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="border-b border-purple-800/30 pb-6">
        <h1 className="text-3xl font-bold text-white">
          Bem-vindo, {superAdmin?.full_name}
        </h1>
        <p className="text-purple-200 mt-2">
          Console de administração do sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Total de Organizações
            </CardTitle>
            <Building2 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalOrganizations}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Organizações Ativas
            </CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeOrganizations}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Atividade Recente
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.recentActivity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card className="border-purple-800/30 bg-black/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Organizações</CardTitle>
              <CardDescription className="text-purple-200">
                Gerencie todas as organizações do sistema
              </CardDescription>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nova Organização
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 rounded-lg border border-purple-800/30 bg-black/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{org.name}</h3>
                    <Badge 
                      variant={org.is_active ? "default" : "secondary"}
                      className={org.is_active ? "bg-green-600" : "bg-gray-600"}
                    >
                      {org.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                    <Badge variant="outline" className="text-purple-200">
                      {org.environment}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-purple-200">
                    <span>ID: {org.custom_org_id || org.id.slice(0, 8)}</span>
                    <span>Usuários: {org.user_count}/{org.max_users}</span>
                    <span>Criada: {new Date(org.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-purple-300 hover:text-white">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-purple-300 hover:text-white">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-purple-300 hover:text-white"
                    onClick={() => toggleOrganizationStatus(org.id, org.is_active)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {organizations.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Nenhuma organização encontrada</h3>
                <p className="text-purple-200 mb-4">
                  Comece criando sua primeira organização
                </p>
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Organização
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;