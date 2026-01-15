import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ChartsDashboard from "./pages/ChartsDashboard";
import NotesPage from "./pages/NotesPage";
import SchedulingDashboard from "./pages/SchedulingDashboard";
import BattlesDashboard from "./pages/BattlesDashboard";
import CreatorsAnalysisDashboard from "./pages/CreatorsAnalysisDashboard";
import OverviewDashboard from "./pages/OverviewDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AgencySettings from "./pages/AgencySettings";
import ProfilePage from "./pages/ProfilePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AboutPage from "./pages/AboutPage";
import ResourcesPage from "./pages/ResourcesPage";
import ContactPage from "./pages/ContactPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { AgencyProvider } from "./contexts/AgencyContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AgencyProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/sobre" element={<AboutPage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route path="/contato" element={<ContactPage />} />
            <Route path="/" element={<ProtectedRoute><OverviewDashboard /></ProtectedRoute>} />
            <Route path="/painel" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/graficos" element={<ProtectedRoute><ChartsDashboard /></ProtectedRoute>} />
            <Route path="/anotacoes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
            <Route path="/agendamentos" element={<ProtectedRoute><SchedulingDashboard /></ProtectedRoute>} />
            <Route path="/batalhas" element={<ProtectedRoute><BattlesDashboard /></ProtectedRoute>} />
            <Route path="/criadores-analise" element={<ProtectedRoute><CreatorsAnalysisDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><AgencySettings /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AgencyProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
