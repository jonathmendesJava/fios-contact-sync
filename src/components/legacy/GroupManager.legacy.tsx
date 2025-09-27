import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
// Removed tenant dependency
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Group {
  id: string;
  name: string;
  created_at: string;
  contacts_count?: number;
}

export const GroupManager = () => {
  // Removed tenant dependency
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      // Fetch groups with contact count
      const { data: groupsData, error: groupsError } = await supabase
        .from("contact_groups")
        .select(`
          *,
          contacts (count)
        `);

      if (groupsError) throw groupsError;

      const groupsWithCount = groupsData?.map(group => ({
        ...group,
        contacts_count: group.contacts?.[0]?.count || 0
      })) || [];

      setGroups(groupsWithCount);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar grupos: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("contact_groups")
          .update({ name: groupName.trim() })
          .eq("id", editingGroup.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Grupo atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("contact_groups")
          .insert([{ 
            name: groupName.trim(), 
            user_id: (await supabase.auth.getUser()).data.user!.id
          }]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Grupo criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingGroup(null);
      setGroupName("");
      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setIsDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo? Todos os contatos do grupo serão excluídos também.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("contact_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Grupo excluído com sucesso!",
      });
      fetchGroups();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = () => {
    setEditingGroup(null);
    setGroupName("");
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Grupos de Contatos</h2>
          <p className="text-muted-foreground">Gerencie seus grupos de contatos</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(group)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                {group.contacts_count || 0} contatos
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Criado em {new Date(group.created_at).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Nenhum grupo encontrado</CardTitle>
            <CardDescription className="mb-4">
              Crie seu primeiro grupo para organizar seus contatos
            </CardDescription>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Editar Grupo" : "Novo Grupo"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Altere o nome do grupo" 
                : "Digite o nome do novo grupo de contatos"
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="py-4">
              <Input
                placeholder="Nome do grupo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingGroup ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};