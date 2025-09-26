import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Users, Search, Filter, Eye, Ban, CheckCircle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  tenant_name: string;
  role: string;
}

const SuperAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      // Get users from auth.users via RPC or direct query
      // For now, we'll fetch from user_tenants to get organization relationships
      const { data, error } = await supabase
        .from('user_tenants')
        .select(`
          user_id,
          role,
          created_at,
          tenants (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to user format
      const transformedUsers = data?.map(item => ({
        id: item.user_id,
        email: `user@${item.user_id.slice(0, 8)}.com`, // Mock email since we can't access auth.users directly
        created_at: item.created_at,
        last_sign_in_at: null, // Would need to be fetched from auth.users
        tenant_name: item.tenants?.name || 'N/A',
        role: item.role
      })) || [];

      setUsers(transformedUsers);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
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
          <h1 className="text-3xl font-bold text-white">Usuários</h1>
          <p className="text-purple-200 mt-2">
            Gerencie todos os usuários do sistema
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-purple-300" />
          <Input
            placeholder="Buscar por email, organização ou role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black/30 border-purple-800/50 text-white placeholder-purple-300"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{users.length}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Administradores
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {users.filter(u => u.role === 'admin' || u.role === 'owner').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Membros
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {users.filter(u => u.role === 'member').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-800/30 bg-black/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-200">
              Ativos Hoje
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="border-purple-800/30 bg-black/50">
        <CardHeader>
          <CardTitle className="text-white">Lista de Usuários</CardTitle>
          <CardDescription className="text-purple-200">
            Todos os usuários registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border border-purple-800/30 bg-black/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{user.email}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={user.role === 'owner' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}
                          className={
                            user.role === 'owner' ? 'bg-purple-600' :
                            user.role === 'admin' ? 'bg-blue-600' : 
                            'bg-gray-600'
                          }
                        >
                          {user.role}
                        </Badge>
                        <span className="text-sm text-purple-300">{user.tenant_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-purple-200">
                      Cadastro: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-purple-300">
                      Último acesso: {user.last_sign_in_at ? 
                        new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') : 
                        'Nunca'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-purple-300 hover:text-white">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </h3>
                <p className="text-purple-200">
                  {searchTerm ? 
                    'Tente ajustar os filtros de busca' : 
                    'Os usuários aparecerão aqui quando se cadastrarem'
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

export default SuperAdminUsers;