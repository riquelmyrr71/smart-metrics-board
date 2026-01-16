import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  Users, 
  UserPlus, 
  Trash2,
  Loader2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Diamond,
  Video,
  Edit2,
  Plus,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  executive_id: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  tiktok_username: string | null;
  is_active: boolean;
}

interface AgencyFormData {
  name: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  founded_at: string;
  total_creators: number;
  total_lives: number;
  total_diamonds: number;
}

const AgencyProfilePage = () => {
  const { agency, isSuperAdmin } = useAgency();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState<AgencyFormData>({
    name: '',
    description: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Brasil',
    founded_at: '',
    total_creators: 0,
    total_lives: 0,
    total_diamonds: 0,
  });

  // New member dialog
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'associate',
    executive_id: '',
    email: '',
    phone: '',
    tiktok_username: '',
  });

  useEffect(() => {
    if (agency?.id) {
      loadData();
    }
  }, [agency?.id]);

  const loadData = async () => {
    if (!agency?.id) return;
    
    setIsLoading(true);
    try {
      // Load agency details
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agency.id)
        .single();

      if (agencyError) throw agencyError;

      // Cast to any since types may not be updated yet
      const data = agencyData as Record<string, unknown>;
      setFormData({
        name: (data.name as string) || '',
        description: (data.description as string) || '',
        website: (data.website as string) || '',
        email: (data.email as string) || '',
        phone: (data.phone as string) || '',
        address: (data.address as string) || '',
        city: (data.city as string) || '',
        state: (data.state as string) || '',
        country: (data.country as string) || 'Brasil',
        founded_at: (data.founded_at as string) || '',
        total_creators: (data.total_creators as number) || 0,
        total_lives: (data.total_lives as number) || 0,
        total_diamonds: (data.total_diamonds as number) || 0,
      });

      // Load team members
      const { data: membersData, error: membersError } = await supabase
        .from('agency_team_members')
        .select('*')
        .eq('agency_id', agency.id)
        .order('role', { ascending: false })
        .order('name');

      if (!membersError) {
        setTeamMembers(membersData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar dados da agência', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agency?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          name: formData.name,
          description: formData.description,
          website: formData.website,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          founded_at: formData.founded_at || null,
          total_creators: formData.total_creators,
          total_lives: formData.total_lives,
          total_diamonds: formData.total_diamonds,
        })
        .eq('id', agency.id);

      if (error) throw error;

      toast({ title: 'Salvo!', description: 'Dados da agência atualizados' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar dados', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!agency?.id || !newMember.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('agency_team_members')
        .insert({
          agency_id: agency.id,
          name: newMember.name.trim(),
          role: newMember.role,
          executive_id: newMember.role === 'associate' && newMember.executive_id ? newMember.executive_id : null,
          email: newMember.email || null,
          phone: newMember.phone || null,
          tiktok_username: newMember.tiktok_username || null,
        })
        .select()
        .single();

      if (error) throw error;

      setTeamMembers(prev => [...prev, data]);
      setNewMember({ name: '', role: 'associate', executive_id: '', email: '', phone: '', tiktok_username: '' });
      setShowMemberDialog(false);
      toast({ title: 'Membro adicionado!' });
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast({ title: 'Erro', description: 'Falha ao adicionar membro', variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('agency_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
      toast({ title: 'Membro removido' });
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast({ title: 'Erro', description: 'Falha ao remover membro', variant: 'destructive' });
    }
  };

  const executives = teamMembers.filter(m => m.role === 'executive' && m.is_active);
  const associates = teamMembers.filter(m => m.role === 'associate' && m.is_active);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Perfil da Agência</h1>
              <p className="text-sm text-muted-foreground">Gerencie informações e equipe da sua agência</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Alterações
          </Button>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="team">Equipe ({teamMembers.length})</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>

          {/* Informações Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados Básicos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Agência</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founded_at">Data de Fundação</Label>
                    <Input
                      id="founded_at"
                      type="date"
                      value={formData.founded_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, founded_at: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        className="pl-10"
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Localização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="address">Endereço</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Membros da Equipe</h3>
                <p className="text-sm text-muted-foreground">
                  {executives.length} executivos, {associates.length} associados
                </p>
              </div>
              <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar Membro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Membro da Equipe</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={newMember.name}
                        onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Função</Label>
                      <Select
                        value={newMember.role}
                        onValueChange={(value) => setNewMember(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="executive">Executivo</SelectItem>
                          <SelectItem value="associate">Associado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newMember.role === 'associate' && executives.length > 0 && (
                      <div className="space-y-2">
                        <Label>Executivo Responsável</Label>
                        <Select
                          value={newMember.executive_id}
                          onValueChange={(value) => setNewMember(prev => ({ ...prev, executive_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um executivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {executives.map((exec) => (
                              <SelectItem key={exec.id} value={exec.id}>
                                {exec.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email (opcional)</Label>
                        <Input
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone (opcional)</Label>
                        <Input
                          value={newMember.phone}
                          onChange={(e) => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>@ TikTok (opcional)</Label>
                      <Input
                        value={newMember.tiktok_username}
                        onChange={(e) => setNewMember(prev => ({ ...prev, tiktok_username: e.target.value }))}
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowMemberDialog(false)}>Cancelar</Button>
                    <Button onClick={handleAddMember} disabled={!newMember.name.trim()}>Adicionar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Executives */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Executivos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {executives.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum executivo cadastrado</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {executives.map((exec) => {
                      const team = associates.filter(a => a.executive_id === exec.id);
                      return (
                        <div key={exec.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 group">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={exec.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {exec.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{exec.name}</p>
                              <p className="text-xs text-muted-foreground">{team.length} associados</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(exec.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Associates */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Associados</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {associates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum associado cadastrado</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {associates.map((assoc) => {
                      const exec = executives.find(e => e.id === assoc.executive_id);
                      return (
                        <div key={assoc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={assoc.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {assoc.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{assoc.name}</p>
                              {exec && (
                                <p className="text-[10px] text-muted-foreground">
                                  {exec.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(assoc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm">Total de Criadores</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    value={formData.total_creators}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_creators: parseInt(e.target.value) || 0 }))}
                    className="text-2xl font-bold h-12"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-tiktok" />
                    <CardTitle className="text-sm">Total de Lives</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    value={formData.total_lives}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_lives: parseInt(e.target.value) || 0 }))}
                    className="text-2xl font-bold h-12"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Diamond className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-sm">Total de Diamantes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    value={formData.total_diamonds}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_diamonds: parseInt(e.target.value) || 0 }))}
                    className="text-2xl font-bold h-12"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-primary/10">
                    <p className="text-3xl font-bold text-primary">{executives.length}</p>
                    <p className="text-sm text-muted-foreground">Executivos</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-3xl font-bold">{associates.length}</p>
                    <p className="text-sm text-muted-foreground">Associados</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-3xl font-bold">{teamMembers.length}</p>
                    <p className="text-sm text-muted-foreground">Total Membros</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-3xl font-bold">
                      {executives.length > 0 ? Math.round(associates.length / executives.length) : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Média por Exec.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AgencyProfilePage;
