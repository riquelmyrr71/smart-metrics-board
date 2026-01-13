import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChartsDashboard from "./pages/ChartsDashboard";
import NotesPage from "./pages/NotesPage";
import SchedulingDashboard from "./pages/SchedulingDashboard";
import BattlesDashboard from "./pages/BattlesDashboard";
import CreatorsAnalysisDashboard from "./pages/CreatorsAnalysisDashboard";
import OverviewDashboard from "./pages/OverviewDashboard";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminAgenciesPage from "./pages/admin/AgenciesPage";
import AdminUsersPage from "./pages/admin/UsersPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Protected routes with layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <OverviewDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/painel"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/graficos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChartsDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/anotacoes"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NotesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agendamentos"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SchedulingDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/batalhas"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <BattlesDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/criadores-analise"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreatorsAnalysisDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - Super Admin only */}
            <Route
              path="/admin/agencias"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <AppLayout>
                    <AdminAgenciesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute requireSuperAdmin>
                  <AppLayout>
                    <AdminUsersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
