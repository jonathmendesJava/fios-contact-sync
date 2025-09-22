import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { 
  BarChart3, 
  Users, 
  Contact, 
  AlertTriangle,
  Trash2,
  CheckCircle,
  Mail,
  Phone,
  UserX,
  Merge,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AnalyticsData {
  totalContacts: number;
  totalGroups: number;
  groupsWithContacts: number;
  emptyGroups: number;
  contactsWithoutEmail: number;
  contactsWithoutSignature: number;
  duplicatePhones: number;
  duplicateEmails: number;
  groupStats: { name: string; count: number; id: string }[];
}

interface DuplicateContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  group_name: string;
}

interface DuplicateGroup {
  value: string;
  type: 'phone' | 'email';
  contacts: DuplicateContact[];
}

export const AnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchDuplicates();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get basic counts
      const [
        { count: totalContacts },
        { count: totalGroups },
        { data: groupStats }
      ] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('contact_groups').select('*', { count: 'exact', head: true }),
        supabase.from('contact_groups').select(`
          id,
          name,
          contacts (count)
        `)
      ]);

      // Process group stats
      const processedGroupStats = (groupStats || []).map(group => ({
        id: group.id,
        name: group.name,
        count: group.contacts?.[0]?.count || 0
      })).sort((a, b) => b.count - a.count);

      const groupsWithContacts = processedGroupStats.filter(g => g.count > 0).length;
      const emptyGroups = processedGroupStats.filter(g => g.count === 0).length;

      // Get contacts without email/signature
      const { count: contactsWithoutEmail } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .or('email.is.null,email.eq.');

      const { count: contactsWithoutSignature } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .or('signature.is.null,signature.eq.');

      setAnalytics({
        totalContacts: totalContacts || 0,
        totalGroups: totalGroups || 0,
        groupsWithContacts,
        emptyGroups,
        contactsWithoutEmail: contactsWithoutEmail || 0,
        contactsWithoutSignature: contactsWithoutSignature || 0,
        duplicatePhones: 0, // Will be calculated from duplicates
        duplicateEmails: 0, // Will be calculated from duplicates
        groupStats: processedGroupStats
      });

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar analytics: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    try {
      // Get all contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select(`
          id,
          name,
          phone,
          email,
          contact_groups (name)
        `);

      if (!contacts) return;

      // Find phone duplicates
      const phoneMap = new Map<string, DuplicateContact[]>();
      const emailMap = new Map<string, DuplicateContact[]>();

      contacts.forEach(contact => {
        if (contact.phone) {
          const phone = contact.phone.replace(/\D/g, '');
          if (!phoneMap.has(phone)) phoneMap.set(phone, []);
          phoneMap.get(phone)!.push({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            group_name: contact.contact_groups?.name || ''
          });
        }

        if (contact.email) {
          const email = contact.email.toLowerCase();
          if (!emailMap.has(email)) emailMap.set(email, []);
          emailMap.get(email)!.push({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            group_name: contact.contact_groups?.name || ''
          });
        }
      });

      // Filter only duplicates
      const phoneDuplicates: DuplicateGroup[] = [];
      const emailDuplicates: DuplicateGroup[] = [];

      phoneMap.forEach((contacts, phone) => {
        if (contacts.length > 1) {
          phoneDuplicates.push({
            value: contacts[0].phone,
            type: 'phone',
            contacts
          });
        }
      });

      emailMap.forEach((contacts, email) => {
        if (contacts.length > 1) {
          emailDuplicates.push({
            value: email,
            type: 'email',
            contacts
          });
        }
      });

      const allDuplicates = [...phoneDuplicates, ...emailDuplicates];
      setDuplicates(allDuplicates);

      // Update analytics with duplicate counts
      setAnalytics(prev => prev ? {
        ...prev,
        duplicatePhones: phoneDuplicates.reduce((sum, group) => sum + group.contacts.length, 0),
        duplicateEmails: emailDuplicates.reduce((sum, group) => sum + group.contacts.length, 0)
      } : null);

    } catch (error: any) {
      console.error('Error fetching duplicates:', error);
    }
  };

  const deleteEmptyGroups = async () => {
    if (!analytics || !confirm('Tem certeza que deseja excluir todos os grupos vazios?')) return;

    setProcessing(true);
    try {
      const emptyGroupIds = analytics.groupStats.filter(g => g.count === 0).map(g => g.id);
      
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .in('id', emptyGroupIds);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `${emptyGroupIds.length} grupos vazios foram excluídos.`,
      });

      fetchAnalytics();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const removeDuplicate = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato duplicado?')) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Contato duplicado removido com sucesso!',
      });

      fetchAnalytics();
      fetchDuplicates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento e Analytics</h2>
          <p className="text-muted-foreground">Visão geral e limpeza dos dados</p>
        </div>
        <Button onClick={() => { fetchAnalytics(); fetchDuplicates(); }} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Contact className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Total de Contatos</span>
            </div>
            <div className="text-2xl font-bold">{analytics.totalContacts}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.contactsWithoutEmail} sem email
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Total de Grupos</span>
            </div>
            <div className="text-2xl font-bold">{analytics.totalGroups}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.emptyGroups} grupos vazios
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium">Telefones Duplicados</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{analytics.duplicatePhones}</div>
            <p className="text-xs text-muted-foreground">
              Precisam de atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium">Emails Duplicados</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{analytics.duplicateEmails}</div>
            <p className="text-xs text-muted-foreground">
              Precisam de atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
            Problemas de Qualidade dos Dados
          </CardTitle>
          <CardDescription>
            Identifique e resolva problemas nos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Incomplete Data */}
            <div className="space-y-3">
              <h4 className="font-medium">Informações Incompletas</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Contatos sem email</span>
                  </div>
                  <Badge variant={analytics.contactsWithoutEmail > 0 ? "destructive" : "secondary"}>
                    {analytics.contactsWithoutEmail}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Contact className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Contatos sem assinatura</span>
                  </div>
                  <Badge variant={analytics.contactsWithoutSignature > 0 ? "secondary" : "secondary"}>
                    {analytics.contactsWithoutSignature}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Structural Issues */}
            <div className="space-y-3">
              <h4 className="font-medium">Problemas Estruturais</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Grupos vazios</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={analytics.emptyGroups > 0 ? "destructive" : "secondary"}>
                      {analytics.emptyGroups}
                    </Badge>
                    {analytics.emptyGroups > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={deleteEmptyGroups}
                        disabled={processing}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Merge className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Contatos duplicados</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={duplicates.length > 0 ? "destructive" : "secondary"}>
                      {duplicates.length} grupos
                    </Badge>
                    {duplicates.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDuplicatesDialog(true)}
                      >
                        Ver Detalhes
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-primary" />
            Distribuição por Grupos
          </CardTitle>
          <CardDescription>
            Quantidade de contatos em cada grupo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.groupStats.slice(0, 10).map((group, index) => (
              <div key={group.id} className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{group.name}</span>
                    <span className="text-sm text-muted-foreground">{group.count} contatos</span>
                  </div>
                  <Progress 
                    value={analytics.totalContacts > 0 ? (group.count / analytics.totalContacts) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
            {analytics.groupStats.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                ... e mais {analytics.groupStats.length - 10} grupos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            Score de Qualidade dos Dados
          </CardTitle>
          <CardDescription>
            Avaliação geral da qualidade dos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const issues = [
                analytics.emptyGroups > 0,
                analytics.duplicatePhones > 0,
                analytics.duplicateEmails > 0,
                analytics.contactsWithoutEmail > analytics.totalContacts * 0.3
              ].filter(Boolean).length;
              
              const score = Math.max(0, 100 - (issues * 25));
              const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
              
              return (
                <div className="text-center">
                  <div className={`text-4xl font-bold ${color}`}>{score}%</div>
                  <p className="text-muted-foreground">
                    {score >= 80 ? 'Excelente qualidade' : 
                     score >= 60 ? 'Boa qualidade' : 
                     'Precisa de melhorias'}
                  </p>
                  <Progress value={score} className="mt-2" />
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Duplicates Dialog */}
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Contatos Duplicados</DialogTitle>
            <DialogDescription>
              Gerencie contatos com telefones ou emails duplicados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {duplicates.map((group, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    {group.type === 'phone' ? (
                      <Phone className="h-4 w-4 mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    {group.value}
                    <Badge variant="destructive" className="ml-2">
                      {group.contacts.length} duplicados
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{contact.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            • {contact.group_name}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeDuplicate(contact.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};