import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Upload, 
  BarChart3,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const navigationItems = [
  {
    id: 'contacts',
    label: 'Contatos',
    icon: Users,
    description: 'Gerenciar contatos por grupo'
  },
  {
    id: 'groups',
    label: 'Grupos',
    icon: UserPlus,
    description: 'Criar e gerenciar grupos'
  },
  {
    id: 'import',
    label: 'Importar',
    icon: Upload,
    description: 'Importar contatos via CSV'
  },
  {
    id: 'analytics',
    label: 'Gerenciamento',
    icon: BarChart3,
    description: 'Analytics e limpeza'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isExpanded,
  onExpandedChange
}) => {
  return (
    <div 
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
    >
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Users className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {isExpanded && (
            <div className="font-semibold text-sidebar-foreground">
              CRM Fios
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8 px-2">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors group",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isExpanded && (
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className={cn(
                      "text-xs opacity-75",
                      isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground"
                    )}>
                      {item.description}
                    </div>
                  </div>
                )}
                {!isExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-card border border-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Expand/Collapse indicator */}
      <div className="absolute top-1/2 -right-3 transform -translate-y-1/2">
        <div className="w-6 h-6 bg-sidebar-primary rounded-full flex items-center justify-center shadow-lg">
          <ChevronRight 
            className={cn(
              "h-3 w-3 text-sidebar-primary-foreground transition-transform",
              isExpanded && "rotate-180"
            )} 
          />
        </div>
      </div>
    </div>
  );
};