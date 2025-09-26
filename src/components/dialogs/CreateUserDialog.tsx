import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface UserForm {
  email: string;
  password: string;
  confirmPassword: string;
  organizationIds: string[];
  role: 'owner' | 'admin' | 'member';
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [formData, setFormData] = useState<UserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    organizationIds: [],
    role: 'member'
  });
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  const fetchOrganizations = async () => {
    setLoadingOrganizations(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar organizações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.email.trim()) {
      toast({
        title: "Erro de validação",
        description: "Email é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Erro de validação", 
        description: "Senha deve ter no mínimo 8 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro de validação",
        description: "Senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (formData.organizationIds.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Selecione pelo menos uma organização",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-organization-user', {
        body: {
          email: formData.email.trim(),
          password: formData.password,
          organizationIds: formData.organizationIds,
          role: formData.role
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Usuário ${formData.email} criado e adicionado às organizações selecionadas.`
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        organizationIds: [],
        role: 'member'
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationToggle = (orgId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        organizationIds: [...prev.organizationIds, orgId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        organizationIds: prev.organizationIds.filter(id => id !== orgId)
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Criar usuário e associar a organizações. O usuário poderá acessar o dashboard principal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirme a senha"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Papel do Usuário</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'owner' | 'admin' | 'member') => 
                setFormData(prev => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="owner">Proprietário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Organizações *</Label>
            {loadingOrganizations ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                {organizations.map((org) => (
                  <div key={org.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={org.id}
                      checked={formData.organizationIds.includes(org.id)}
                      onCheckedChange={(checked) => 
                        handleOrganizationToggle(org.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={org.id} 
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {org.name}
                    </Label>
                  </div>
                ))}
                {organizations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma organização encontrada
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}