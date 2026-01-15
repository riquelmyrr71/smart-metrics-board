import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Building2, Calendar, Shield, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProfilePage: React.FC = () => {
  const { profile, agency, user } = useAgency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        email: profile.email || '',
        phone: '',
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold">
                {formData.fullName?.charAt(0)?.toUpperCase() || formData.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <CardTitle className="text-xl">{formData.fullName || 'Usuário'}</CardTitle>
                <CardDescription>{formData.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Info */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-tiktok" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm text-muted-foreground">
                Nome Completo
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Seu nome completo"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={formData.email}
                disabled
                className="h-11 rounded-xl bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Agency Info */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-tiktok" />
              Agência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                {agency?.logo_url ? (
                  <img 
                    src={agency.logo_url} 
                    alt={agency.name} 
                    className="h-10 w-10 rounded-lg object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                    {agency?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{agency?.name || 'Agência'}</p>
                  <p className="text-sm text-muted-foreground">{agency?.slug || 'slug'}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                agency?.is_active 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {agency?.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-tiktok" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Membro desde</span>
              <span className="text-sm font-medium text-foreground">
                {profile?.created_at 
                  ? format(new Date(profile.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : '-'
                }
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">ID do usuário</span>
              <span className="text-xs font-mono text-muted-foreground">
                {profile?.user_id?.slice(0, 8)}...
              </span>
            </div>
            {profile?.is_super_admin && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Tipo de conta</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-tiktok/10 text-tiktok">
                  Super Admin
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="rounded-xl gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;