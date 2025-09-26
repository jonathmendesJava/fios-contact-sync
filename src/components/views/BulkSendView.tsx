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
import { Send, Users, Globe, Copy, CheckCircle, XCircle, Clock, Bug, Zap, Eye, EyeOff } from 'lucide-react';

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
  signature: number;
}

interface MakeBundle {
  contact_id: string;
  name: string;
  email: string | null;
  phone: string;
  signature: number;
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
  const [isTesting, setIsTesting] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

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

  // Add debug log entry
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  // Clear debug log
  const clearDebugLog = () => {
    setDebugLog([]);
  };

  // Enhanced webhook URL validation
  const isValidWebhookUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const isMakeDomain = url.includes('make.com') || url.includes('integromat.com');
      const hasHookPath = url.includes('/hook/') || url.includes('/webhook/');
      
      return isHttps && (isMakeDomain || hasHookPath);
    } catch {
      return false;
    }
  };

  // Test webhook connectivity
  const testWebhook = async () => {
    if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
      toast({
        title: "URL inválida",
        description: "Digite uma URL válida do Make.com antes de testar.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    addDebugLog("Iniciando teste de conectividade...");

    try {
      const testPayload = [{
        test: true,
        timestamp: new Date().toISOString(),
        message: "Teste de conectividade do webhook"
      }];

      addDebugLog(`Enviando payload de teste: ${JSON.stringify(testPayload)}`);
      
      const { data, error } = await supabase.functions.invoke('send-to-make', {
        body: {
          webhookUrl,
          contacts: testPayload
        }
      });

      if (error) {
        addDebugLog(`Erro na Edge Function: ${error.message}`);
        throw new Error(error.message);
      }

      addDebugLog(`Resposta da Edge Function: ${JSON.stringify(data)}`);
      
      if (data?.success || data?.partial_success) {
        const message = data.success ? "✅ Teste enviado com sucesso via Edge Function" : "⚠️ Teste parcialmente enviado";
        addDebugLog(message);
        
        if (data.stats) {
          addDebugLog(`📊 Estatísticas: ${data.stats.sent}/${data.stats.total} enviados`);
        }
        
        toast({
          title: data.success ? "Teste enviado!" : "Teste parcialmente enviado",
          description: data.message || "Verifique seu scenario no Make.com para confirmar o recebimento.",
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido na Edge Function');
      }
      
    } catch (error) {
      addDebugLog(`Erro no teste: ${error}`);
      toast({
        title: "Erro no teste",
        description: "Não foi possível conectar ao webhook. Verifique a URL.",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
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
    clearDebugLog();
    addDebugLog("=== INICIANDO ENVIO ===");

    try {
      const makeArray = getMakeBundles(selectedGroup, contacts);
      addDebugLog(`Preparado array com ${makeArray.length} contatos`);
      addDebugLog(`URL destino: ${webhookUrl}`);
      addDebugLog(`Tamanho do payload: ${JSON.stringify(makeArray).length} caracteres`);

      if (debugMode) {
        addDebugLog(`Payload completo: ${JSON.stringify(makeArray, null, 2)}`);
      }

      // Enviar via Edge Function com fan-out
      addDebugLog("Enviando via Supabase Edge Function (fan-out)...");
      
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('send-to-make', {
        body: {
          webhookUrl,
          contacts: makeArray
        }
      });

      const endTime = Date.now();
      addDebugLog(`Requisição completada em ${endTime - startTime}ms`);
      
      if (error) {
        addDebugLog(`Erro na Edge Function: ${error.message}`);
        throw new Error(error.message);
      }

      addDebugLog(`Resposta da Edge Function: ${JSON.stringify(data)}`);
      
      // Lidar com diferentes tipos de resposta
      if (data?.success) {
        addDebugLog("=== ENVIO FINALIZADO COM SUCESSO ===");
        if (data.stats) {
          addDebugLog(`📊 Estatísticas: ${data.stats.sent}/${data.stats.total} enviados (${data.stats.success_rate}% sucesso)`);
        }
        
        toast({
          title: "Envio Concluído!",
          description: data.message,
        });
      } else if (data?.partial_success) {
        addDebugLog("=== ENVIO PARCIALMENTE CONCLUÍDO ===");
        if (data.stats) {
          addDebugLog(`📊 Estatísticas: ${data.stats.sent}/${data.stats.total} enviados (${data.stats.success_rate}% sucesso)`);
        }
        if (data.errors && data.errors.length > 0) {
          addDebugLog("❌ Primeiros erros:");
          data.errors.forEach((error: string) => addDebugLog(`   ${error}`));
        }
        
        toast({
          title: "Envio Parcialmente Concluído",
          description: data.message,
          variant: "default"
        });
      } else {
        addDebugLog("=== ENVIO FALHOU ===");
        if (data?.stats) {
          addDebugLog(`📊 Estatísticas: ${data.stats.failed}/${data.stats.total} falharam`);
        }
        if (data?.errors && data.errors.length > 0) {
          addDebugLog("❌ Primeiros erros:");
          data.errors.forEach((error: string) => addDebugLog(`   ${error}`));
        }
        
        toast({
          title: "Falha no Envio",
          description: data?.message || data?.error || 'Erro desconhecido na Edge Function',
          variant: "destructive",
        });
      }

    } catch (error) {
      addDebugLog(`ERRO: ${error}`);
      addDebugLog("=== ENVIO FALHOU ===");
      
      console.error('Erro no envio:', error);
      toast({
        title: "Erro no envio",
        description: `Falha na requisição: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique a URL e sua conexão.`,
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
              <div className="space-y-3">
                <Label>URL do Webhook</Label>
                <Input
                  type="url"
                  placeholder="https://hook.integromat.com/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                {webhookUrl && !isValidWebhookUrl(webhookUrl) && (
                  <p className="text-sm text-destructive mt-1">
                    URL inválida. Use uma URL HTTPS do Make.com com /hook/ no caminho
                  </p>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testWebhook}
                    disabled={!isValidWebhookUrl(webhookUrl) || isTesting}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {isTesting ? 'Testando...' : 'Testar Webhook'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDebugMode(!debugMode)}
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Debug {debugMode ? 'ON' : 'OFF'}
                  </Button>
                </div>
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
                    {isSending ? 'Enviando...' : `Enviar ${contacts.length} Contatos (Fan-out)`}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Envio do Grupo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você está prestes a enviar o grupo <strong>"{selectedGroup?.name}"</strong> com{' '}
                      <strong>{contacts.length} contatos</strong> para Make.com.
                      <br /><br />
                      <strong>Fan-out ativo:</strong> Cada contato será enviado individualmente, criando {contacts.length} bundles separados no Make.com. Isso garante que cada contato seja processado independentemente no seu workflow.
                      <br /><br />
                      Esta ação irá fazer <strong>{contacts.length} requisições sequenciais</strong> para o webhook do Make.com, com rate limiting para evitar sobrecarga. Tem certeza?
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

          {/* Debug Log */}
          {debugLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Log de Debug
                  <Button variant="outline" size="sm" onClick={clearDebugLog}>
                    Limpar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto bg-muted p-3 rounded-md">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {debugLog.join('\n')}
                  </pre>
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