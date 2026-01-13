import React from 'react';
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
  Building2,
  TrendingUp,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgency } from '@/contexts/AgencyContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { branding } from '@/config/branding';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo & Agency Name */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <Link to="/" className="flex items-center gap-3 group">
              {agency?.logo_url ? (
                <img 
                  src={agency.logo_url} 
                  alt={agency.name} 
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
                  <span className="text-primary-foreground font-bold text-lg">
                    {branding.companyShortName}
                  </span>
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-foreground font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {agency?.name || branding.companyName}
                </h1>
                <p className="text-muted-foreground text-xs">{branding.companyTagline}</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="inline-block h-4 w-4 mr-1.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {/* Notifications Bell */}
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
            </Button>

            {isSuperAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium shadow-sm">
                {profile?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-foreground text-sm max-w-32 truncate">{profile?.email}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sair</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-card py-2 animate-fade-in">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary border-l-2 border-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            {isSuperAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 border-t border-border mt-2"
              >
                <Settings className="h-5 w-5" />
                Administração
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
