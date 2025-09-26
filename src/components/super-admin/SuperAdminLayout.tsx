import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  FileText,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const SuperAdminLayout = () => {
  const { superAdmin, signOut } = useSuperAdmin();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
    });
    navigate('/super-admin/login');
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/super-admin/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Organizações',
      href: '/super-admin/organizations',
      icon: Building2
    },
    {
      name: 'Usuários',
      href: '/super-admin/users',
      icon: Users
    },
    {
      name: 'Ambientes',
      href: '/super-admin/environments',
      icon: Settings
    },
    {
      name: 'Logs de Auditoria',
      href: '/super-admin/audit-logs',
      icon: FileText
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-black/80 backdrop-blur border-r border-purple-800/30
        transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-purple-800/30">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-400" />
            <span className="ml-2 text-lg font-semibold text-white">Super Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-purple-800/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-purple-800/30">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {superAdmin?.full_name.charAt(0)}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{superAdmin?.full_name}</p>
              <p className="text-xs text-purple-200">{superAdmin?.username}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-purple-600 text-white' 
                  : 'text-purple-200 hover:bg-purple-800/20 hover:text-white'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-purple-800/30">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-purple-200 hover:bg-red-900/20 hover:text-red-300"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Navigation */}
        <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-purple-800/30 bg-black/80 backdrop-blur px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white hover:bg-purple-800/20"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-lg font-semibold text-white">Console de Administração</h1>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;