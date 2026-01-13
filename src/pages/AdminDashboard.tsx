import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Plus, Check, Shield, Activity, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import DashboardLayout from '@/components/DashboardLayout';

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserWithAgency {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  agency_id: string | null;
  is_super_admin: boolean;
  agency_name?: string;
}

const AdminDashboard: React.FC = () => {
  const { isSuperAdmin, isLoading } = useAgency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<UserWithAgency[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAddAgency, setShowAddAgency] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: '', slug: '', logo_url: '' });
  const [newUser, setNewUser] = useState({ email: '', password: '', agency_id: '' });

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/');
      return;
    }
    
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin, isLoading, navigate]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Load agencies
      const { data: agenciesData, error: agenciesError } = await supabase
        .from('agencies')
        .select('*')
        .order('name');

      if (agenciesError) throw agenciesError;
      setAgencies(agenciesData || []);

      // Load users with agency info
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          *,
          agencies:agency_id (name)
        `)
        .order('email');

      if (usersError) throw usersError;
      
      const formattedUsers = (usersData || []).map(u => ({
        ...u,
        agency_name: (u.agencies as any)?.name || null
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddAgency = async () => {
    if (!newAgency.name || !newAgency.slug) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome e slug são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('agencies')
        .insert({
          name: newAgency.name,
          slug: newAgency.slug.toLowerCase().replace(/\s+/g, '-'),
          logo_url: newAgency.logo_url || null
        });

      if (error) throw error;

      toast({ title: 'Agência criada com sucesso!' });
      setNewAgency({ name: '', slug: '', logo_url: '' });
      setShowAddAgency(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar agência',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.agency_id) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Email, senha e agência são obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          agency_id: newUser.agency_id
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || 'Erro desconhecido');

      toast({ title: 'Usuário criado com sucesso!' });
      setNewUser({ email: '', password: '', agency_id: '' });
      setShowAddUser(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleAgencyStatus = async (agency: Agency) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ is_active: !agency.is_active })
        .eq('id', agency.id);

      if (error) throw error;
      loadData();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar agência',
        variant: 'destructive'
      });
    }
  };

  if (isLoading || loadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie agências e usuários da plataforma</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Agências</p>
                  <p className="text-2xl font-bold text-foreground">{agencies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Usuários</p>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Agências Ativas</p>
                  <p className="text-2xl font-bold text-foreground">
                    {agencies.filter(a => a.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Activity className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Taxa de Ativação</p>
                  <p className="text-2xl font-bold text-foreground">
                    {agencies.length > 0 ? Math.round((agencies.filter(a => a.is_active).length / agencies.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agencies Table */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Agências
            </CardTitle>
            <Dialog open={showAddAgency} onOpenChange={setShowAddAgency}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Agência
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Criar Nova Agência</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-foreground">Nome</Label>
                    <Input
                      value={newAgency.name}
                      onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })}
                      className="bg-background border-border text-foreground"
                      placeholder="Nome da agência"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Slug (identificador único)</Label>
                    <Input
                      value={newAgency.slug}
                      onChange={(e) => setNewAgency({ ...newAgency, slug: e.target.value })}
                      className="bg-background border-border text-foreground"
                      placeholder="nome-agencia"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">URL do Logo (opcional)</Label>
                    <Input
                      value={newAgency.logo_url}
                      onChange={(e) => setNewAgency({ ...newAgency, logo_url: e.target.value })}
                      className="bg-background border-border text-foreground"
                      placeholder="https://..."
                    />
                  </div>
                  <Button onClick={handleAddAgency} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    Criar Agência
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Slug</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id} className="border-border hover:bg-accent/50">
                    <TableCell className="text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        {agency.logo_url ? (
                          <img src={agency.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        {agency.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agency.slug}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agency.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {agency.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={agency.is_active}
                        onCheckedChange={() => toggleAgencyStatus(agency)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Usuários
            </CardTitle>
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Criar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-foreground">Email</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="bg-background border-border text-foreground"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Senha</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="bg-background border-border text-foreground"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground">Agência</Label>
                    <select
                      value={newUser.agency_id}
                      onChange={(e) => setNewUser({ ...newUser, agency_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-background border border-border text-foreground"
                    >
                      <option value="">Selecione uma agência</option>
                      {agencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={handleAddUser} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Criar Usuário
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Agência</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-border hover:bg-accent/50">
                    <TableCell className="text-foreground">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">{user.agency_name || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_super_admin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.is_super_admin ? 'Super Admin' : 'Usuário'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
