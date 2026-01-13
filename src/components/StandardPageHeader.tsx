import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Calendar, 
  Swords, 
  Users, 
  FileText,
  LogOut,
  Settings,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgency } from '@/contexts/AgencyContext';
import { branding } from '@/config/branding';

interface StandardPageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Painel', href: '/painel', icon: BarChart3 },
  { name: 'Gráficos', href: '/graficos', icon: BarChart3 },
  { name: 'Agendamentos', href: '/agendamentos', icon: Calendar },
  { name: 'Batalhas', href: '/batalhas', icon: Swords },
  { name: 'Criadores', href: '/criadores-analise', icon: Users },
  { name: 'Anotações', href: '/anotacoes', icon: FileText },
];

export const StandardPageHeader: React.FC<StandardPageHeaderProps> = ({ 
  title, 
  icon,
  actions 
}) => {
  const { agency, profile, signOut, isSuperAdmin } = useAgency();
  const navigate = useNavigate();
  const currentPath = window.location.pathname;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Top Row - Branding & User */}
        <div className="flex items-center justify-between">
          {/* Logo & Agency Name */}
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

          {/* User Menu */}
          <div className="flex items-center gap-2">
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
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
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

        {/* Navigation Row */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {navigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${isActive 
                    ? "bg-primary text-white shadow-md" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }
                `}
              >
                <item.icon className="inline-block h-4 w-4 mr-1.5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Page Title & Actions Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && <div className="text-primary">{icon}</div>}
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
