import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface ProtectedSuperAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedSuperAdminRoute: React.FC<ProtectedSuperAdminRouteProps> = ({ children }) => {
  const { superAdmin, loading } = useSuperAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  if (!superAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedSuperAdminRoute;