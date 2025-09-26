import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface OrganizationForm {
  name: string;
  custom_org_id: string;
  description: string;
  environment: string;
  max_users: number;
}

export function CreateOrganizationDialog({ open, onOpenChange, onSuccess }: CreateOrganizationDialogProps) {
  const { superAdmin } = useSuperAdmin();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrganizationForm>({
    name: '',
    custom_org_id: '',
    description: '',
    environment: 'production',
    max_users: 10
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdmin) return;

    setLoading(true);
    try {
      const slug = formData.custom_org_id || `org-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          custom_org_id: formData.custom_org_id || null,
          description: formData.description || null,
          environment: formData.environment,
          max_users: formData.max_users,
          slug: slug,
          super_admin_id: superAdmin.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Log the creation
      await supabase.rpc('log_super_admin_action', {
        _admin_id: superAdmin.id,
        _action: 'create_organization',
        _resource_type: 'organization',
        _resource_id: data.id,
        _details: { 
          name: formData.name,
          environment: formData.environment,
          max_users: formData.max_users
        }
      });

      toast({
        title: "Sucesso",
        description: "Organização criada com sucesso",
      });

      // Reset form
      setFormData({
        name: '',
        custom_org_id: '',
        description: '',
        environment: 'production',
        max_users: 10
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-black/90 border-purple-800/50 text-white">
        <DialogHeader>
          <DialogTitle>Nova Organização</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Organização</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-black/30 border-purple-800/50 text-white"
              placeholder="Ex: Minha Empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom_org_id">ID Personalizado (Opcional)</Label>
            <Input
              id="custom_org_id"
              value={formData.custom_org_id}
              onChange={(e) => setFormData({ ...formData, custom_org_id: e.target.value })}
              className="bg-black/30 border-purple-800/50 text-white"
              placeholder="Ex: minha-empresa-2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-black/30 border-purple-800/50 text-white"
              placeholder="Descrição da organização..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="environment">Ambiente</Label>
              <Select 
                value={formData.environment} 
                onValueChange={(value) => setFormData({ ...formData, environment: value })}
              >
                <SelectTrigger className="bg-black/30 border-purple-800/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-purple-800/50">
                  <SelectItem value="production">Produção</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Desenvolvimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_users">Máx. Usuários</Label>
              <Input
                id="max_users"
                type="number"
                min="1"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 10 })}
                className="bg-black/30 border-purple-800/50 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-purple-800/50 text-purple-200 hover:bg-purple-800/20"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Organização
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};