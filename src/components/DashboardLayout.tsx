import React, { useState, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Upload, 
  LogOut, 
  BarChart3,
  Menu,
  Send
} from 'lucide-react';
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";
import type { Container, Engine } from "tsparticles-engine";
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
import { TenantSelector } from '@/components/TenantSelector';
import { CreateTenantDialog } from '@/components/dialogs/CreateTenantDialog';

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

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: Container | undefined) => {
    // Particles loaded callback
  }, []);

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
      <div className="min-h-screen flex w-full relative overflow-hidden">
        {/* Subtle Space Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800"></div>
        
        {/* Minimal Particles for Business Environment */}
        <Particles
          id="dashboard-particles"
          init={particlesInit}
          loaded={particlesLoaded}
          className="absolute inset-0 z-0"
          options={{
            background: {
              color: {
                value: "transparent",
              },
            },
            fpsLimit: 30,
            interactivity: {
              events: {
                onHover: {
                  enable: true,
                  mode: "grab",
                },
                resize: true,
              },
              modes: {
                grab: {
                  distance: 120,
                  links: {
                    opacity: 0.3,
                    color: "#64ffda",
                  },
                },
              },
            },
            particles: {
              color: {
                value: "#64ffda",
              },
              links: {
                color: "#64ffda",
                distance: 150,
                enable: true,
                opacity: 0.2,
                width: 1,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "out",
                },
                random: true,
                speed: 0.3,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 1500,
                },
                value: 28,
              },
              opacity: {
                value: { min: 0.2, max: 0.8 },
                animation: {
                  enable: true,
                  speed: 1.0,
                  sync: false,
                },
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 0.5, max: 2 },
              },
            },
            detectRetina: true,
            reduceDuplicates: true,
          }}
        />

        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 relative z-10">
          {/* Header with trigger */}
          <header className="h-16 flex items-center border-b px-4 bg-background/95 backdrop-blur-sm">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">
                {navigationItems.find(item => item.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-muted-foreground">
                {navigationItems.find(item => item.id === activeTab)?.description}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <TenantSelector />
              <CreateTenantDialog />
            </div>
          </header>

          {/* Content */}
          <div className="p-6 bg-background/80 backdrop-blur-sm min-h-[calc(100vh-4rem)]">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;