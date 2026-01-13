import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Building2,
  LayoutDashboard,
  BarChart3,
  Calendar,
  Swords,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: 'Overview',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: 'Painel',
    icon: BarChart3,
    href: '/painel',
  },
  {
    title: 'Gráficos',
    icon: BarChart3,
    href: '/graficos',
  },
  {
    title: 'Agendamentos',
    icon: Calendar,
    href: '/agendamentos',
  },
  {
    title: 'Batalhas',
    icon: Swords,
    href: '/batalhas',
  },
  {
    title: 'Análise de Criadores',
    icon: Users,
    href: '/criadores-analise',
  },
  {
    title: 'Anotações',
    icon: FileText,
    href: '/anotacoes',
  },
];

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { profile, agency, signOut, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b border-sidebar-border p-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sidebar-foreground">AgencyHub</span>
                {agency && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {agency.name}
                  </span>
                )}
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navegação</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.href}
                      >
                        <Link to={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isSuperAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Administração</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === '/admin/agencias'}
                      >
                        <Link to="/admin/agencias">
                          <Building2 className="h-4 w-4" />
                          <span>Agências</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === '/admin/usuarios'}
                      >
                        <Link to="/admin/usuarios">
                          <Shield className="h-4 w-4" />
                          <span>Usuários</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate max-w-[120px]">
                      {profile?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {profile?.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/95 backdrop-blur px-4 py-3">
            <SidebarTrigger />
            {isSuperAdmin && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Super Admin
              </span>
            )}
          </div>
          <div className="p-4">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
};
