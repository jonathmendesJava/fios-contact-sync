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

interface MakeBundle {
  contact_id: string;
  name: string;
  email: string | null;
  phone: string;
  signature: string | null;
  group_id: string;
  group_name: string;
  total_contacts: number;
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

  // Create bundles for Make.com (top-level array)
  const getMakeBundles = (group: Group, contactList: Contact[]): MakeBundle[] => {
    return contactList.map((contact) => ({
      contact_id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      signature: contact.signature,
      group_id: group.id,
      group_name: group.name,
      total_contacts: contactList.length,
    }));
  };

  // Get sample payload for preview (top-level array)
  const getSamplePayload = (): MakeBundle[] | null => {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup || contacts.length === 0) return null;

    return getMakeBundles(selectedGroup, contacts.slice(0, 2)); // Show first 2 contacts as example
  };

  // Send bulk payload to Make.com webhook
  const handleSend = async () => {
    if (!webhookUrl || contacts.length === 0) return;

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (!selectedGroup) return;

    setIsSending(true);

    try {
      const makeArray = getMakeBundles(selectedGroup, contacts);
      let success = false;

      // Abordagem híbrida: primeiro tenta sem no-cors (para JSON nativo)
      try {
        console.log('Tentativa 1: Enviando sem no-cors (JSON nativo)');
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(makeArray),
        });
        
        if (response.ok || response.type === 'opaque') {
          success = true;
          console.log('Sucesso: Requisição enviada sem no-cors');
        }
      } catch (corsError) {
        console.log('CORS bloqueou, tentando com no-cors...', corsError);
        
        // Fallback: usa no-cors (garante que chega ao Make.com)
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'no-cors',
            body: JSON.stringify(makeArray),
          });
          success = true;
          console.log('Sucesso: Requisição enviada com no-cors (modo compatibilidade)');
        } catch (finalError) {
          console.error('Erro final no envio:', finalError);
          throw finalError;
        }
      }

      if (success) {
        toast({
          title: "Enviado com sucesso!",
          description: `Grupo "${selectedGroup.name}" com ${contacts.length} contatos enviado para Make.com.`,
        });
      }

    } catch (error) {
      console.error('Erro no envio:', error);
      toast({
        title: "Erro no envio",
        description: "Não foi possível enviar os dados. Verifique a URL do webhook.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Copy sample payload to clipboard
  const copySamplePayload = () => {
    const samplePayload = getSamplePayload();
    if (samplePayload) {
      navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
      toast({
        title: "Copiado!",
        description: "Estrutura de payload copiada para a área de transferência.",
      });
    }
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const samplePayload = getSamplePayload();
  const canSend = selectedGroupId && contacts.length > 0 && isValidWebhookUrl(webhookUrl);

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
                    {isSending ? 'Enviando...' : `Enviar Grupo Completo`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Envio do Grupo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a enviar o grupo <strong>"{selectedGroup?.name}"</strong> com{' '}
                      <strong>{contacts.length} contatos</strong> para Make.com.
                      <br /><br />
                      Os contatos serão enviados como um <strong>array top-level</strong>, onde cada contato (com dados do grupo) será automaticamente um bundle separado no Make.com.
                      <br /><br />
                      Esta ação irá disparar seu workflow no Make.com 1 vez com {contacts.length} bundles individuais contendo dados completos (contato + grupo). Tem certeza?
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

          {/* Payload Preview */}
          {samplePayload && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Estrutura do Array JSON (Top-Level)
                  <Button variant="outline" size="sm" onClick={copySamplePayload}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p className="text-muted-foreground mb-3">
                    Array JSON com dados completos (contato + grupo) será enviado para Make.com (cada item = 1 bundle):
                  </p>
                  <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                    <code>{JSON.stringify(samplePayload, null, 2)}</code>
                  </pre>
                  <p className="text-muted-foreground mt-3">
                    <strong>1 requisição</strong> → <strong>{contacts.length} bundles individuais</strong> no Make.com
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};