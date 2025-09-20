import React from 'react';
import { Users, UserPlus, Upload, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { GroupManager } from '@/components/GroupManager';
import { ContactManager } from '@/components/ContactManager';
import { CSVImporter } from '@/components/CSVImporter';

const DashboardLayout = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Fios Tecnologia</h1>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="contacts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importar CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Contatos</CardTitle>
                <CardDescription>
                  Visualize, adicione, edite e organize seus contatos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Grupos</CardTitle>
                <CardDescription>
                  Crie e organize grupos para categorizar seus contatos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GroupManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Importar Contatos via CSV</CardTitle>
                <CardDescription>
                  Faça upload de um arquivo CSV para importar múltiplos contatos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CSVImporter />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardLayout;