import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Calendar, 
  Swords, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  TrendingUp,
  Bell,
  User,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgency } from '@/contexts/AgencyContext';
import { cn } from '@/lib/utils';
import { branding } from '@/config/branding';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAgencySettings, applyBrandingToDocument } from '@/hooks/useAgencySettings';
import logoF from '@/assets/logo-f.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AgencyInfoCard } from '@/components/AgencyInfoCard';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Painel', href: '/painel', icon: TrendingUp },
  { name: 'Gráficos', href: '/graficos', icon: BarChart3 },
  { name: 'Agendamentos', href: '/agendamentos', icon: Calendar },
  { name: 'Batalhas', href: '/batalhas', icon: Swords },
  { name: 'Criadores', href: '/criadores-analise', icon: Users },
  { name: 'Anotações', href: '/anotacoes', icon: FileText },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { agency, profile, signOut, isSuperAdmin } = useAgency();
  const { branding: agencyBranding } = useAgencySettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'Bem-vindo!', message: 'Sua plataforma está pronta para uso.' }
  ]);
  const [agencyInfoOpen, setAgencyInfoOpen] = useState(false);

  // Apply agency branding when it changes
  useEffect(() => {
    if (agencyBranding) {
      applyBrandingToDocument(agencyBranding);
    }
  }, [agencyBranding]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!sidebarCollapsed && (
            <Link to="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <img src={logoF} alt="Logo" className="h-6 w-6 object-contain" />
              </div>
              <span className="font-semibold text-foreground">
                {agencyBranding?.companyName || agency?.name || 'LiveMetrics'}
              </span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link to="/" className="mx-auto">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <img src={logoF} alt="Logo" className="h-6 w-6 object-contain" />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive && "text-primary-foreground"
                )} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-2 border-t border-border space-y-1">
          <Link
            to="/configuracoes"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted",
              location.pathname === '/configuracoes' && "bg-muted text-foreground"
            )}
            title={sidebarCollapsed ? "Configurações" : undefined}
          >
            <Settings className="h-5 w-5" />
            {!sidebarCollapsed && <span>Configurações</span>}
          </Link>

          {isSuperAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted",
                location.pathname === '/admin' && "bg-muted text-foreground"
              )}
              title={sidebarCollapsed ? "Admin" : undefined}
            >
              <Users className="h-5 w-5" />
              {!sidebarCollapsed && <span>Admin</span>}
            </Link>
          )}

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-muted w-full"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card border border-border shadow-sm"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={cn(
          "lg:hidden fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <img src={logoF} alt="Logo" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-semibold text-foreground">
              {agencyBranding?.companyName || agency?.name || 'LiveMetrics'}
            </span>
          </Link>
        </div>

        <nav className="py-4 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="h-px bg-border my-2" />

          <Link
            to="/configuracoes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Settings className="h-5 w-5" />
            <span>Configurações</span>
          </Link>

          {isSuperAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Users className="h-5 w-5" />
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"
      )}>
        {/* Top Header */}
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
          
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">
              {agencyBranding?.companyTagline || branding.companyTagline}
            </p>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            {/* Help Center */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Central de Ajuda</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-tiktok rounded-full animate-pulse" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <DropdownMenuItem key={notif.id} className="flex flex-col items-start gap-1 py-3">
                      <span className="font-medium text-sm">{notif.title}</span>
                      <span className="text-xs text-muted-foreground">{notif.message}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-center py-4">
                    Sem notificações
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/configuracoes">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Configurações</TooltipContent>
            </Tooltip>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground ml-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-primary font-semibold text-sm">
                        {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-sm max-w-[100px] truncate font-medium">
                    {profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span>{profile?.full_name || 'Usuário'}</span>
                  <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil" className="flex items-center gap-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;