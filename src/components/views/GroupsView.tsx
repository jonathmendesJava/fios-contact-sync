import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { GroupCard } from '@/components/ui/group-card';
import { AddContactToGroupDialog } from '@/components/dialogs/AddContactToGroupDialog';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface Group {
  id: string;
  name: string;
  created_at: string;
  contacts_count?: number;
  duplicates_count?: number;
  last_updated?: string;
}

interface ImportResult {
  total: number;
  inserted: number;
  duplicates: number;
  errors: string[];
}

export const GroupsView: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  
  // Add Contact Dialog state
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [selectedGroupForContacts, setSelectedGroupForContacts] = useState<{ id: string; name: string } | null>(null);
  
  // CSV Import state
  const [csvData, setCsvData] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      // Fetch groups with contact count and duplicate information
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select(`
          *,
          contacts (count)
        `);

      if (groupsError) throw groupsError;

      // For each group, also fetch duplicate counts
      const groupsWithStats = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get duplicate contacts count for this group
          const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .select('phone, email')
            .eq('group_id', group.id);

          if (contactsError) {
            console.error('Error fetching contacts for duplicates:', contactsError);
            return {
              ...group,
              contacts_count: group.contacts?.[0]?.count || 0,
              duplicates_count: 0
            };
          }

          // Detect duplicates
          const phoneMap = new Map<string, number>();
          const emailMap = new Map<string, number>();
          let duplicateCount = 0;

          contacts?.forEach(contact => {
            if (contact.phone) {
              const phone = contact.phone.replace(/\D/g, '');
              phoneMap.set(phone, (phoneMap.get(phone) || 0) + 1);
            }
            if (contact.email) {
              const email = contact.email.toLowerCase();
              emailMap.set(email, (emailMap.get(email) || 0) + 1);
            }
          });

          // Count duplicate contacts
          contacts?.forEach(contact => {
            const phone = contact.phone?.replace(/\D/g, '');
            const email = contact.email?.toLowerCase();
            
            const isPhoneDuplicate = phone && phoneMap.get(phone)! > 1;
            const isEmailDuplicate = email && emailMap.get(email)! > 1;
            
            if (isPhoneDuplicate || isEmailDuplicate) {
              duplicateCount++;
            }
          });

          return {
            ...group,
            contacts_count: group.contacts?.[0]?.count || 0,
            duplicates_count: duplicateCount,
            last_updated: group.updated_at
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar grupos: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from('contact_groups')
          .update({ name: groupName.trim() })
          .eq('id', editingGroup.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Grupo atualizado com sucesso!',
        });
      } else {
        const { error } = await supabase
          .from('contact_groups')
          .insert([{ 
            name: groupName.trim(), 
            user_id: (await supabase.auth.getUser()).data.user!.id,
            tenant_id: '00000000-0000-0000-0000-000000000000' // Default value since tenant system was removed
          }]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Grupo criado com sucesso!',
        });
      }

      setIsDialogOpen(false);
      setEditingGroup(null);
      setGroupName('');
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setIsDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo? Todos os contatos do grupo serão excluídos também.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Grupo excluído com sucesso!',
      });
      fetchGroups();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = () => {
    setEditingGroup(null);
    setGroupName('');
    setIsDialogOpen(true);
  };

  const handleAddContact = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroupForContacts({ id: group.id, name: group.name });
      setIsAddContactDialogOpen(true);
    }
  };

  const handleContactAdded = () => {
    fetchGroups(); // Refresh group stats
  };

  // CSV Import functions
  const parseGroupsCSV = (csvText: string): string[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de cabeçalho e uma de dados');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const groupNames: string[] = [];

    // Find the name column
    const nameIndex = headers.findIndex(h => 
      h.includes('nome') || h.includes('name') || h.includes('grupo') || h.includes('group')
    );

    if (nameIndex === -1) {
      throw new Error('CSV deve conter uma coluna "nome", "name", "grupo" ou "group"');
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
      
      if (values[nameIndex] && values[nameIndex].trim()) {
        groupNames.push(values[nameIndex].trim());
      }
    }

    return groupNames;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um arquivo CSV válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseGroupsCSV(text);
      setCsvData(parsed);
      setResult(null);

      toast({
        title: 'CSV Carregado',
        description: `${parsed.length} grupos encontrados no arquivo.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro no CSV',
        description: error.message,
        variant: 'destructive',
      });
      setCsvData([]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importGroups = async () => {
    if (csvData.length === 0) return;

    setImporting(true);
    setProgress(0);
    
    const importResult: ImportResult = {
      total: csvData.length,
      inserted: 0,
      duplicates: 0,
      errors: []
    };

    try {
      const userId = (await supabase.auth.getUser()).data.user!.id;

      for (let i = 0; i < csvData.length; i++) {
        const groupName = csvData[i];
        
        try {
          // Check for duplicates
          const { data: existing, error: checkError } = await supabase
            .from('contact_groups')
            .select('id')
            .eq('name', groupName)
            .eq('user_id', userId)
            .maybeSingle();

          if (checkError) throw checkError;

          if (existing) {
            importResult.duplicates++;
          } else {
            // Insert new group
            const { error: insertError } = await supabase
              .from('contact_groups')
              .insert([{
                name: groupName,
                user_id: userId,
                tenant_id: '00000000-0000-0000-0000-000000000000' // Default value since tenant system was removed
              }]);

            if (insertError) throw insertError;
            importResult.inserted++;
          }
        } catch (error: any) {
          importResult.errors.push(`Grupo "${groupName}": ${error.message}`);
        }

        setProgress(Math.round(((i + 1) / csvData.length) * 100));
      }

      setResult(importResult);
      
      if (importResult.inserted > 0) {
        toast({
          title: 'Importação Concluída',
          description: `${importResult.inserted} grupos importados com sucesso!`,
        });
        fetchGroups();
      }

    } catch (error: any) {
      toast({
        title: 'Erro na Importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setCsvData([]);
    }
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
          <p className="text-muted-foreground">Crie e gerencie grupos manualmente ou via CSV</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      {/* Creation Options */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Grupos</CardTitle>
          <CardDescription>
            Escolha como deseja criar seus grupos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="csv">Via CSV</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Criação Manual</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Crie grupos individualmente digitando o nome
              </p>
              <Button onClick={openCreateDialog} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Grupo
              </Button>
            </TabsContent>
            
            <TabsContent value="csv" className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">Importação via CSV</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Importe múltiplos grupos de uma vez usando um arquivo CSV
              </p>
              
              {/* CSV Instructions */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Formato do arquivo:</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  O CSV deve conter uma coluna com os nomes dos grupos:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• <strong>nome</strong>, <strong>name</strong>, <strong>grupo</strong> ou <strong>group</strong></li>
                </ul>
                <div className="bg-card p-3 rounded mt-3">
                  <p className="text-sm font-medium">Exemplo:</p>
                  <code className="text-xs">nome</code><br />
                  <code className="text-xs">Clientes VIP</code><br />
                  <code className="text-xs">Leads</code><br />
                  <code className="text-xs">Fornecedores</code>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="groups-csv-upload"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    disabled={importing}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo CSV
                  </Button>
                </div>

                {csvData.length > 0 && (
                  <div className="p-4 bg-accent rounded-lg">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="font-medium">Arquivo carregado com sucesso!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {csvData.length} grupos prontos para importação
                    </p>
                    <div className="mt-3 max-h-32 overflow-y-auto">
                      <p className="text-sm font-medium mb-1">Grupos encontrados:</p>
                      {csvData.slice(0, 10).map((name, index) => (
                        <span key={index} className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded mr-1 mb-1">
                          {name}
                        </span>
                      ))}
                      {csvData.length > 10 && (
                        <span className="text-xs text-muted-foreground">
                          ... e mais {csvData.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {csvData.length > 0 && (
                  <Button 
                    onClick={importGroups} 
                    disabled={importing}
                    className="w-full"
                  >
                    {importing ? 'Importando...' : 'Importar Grupos'}
                  </Button>
                )}
              </div>

              {/* Progress */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando grupos...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Results */}
              {result && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    <span className="font-medium">Resultado da Importação</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                      <div className="text-sm text-muted-foreground">Criados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{result.duplicates}</div>
                      <div className="text-sm text-muted-foreground">Duplicados</div>
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-destructive mb-2">Erros encontrados:</h4>
                      <div className="bg-destructive/10 p-3 rounded-lg">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <p key={index} className="text-sm text-destructive">{error}</p>
                        ))}
                        {result.errors.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            ... e mais {result.errors.length - 5} erros
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Groups List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Seus Grupos ({groups.length})
        </h3>
        
        {groups.length === 0 ? (
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddContact={handleAddContact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manual Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? 'Altere o nome do grupo' 
                : 'Digite o nome do novo grupo de contatos'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManualSubmit}>
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
                {editingGroup ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      {selectedGroupForContacts && (
        <AddContactToGroupDialog
          isOpen={isAddContactDialogOpen}
          onClose={() => {
            setIsAddContactDialogOpen(false);
            setSelectedGroupForContacts(null);
          }}
          groupId={selectedGroupForContacts.id}
          groupName={selectedGroupForContacts.name}
          onContactAdded={handleContactAdded}
        />
      )}
    </div>
  );
};