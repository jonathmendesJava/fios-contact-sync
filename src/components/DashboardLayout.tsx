import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Upload, 
  LogOut, 
  BarChart3,
  Menu,
  Send
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ContactsView } from '@/components/views/ContactsView';
import { GroupsView } from '@/components/views/GroupsView';
import { ImportView } from '@/components/views/ImportView';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { BulkSendView } from '@/components/views/BulkSendView';

// Navigation items configuration
const navigationItems = [
  {
    id: 'contacts',
    label: 'Contatos',
    icon: Users,
    description: 'Gerenciar contatos'
  },
  {
    id: 'groups',
    label: 'Grupos',
    icon: UserPlus,
    description: 'Gerenciar grupos'
  },
  {
    id: 'import',
    label: 'Importar CSV',
    icon: Upload,
    description: 'Importar contatos'
  },
  {
    id: 'analytics',
    label: 'Relatórios',
    icon: BarChart3,
    description: 'Visualizar estatísticas'
  },
  {
    id: 'bulk-send',
    label: 'Envio em Massa',
    icon: Send,
    description: 'Enviar contatos para Make.com'
  }
];

// App Sidebar Component
function AppSidebar({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) {
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
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <div className="font-semibold text-foreground">
                Fios Tecnologia
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id)}
                    isActive={activeTab === item.id}
                    className={
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.label}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:px-2"
          >
            <LogOut className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
            <span className="group-data-[collapsible=icon]:hidden">Sair</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('contacts');

  const renderContent = () => {
    switch (activeTab) {
      case 'contacts':
        return <ContactsView />;
      case 'groups':
        return <GroupsView />;
      case 'import':
        return <ImportView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'bulk-send':
        return <BulkSendView />;
      default:
        return <ContactsView />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1">
          {/* Header with trigger */}
          <header className="h-16 flex items-center border-b px-4">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">
                {navigationItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-muted-foreground">
                {navigationItems.find(item => item.id === activeTab)?.description}
              </p>
            </div>
          </header>

          {/* Content */}
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;