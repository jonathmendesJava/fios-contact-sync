import React, { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const { user } = useAuth();
  const { refreshTenants } = useTenant();
  const { toast } = useToast();

  const createTenant = async () => {
    if (!user || !tenantName.trim()) return;

    setLoading(true);
    try {
      // Create the tenant
      const slug = tenantName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() + '-' + Date.now();

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: tenantName.trim(),
          slug: slug
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Add user as owner
      const { error: userTenantError } = await supabase
        .from('user_tenants')
        .insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role: 'owner'
        });

      if (userTenantError) throw userTenantError;

      toast({
        title: "Organização criada",
        description: `${tenantName} foi criada com sucesso.`,
      });

      await refreshTenants();
      setOpen(false);
      setTenantName('');
    } catch (error: any) {
      toast({
        title: "Erro ao criar organização",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Organização
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Criar Nova Organização</span>
          </DialogTitle>
          <DialogDescription>
            Crie uma nova organização para gerenciar seus contatos separadamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Nome da Organização</Label>
            <Input
              id="tenant-name"
              placeholder="Ex: Minha Empresa"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading && tenantName.trim()) {
                  createTenant();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={createTenant} 
            disabled={loading || !tenantName.trim()}
          >
            {loading ? "Criando..." : "Criar Organização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}