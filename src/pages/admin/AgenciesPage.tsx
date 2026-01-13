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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, Loader2, Trash2, Pencil } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminAgenciesPage = () => {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgencies(data as Agency[]);
    } catch (error) {
      console.error('Error fetching agencies:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as agências',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAgencies();
    }
  }, [isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
      
      if (editingAgency) {
        const { error } = await supabase
          .from('agencies')
          .update({ name: formData.name, slug })
          .eq('id', editingAgency.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Agência atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('agencies')
          .insert({ name: formData.name, slug });

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Agência criada com sucesso' });
      }

      setIsDialogOpen(false);
      setEditingAgency(null);
      setFormData({ name: '', slug: '' });
      fetchAgencies();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a agência',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (agency: Agency) => {
    setEditingAgency(agency);
    setFormData({ name: agency.name, slug: agency.slug });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta agência?')) return;

    try {
      const { error } = await supabase.from('agencies').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Agência excluída com sucesso' });
      fetchAgencies();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a agência',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (agency: Agency) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ is_active: !agency.is_active })
        .eq('id', agency.id);

      if (error) throw error;
      fetchAgencies();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a agência',
        variant: 'destructive',
      });
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Agências</h1>
          <p className="text-muted-foreground">
            Crie e gerencie as agências da plataforma
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingAgency(null);
            setFormData({ name: '', slug: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Agência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAgency ? 'Editar Agência' : 'Nova Agência'}
              </DialogTitle>
              <DialogDescription>
                {editingAgency
                  ? 'Edite os dados da agência'
                  : 'Preencha os dados para criar uma nova agência'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Agência</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da agência"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="nome-da-agencia"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para gerar automaticamente
                  </p>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agências Cadastradas
          </CardTitle>
          <CardDescription>
            Total de {agencies.length} agências cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma agência cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((agency) => (
                  <TableRow key={agency.id}>
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell className="text-muted-foreground">{agency.slug}</TableCell>
                    <TableCell>
                      <Badge
                        variant={agency.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleActive(agency)}
                      >
                        {agency.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(agency.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(agency)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(agency.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgenciesPage;
