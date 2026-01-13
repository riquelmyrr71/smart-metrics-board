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
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
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
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                  <span className="text-white font-bold text-lg">
                    {branding.companyShortName}
                  </span>
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-gray-900 font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                  {agency?.name || branding.companyName}
                </h1>
                <p className="text-gray-500 text-xs">{branding.companyTagline}</p>
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
                      ? "bg-primary text-white shadow-md" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
            </Button>

            {isSuperAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium shadow-sm">
                {profile?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-gray-700 text-sm max-w-32 truncate">{profile?.email}</span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Sair</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-gray-200 bg-white py-2">
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
                      ? "bg-red-50 text-primary border-l-2 border-primary" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-t border-gray-200 mt-2"
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
