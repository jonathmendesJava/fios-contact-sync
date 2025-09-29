import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { MetaConnection } from '@/hooks/useMetaConnection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateTemplateDialog } from './CreateTemplateDialog';
import { TestTemplateDialog } from './TestTemplateDialog';

interface WhatsAppTemplate {
  id: string;
  template_id: string;
  name: string;
  language: string;
  category: string | null;
  status: string | null;
  components: any;
  quality_score: string | null;
  rejected_reason: string | null;
}

interface TemplatesListProps {
  connection: MetaConnection;
}

export const TemplatesList: React.FC<TemplatesListProps> = ({ connection }) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [connection]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('connection_id', connection.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os templates.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        'https://kdwxmroxfbhmwxkyniph.supabase.co/functions/v1/meta-api/templates',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to sync templates');

      toast({
        title: 'Templates sincronizados',
        description: 'Templates foram atualizados com sucesso.',
      });

      await fetchTemplates();
    } catch (error) {
      console.error('Error syncing templates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar os templates.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Template excluído',
        description: 'Template foi removido com sucesso.',
      });

      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o template.',
        variant: 'destructive',
      });
    }
  };

  const handleTest = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setTestDialogOpen(true);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return <Badge variant="default">Aprovado</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Templates do WhatsApp</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum template encontrado.</p>
              <p className="text-sm mt-2">Crie um novo template ou sincronize com Meta.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          {getStatusBadge(template.status)}
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Idioma: {template.language}
                        </p>
                        {template.rejected_reason && (
                          <p className="text-sm text-destructive mt-2">
                            Motivo da rejeição: {template.rejected_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {template.status?.toUpperCase() === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(template)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTemplates}
      />

      {selectedTemplate && (
        <TestTemplateDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          template={selectedTemplate}
        />
      )}
    </>
  );
};
