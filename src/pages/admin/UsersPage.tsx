import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Loader2, Pencil, Shield, Building2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  agency_id: string | null;
  full_name: string | null;
  email: string;
  is_super_admin: boolean;
  created_at: string;
}

interface Agency {
  id: string;
  name: string;
}

interface UserRole {
  id: string;
  user_id: string;
  agency_id: string;
  role: string;
}

const AdminUsersPage = () => {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    agency_id: '',
    role: 'user',
    is_super_admin: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [profilesRes, agenciesRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('agencies').select('id, name').order('name'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (agenciesRes.error) throw agenciesRes.error;

      setProfiles(profilesRes.data as Profile[]);
      setAgencies(agenciesRes.data as Agency[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      agency_id: profile.agency_id || '',
      role: 'user',
      is_super_admin: profile.is_super_admin,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSubmitting(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          agency_id: formData.agency_id || null,
          is_super_admin: formData.is_super_admin,
        })
        .eq('id', editingProfile.id);

      if (profileError) throw profileError;

      // Update or create user role if agency is selected
      if (formData.agency_id) {
        const roleValue = formData.role as 'admin' | 'manager' | 'super_admin' | 'user';
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', editingProfile.user_id)
          .eq('agency_id', formData.agency_id)
          .single();

        if (existingRole) {
          await supabase
            .from('user_roles')
            .update({ role: roleValue })
            .eq('id', existingRole.id);
        } else {
          await supabase.from('user_roles').insert([{
            user_id: editingProfile.user_id,
            agency_id: formData.agency_id,
            role: roleValue,
          }]);
        }
      }

      toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso' });
      setIsDialogOpen(false);
      setEditingProfile(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o usuário',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAgencyName = (agencyId: string | null) => {
    if (!agencyId) return 'Sem agência';
    return agencies.find((a) => a.id === agencyId)?.name || 'Desconhecida';
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Acesso não autorizado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie os usuários e suas permissões na plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários Cadastrados
          </CardTitle>
          <CardDescription>
            Total de {profiles.length} usuários cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {getAgencyName(profile.agency_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile.is_super_admin ? (
                        <Badge className="bg-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Super Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Usuário</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(profile)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize a agência e permissões do usuário
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <p className="text-sm text-muted-foreground">
                  {editingProfile?.full_name || editingProfile?.email}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency">Agência</Label>
                <Select
                  value={formData.agency_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, agency_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma agência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem agência</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.agency_id && (
                <div className="space-y-2">
                  <Label htmlFor="role">Função na Agência</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="manager">Gestor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_super_admin"
                  checked={formData.is_super_admin}
                  onChange={(e) =>
                    setFormData({ ...formData, is_super_admin: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_super_admin" className="text-sm">
                  Super Admin (acesso total à plataforma)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsersPage;
