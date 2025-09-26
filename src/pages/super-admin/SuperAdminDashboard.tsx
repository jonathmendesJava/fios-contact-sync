import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building, Users, Activity, Eye, Edit, Trash } from 'lucide-react';
import { CreateOrganizationDialog } from '@/components/dialogs/CreateOrganizationDialog';
import { CreateUserDialog } from '@/components/dialogs/CreateUserDialog';  
import { ViewOrganizationDialog } from '@/components/dialogs/ViewOrganizationDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface Organization {
  id: string;
  name: string;
  custom_org_id: string | null;
  environment: string;
  is_active: boolean;
  max_users: number;
  created_at: string;
}

const SuperAdminDashboard = () => {
  const { superAdmin } = useSuperAdmin();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState({ totalOrgs: 0, activeOrgs: 0, totalUsers: 0, activeUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [viewOrgOpen, setViewOrgOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: orgsData, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrganizations(orgsData || []);
      setStats({
        totalOrgs: orgsData?.length || 0,
        activeOrgs: orgsData?.filter(org => org.is_active).length || 0,
        totalUsers: 0,
        activeUsers: 0
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Painel administrativo</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCreateUserOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
            <Button onClick={() => setCreateOrgOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Organização
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><div className="text-2xl font-bold">{stats.totalOrgs}</div><p className="text-sm text-muted-foreground">Total Organizações</p></CardContent></Card>
          <Card><CardContent className="p-6"><div className="text-2xl font-bold">{stats.activeOrgs}</div><p className="text-sm text-muted-foreground">Organizações Ativas</p></CardContent></Card>
          <Card><CardContent className="p-6"><div className="text-2xl font-bold">{stats.totalUsers}</div><p className="text-sm text-muted-foreground">Total Usuários</p></CardContent></Card>
          <Card><CardContent className="p-6"><div className="text-2xl font-bold">{stats.activeUsers}</div><p className="text-sm text-muted-foreground">Usuários Ativos</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Organizações</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizations.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h3 className="font-semibold">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">{org.environment}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedOrgId(org.id); setViewOrgOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <CreateOrganizationDialog open={createOrgOpen} onOpenChange={setCreateOrgOpen} onSuccess={fetchData} />
        <CreateUserDialog open={createUserOpen} onOpenChange={setCreateUserOpen} onSuccess={fetchData} />
        <ViewOrganizationDialog open={viewOrgOpen} onOpenChange={setViewOrgOpen} organizationId={selectedOrgId} />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;