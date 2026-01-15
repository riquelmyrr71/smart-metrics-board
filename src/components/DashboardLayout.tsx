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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgency } from '@/contexts/AgencyContext';
import { cn } from '@/lib/utils';
import { branding } from '@/config/branding';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAgencySettings, applyBrandingToDocument } from '@/hooks/useAgencySettings';
import logoF from '@/assets/logo-f.png';

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
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
          
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">
              {agencyBranding?.companyTagline || branding.companyTagline}
            </p>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-tiktok rounded-full" />
            </Button>

            <Link to="/perfil">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <span className="hidden sm:inline text-sm max-w-[120px] truncate">
                  {profile?.full_name || profile?.email?.split('@')[0] || 'Usuário'}
                </span>
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
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