import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { TenantProvider } from "./hooks/useTenant";
import { SuperAdminProvider } from "./hooks/useSuperAdmin";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import SuperAdminLogin from "./pages/super-admin/SuperAdminLogin";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminOrganizations from "./pages/super-admin/SuperAdminOrganizations";
import SuperAdminUsers from "./pages/super-admin/SuperAdminUsers";
import SuperAdminAuditLogs from "./pages/super-admin/SuperAdminAuditLogs";
import SuperAdminLayout from "./components/super-admin/SuperAdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedSuperAdminRoute from "./components/super-admin/ProtectedSuperAdminRoute";

const App = () => {
  return (
    <SuperAdminProvider>
      <AuthProvider>
        <TenantProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Regular App Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Super Admin Routes */}
              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
              <Route 
                path="/super-admin/*" 
                element={
                  <ProtectedSuperAdminRoute>
                    <SuperAdminLayout />
                  </ProtectedSuperAdminRoute>
                }
              >
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="organizations" element={<SuperAdminOrganizations />} />
                <Route path="users" element={<SuperAdminUsers />} />
                <Route path="environments" element={<div className="text-white">Ambientes - Em breve</div>} />
                <Route path="audit-logs" element={<SuperAdminAuditLogs />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </SuperAdminProvider>
  );
};

export default App;
