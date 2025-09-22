import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Send, Users, Globe, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  contact_count: number;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  signature: string | null;
}

interface ContactBundle {
  group_id: string;
  group_name: string;
  contact_id: string;
  name: string;
  email: string | null;
  phone: string;
  signature: string | null;
}

interface SendProgress {
  current: number;
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export const BulkSendView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<SendProgress>({
    current: 0,
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  });

  // Load webhook URL from localStorage
  useEffect(() => {
    const savedWebhookUrl = localStorage.getItem('makecom-webhook-url');
    if (savedWebhookUrl) {
      setWebhookUrl(savedWebhookUrl);
    }
  }, []);

  // Save webhook URL to localStorage when it changes
  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem('makecom-webhook-url', webhookUrl);
    }
  }, [webhookUrl]);

  // Fetch groups with contact count
  const fetchGroups = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (groupsError) throw groupsError;

      // Get contact count for each group
      const groupsWithCount = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .eq('user_id', user.id);

          return {
            ...group,
            contact_count: count || 0
          };
        })
      );

      // Filter groups with at least 1 contact
      const activeGroups = groupsWithCount.filter(group => group.contact_count > 0);
      setGroups(activeGroups);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os grupos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contacts for selected group
  const fetchContacts = async (groupId: string) => {
    if (!user || !groupId) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, signature')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os contatos.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchContacts(selectedGroupId);
    } else {
      setContacts([]);
    }
  }, [selectedGroupId]);

  // Validate webhook URL
  const isValidWebhookUrl = (url: string) => {
    try {
      new URL(url);
      return url.includes('make.com') || url.includes('integromat.com') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // Prepare bundle for individual contact
  const getContactBundle = (contact: Contact): ContactBundle | null => {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return null;

    return {
      group_id: selectedGroup.id,
      group_name: selectedGroup.name,
      contact_id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      signature: contact.signature
    };
  };

  // Get sample bundle for preview
  const getSampleBundle = (): ContactBundle | null => {
    if (contacts.length === 0) return null;
    return getContactBundle(contacts[0]);
  };

  // Send individual bundles to Make.com webhook
  const handleSend = async () => {
    if (!webhookUrl || contacts.length === 0) return;

    setIsSending(true);
    setSendProgress({
      current: 0,
      total: contacts.length,
      success: 0,
      failed: 0,
      errors: []
    });

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return;

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const bundle = getContactBundle(contact);
        
        if (!bundle) continue;

        setSendProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'no-cors',
            body: JSON.stringify(bundle),
          });

          successCount++;
          setSendProgress(prev => ({ ...prev, success: successCount }));
          
          // Small delay between requests to avoid overwhelming the webhook
          if (i < contacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          failedCount++;
          const errorMsg = `${contact.name}: Falha no envio`;
          errors.push(errorMsg);
          setSendProgress(prev => ({ 
            ...prev, 
            failed: failedCount,
            errors: [...prev.errors, errorMsg]
          }));
        }
      }

      // Show final result
      if (failedCount === 0) {
        toast({
          title: "Enviado com sucesso!",
          description: `Todos os ${successCount} contatos do grupo "${selectedGroup.name}" foram enviados para Make.com.`,
        });
      } else if (successCount > 0) {
        toast({
          title: "Envio parcialmente concluído",
          description: `${successCount} contatos enviados com sucesso, ${failedCount} falharam.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Falha no envio",
          description: "Nenhum contato foi enviado com sucesso. Verifique a URL do webhook.",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erro geral no envio:', error);
      toast({
        title: "Erro no envio",
        description: "Ocorreu um erro durante o processo de envio.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Copy sample bundle to clipboard
  const copySampleBundle = () => {
    const sampleBundle = getSampleBundle();
    if (sampleBundle) {
      navigator.clipboard.writeText(JSON.stringify(sampleBundle, null, 2));
      toast({
        title: "Copiado!",
        description: "Estrutura de bundle copiada para a área de transferência.",
      });
    }
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const sampleBundle = getSampleBundle();
  const canSend = selectedGroupId && contacts.length > 0 && isValidWebhookUrl(webhookUrl);
  const isProcessing = isSending && sendProgress.current > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Send className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Envio em Massa</h2>
          <p className="text-muted-foreground">
            Selecione um grupo e envie os contatos para Make.com
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Group Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Selecionar Grupo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Grupo de Contatos</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um grupo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.contact_count} contatos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedGroup && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedGroup.contact_count} contatos selecionados
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configurar Webhook Make.com
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>URL do Webhook</Label>
                <Input
                  type="url"
                  placeholder="https://hook.integromat.com/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                {webhookUrl && !isValidWebhookUrl(webhookUrl) && (
                  <p className="text-sm text-destructive mt-1">
                    URL inválida. Use uma URL HTTPS válida do Make.com
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Display */}
          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Progresso do Envio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Enviando contatos...</span>
                    <span>{sendProgress.current} de {sendProgress.total}</span>
                  </div>
                  <Progress value={(sendProgress.current / sendProgress.total) * 100} />
                </div>
                
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{sendProgress.success} enviados</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{sendProgress.failed} falharam</span>
                  </div>
                </div>

                {sendProgress.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Erros:</p>
                    <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                      {sendProgress.errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Send Button */}
          <Card>
            <CardContent className="pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    disabled={!canSend || isSending} 
                    className="w-full"
                    size="lg"
                  >
                    {isSending ? 'Enviando...' : `Enviar ${contacts.length} Bundles`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Envio Individual</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a enviar <strong>{contacts.length} bundles individuais</strong> do grupo{' '}
                      <strong>"{selectedGroup?.name}"</strong> para Make.com.
                      <br /><br />
                      Cada contato será enviado como um bundle separado, gerando {contacts.length} requisições individuais.
                      <br /><br />
                      Esta ação irá disparar seu workflow no Make.com {contacts.length} vezes. Tem certeza?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSend}>
                      Confirmar Envio
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          {/* Contacts Preview */}
          {contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Contatos a Serem Enviados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{contact.phone}</TableCell>
                          <TableCell>{contact.email || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bundle Preview */}
          {sampleBundle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Estrutura do Bundle Individual
                  <Button variant="outline" size="sm" onClick={copySampleBundle}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Importante:</strong> Cada contato será enviado como um bundle separado.</p>
                  <p>Total de requisições: <strong>{contacts.length}</strong></p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Exemplo de bundle (primeiro contato):</p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(sampleBundle, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};