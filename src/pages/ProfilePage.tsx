import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Building2, Calendar, Shield, Save, ArrowLeft, Briefcase, AtSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import AvatarUpload from '@/components/AvatarUpload';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProfilePage: React.FC = () => {
  const { profile, agency, user, refreshProfile } = useAgency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    jobTitle: '',
    bio: '',
    tiktokUsername: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.full_name || '',
        email: profile.email || '',
        phone: (profile as any).phone || '',
        companyName: (profile as any).company_name || '',
        jobTitle: (profile as any).job_title || '',
        bio: (profile as any).bio || '',
        tiktokUsername: (profile as any).tiktok_username || '',
        avatarUrl: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (url: string) => {
    setFormData(prev => ({ ...prev, avatarUrl: url }));
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          company_name: formData.companyName,
          job_title: formData.jobTitle,
          bio: formData.bio,
          tiktok_username: formData.tiktokUsername,
          avatar_url: formData.avatarUrl,
          profile_completed: true,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();

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
      <div className="max-w-3xl mx-auto space-y-8 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e profissionais</p>
          </div>
        </div>

        {/* Avatar & Header Card */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-tiktok/10 via-primary/5 to-transparent" />
          <CardContent className="relative pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-12">
              <AvatarUpload
                userId={user?.id || ''}
                currentAvatarUrl={formData.avatarUrl}
                onUploadComplete={handleAvatarUpload}
                size="lg"
                fallbackInitial={formData.fullName?.charAt(0) || formData.email?.charAt(0) || 'U'}
              />
              <div className="flex-1 text-center sm:text-left pb-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {formData.fullName || 'Seu Nome'}
                </h2>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
                {formData.jobTitle && (
                  <p className="text-sm text-tiktok mt-1">{formData.jobTitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-tiktok" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Dados básicos do seu perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                  Nome Completo
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-11 rounded-xl border-border/50 focus:border-tiktok/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="h-11 rounded-xl bg-muted/50 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-11 rounded-xl border-border/50 focus:border-tiktok/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktokUsername" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  Username TikTok
                </Label>
                <Input
                  id="tiktokUsername"
                  value={formData.tiktokUsername}
                  onChange={(e) => handleChange('tiktokUsername', e.target.value)}
                  placeholder="@seuusername"
                  className="h-11 rounded-xl border-border/50 focus:border-tiktok/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Bio
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Conte um pouco sobre você..."
                className="min-h-[100px] rounded-xl border-border/50 focus:border-tiktok/50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-tiktok" />
              Informações Profissionais
            </CardTitle>
            <CardDescription>
              Dados sobre sua empresa e cargo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Empresa
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Nome da sua empresa"
                  className="h-11 rounded-xl border-border/50 focus:border-tiktok/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium text-foreground">
                  Cargo
                </Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  placeholder="Seu cargo na empresa"
                  className="h-11 rounded-xl border-border/50 focus:border-tiktok/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agency Info */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-tiktok" />
              Agência Vinculada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-4">
                {agency?.logo_url ? (
                  <img 
                    src={agency.logo_url} 
                    alt={agency.name} 
                    className="h-12 w-12 rounded-xl object-contain bg-white p-1"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                    {agency?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{agency?.name || 'Agência'}</p>
                  <p className="text-sm text-muted-foreground">{agency?.slug || 'slug'}</p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                agency?.is_active 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {agency?.is_active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-tiktok" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Membro desde</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {profile?.created_at 
                    ? format(new Date(profile.created_at), "dd MMM yyyy", { locale: ptBR })
                    : '-'
                  }
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                <span className="text-sm text-muted-foreground">ID</span>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                  {profile?.user_id?.slice(0, 8)}...
                </span>
              </div>
            </div>

            {profile?.is_super_admin && (
              <div className="flex items-center justify-between p-3 bg-tiktok/5 rounded-xl border border-tiktok/20">
                <span className="text-sm font-medium text-foreground">Tipo de conta</span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-tiktok/10 text-tiktok">
                  Super Admin
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-4">
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            size="lg"
            className="rounded-xl gap-2 shadow-lg hover:shadow-xl transition-all"
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
