import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Users, 
  Eye,
  Power,
  PowerOff
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  custom_org_id: string | null;
  description: string | null;
  environment: string;
  is_active: boolean;
  max_users: number;
  created_at: string;
  user_count: number;
}

const SuperAdminOrganizations = () => {
  const { superAdmin } = useSuperAdmin();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    custom_org_id: '',
    description: '',
    environment: 'production',
    max_users: 10
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          user_tenants (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orgs = data?.map(org => ({
        ...org,
        user_count: org.user_tenants?.[0]?.count || 0
      })) || [];

      setOrganizations(orgs);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar organizações: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingOrg) {
        const { error } = await supabase
          .from('tenants')
          .update({
            name: formData.name.trim(),
            custom_org_id: formData.custom_org_id.trim() || null,
            description: formData.description.trim() || null,
            environment: formData.environment,
            max_users: formData.max_users,
            super_admin_id: superAdmin?.id
          })
          .eq('id', editingOrg.id);

        if (error) throw error;

        // Log action
        if (superAdmin) {
          await supabase.rpc('log_super_admin_action', {
            _admin_id: superAdmin.id,
            _action: 'update_organization',
            _resource_type: 'organization',
            _resource_id: editingOrg.id,
            _details: { name: formData.name, environment: formData.environment }
          });
        }

        toast({
          title: "Sucesso",
          description: "Organização atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('tenants')
          .insert([{
            name: formData.name.trim(),
            custom_org_id: formData.custom_org_id.trim() || null,
            description: formData.description.trim() || null,
            environment: formData.environment,
            max_users: formData.max_users,
            super_admin_id: superAdmin?.id,
            slug: `org-${Date.now()}`
          }]);

        if (error) throw error;

        // Log action
        if (superAdmin) {
          await supabase.rpc('log_super_admin_action', {
            _admin_id: superAdmin.id,
            _action: 'create_organization',
            _resource_type: 'organization',
            _details: { name: formData.name, environment: formData.environment }
          });
        }

        toast({
          title: "Sucesso",
          description: "Organização criada com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingOrg(null);
      resetForm();
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      custom_org_id: org.custom_org_id || '',
      description: org.description || '',
      environment: org.environment,
      max_users: org.max_users
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a organização "${orgName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', orgId);

      if (error) throw error;

      // Log action
      if (superAdmin) {
        await supabase.rpc('log_super_admin_action', {
          _admin_id: superAdmin.id,
          _action: 'delete_organization',
          _resource_type: 'organization',
          _resource_id: orgId,
          _details: { name: orgName }
        });
      }

      toast({
        title: "Sucesso",
        description: "Organização excluída com sucesso!",
      });
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active: !currentStatus })
        .eq('id', orgId);

      if (error) throw error;

      // Log action
      if (superAdmin) {
        await supabase.rpc('log_super_admin_action', {
          _admin_id: superAdmin.id,
          _action: !currentStatus ? 'activate_organization' : 'deactivate_organization',
          _resource_type: 'organization',
          _resource_id: orgId,
          _details: { previous_status: currentStatus, new_status: !currentStatus }
        });
      }

      toast({
        title: "Sucesso",
        description: `Organização ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`,
      });
      fetchOrganizations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      custom_org_id: '',
      description: '',
      environment: 'production',
      max_users: 10
    });
  };

  const openCreateDialog = () => {
    setEditingOrg(null);
    resetForm();
    setIsDialogOpen(true);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Organizações</h1>
          <p className="text-purple-200 mt-2">
            Gerencie todas as organizações do sistema
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nova Organização
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="border-purple-800/30 bg-black/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{org.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={org.is_active ? "default" : "secondary"}>
                    {org.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <Badge variant="outline" className="text-purple-200">
                    {org.environment}
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-purple-200">
                {org.description || 'Sem descrição'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-300">ID Personalizado:</span>
                  <p className="text-white font-mono">
                    {org.custom_org_id || org.id.slice(0, 8)}
                  </p>
                </div>
                <div>
                  <span className="text-purple-300">Usuários:</span>
                  <p className="text-white">{org.user_count}/{org.max_users}</p>
                </div>
              </div>
              
              <div className="text-sm">
                <span className="text-purple-300">Criada em:</span>
                <p className="text-white">
                  {new Date(org.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-purple-800/30">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-300 hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(org)}
                    className="text-purple-300 hover:text-white"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleStatus(org.id, org.is_active)}
                    className="text-purple-300 hover:text-white"
                  >
                    {org.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(org.id, org.name)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center text-purple-300">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="text-sm">{org.user_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card className="border-purple-800/30 bg-black/50">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-purple-400 mb-4" />
            <CardTitle className="text-white mb-2">Nenhuma organização encontrada</CardTitle>
            <CardDescription className="text-purple-200 mb-4">
              Comece criando sua primeira organização
            </CardDescription>
            <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Organização
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-black/90 border-purple-800/30 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? 'Editar Organização' : 'Nova Organização'}
            </DialogTitle>
            <DialogDescription className="text-purple-200">
              {editingOrg 
                ? 'Altere as informações da organização' 
                : 'Preencha as informações da nova organização'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-purple-200">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome da organização"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-black/30 border-purple-800/50 text-white"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom_org_id" className="text-purple-200">ID Personalizado</Label>
                <Input
                  id="custom_org_id"
                  placeholder="ID único da organização (opcional)"
                  value={formData.custom_org_id}
                  onChange={(e) => setFormData({...formData, custom_org_id: e.target.value})}
                  className="bg-black/30 border-purple-800/50 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-purple-200">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição da organização"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-black/30 border-purple-800/50 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="environment" className="text-purple-200">Ambiente</Label>
                  <Select 
                    value={formData.environment} 
                    onValueChange={(value) => setFormData({...formData, environment: value})}
                  >
                    <SelectTrigger className="bg-black/30 border-purple-800/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Desenvolvimento</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_users" className="text-purple-200">Máx. Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    min="1"
                    value={formData.max_users}
                    onChange={(e) => setFormData({...formData, max_users: parseInt(e.target.value) || 10})}
                    className="bg-black/30 border-purple-800/50 text-white"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-purple-800/50 text-purple-200 hover:bg-purple-800/20"
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                {editingOrg ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminOrganizations;