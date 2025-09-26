import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  Activity,
  User,
  Building2,
  Settings,
  Trash2
} from 'lucide-react';

interface AuditLog {
  id: string;
  super_admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
  admin_name: string;
}

const SuperAdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm]);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('super_admin_audit_logs')
        .select(`
          *,
          super_admins (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const transformedLogs = data?.map(log => ({
        ...log,
        admin_name: log.super_admins?.full_name || 'Super Admin'
      })) || [];

      setLogs(transformedLogs);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar logs de auditoria: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <Building2 className="h-4 w-4 text-green-400" />;
    if (action.includes('update') || action.includes('edit')) return <Settings className="h-4 w-4 text-blue-400" />;
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-red-400" />;
    if (action.includes('login') || action.includes('logout')) return <User className="h-4 w-4 text-purple-400" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-600';
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-600';
    if (action.includes('delete')) return 'bg-red-600';
    if (action.includes('login') || action.includes('logout')) return 'bg-purple-600';
    return 'bg-gray-600';
  };

  const formatActionName = (action: string) => {
    const actionMap: Record<string, string> = {
      'create_organization': 'Criar Organização',
      'update_organization': 'Atualizar Organização',
      'delete_organization': 'Excluir Organização',
      'activate_organization': 'Ativar Organização',
      'deactivate_organization': 'Desativar Organização',
      'login': 'Login',
      'logout': 'Logout',
      'create_user': 'Criar Usuário',
      'update_user': 'Atualizar Usuário',
      'delete_user': 'Excluir Usuário'
    };

    return actionMap[action] || action.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Logs de Auditoria</h1>
          <p className="text-purple-200 mt-2">
            Histórico completo de ações administrativas
          </p>
        </div>
        <Button 
          onClick={fetchAuditLogs}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Activity className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-purple-300" />
          <Input
            placeholder="Buscar por ação, recurso, administrador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/30 border-purple-800/50 text-white placeholder-purple-300"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Total de Logs
            </CardTitle>
            <FileText className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{logs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Hoje
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {logs.filter(log => {
                const today = new Date().toDateString();
                const logDate = new Date(log.created_at).toDateString();
                return today === logDate;
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Ações Críticas
            </CardTitle>
            <Activity className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {logs.filter(log => log.action.includes('delete')).length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Logins
            </CardTitle>
            <User className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {logs.filter(log => log.action === 'login').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card className="border-purple-800/30 bg-black/50">
        <CardHeader>
          <CardTitle className="text-white">Histórico de Ações</CardTitle>
          <CardDescription className="text-purple-200">
            Últimas 100 ações realizadas pelos super administradores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 rounded-lg border border-purple-800/30 bg-black/30"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-600/20">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${getActionBadgeColor(log.action)} text-white`}>
                        {formatActionName(log.action)}
                      </Badge>
                      <span className="text-sm text-purple-300">{log.resource_type}</span>
                    </div>
                    
                    <div className="text-sm text-white mb-1">
                      Por: <span className="font-medium">{log.admin_name}</span>
                    </div>
                    
                    {Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-purple-300 bg-black/30 rounded px-2 py-1 font-mono max-w-md truncate">
                        {JSON.stringify(log.details, null, 2).slice(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <div className="text-white">
                    {new Date(log.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-purple-300">
                    {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchTerm ? 'Nenhum log encontrado' : 'Nenhum log disponível'}
                </h3>
                <p className="text-purple-200">
                  {searchTerm ? 
                    'Tente ajustar os filtros de busca' : 
                    'Os logs de auditoria aparecerão aqui quando ações forem realizadas'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAuditLogs;