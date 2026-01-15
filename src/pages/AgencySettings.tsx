import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Building2, Palette, Users, Zap, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ColorPicker';
import { LogoUpload } from '@/components/LogoUpload';
import { useAgency } from '@/contexts/AgencyContext';
import { useAgencySettings, applyBrandingToDocument, AgencyBranding, AgencyFeatures } from '@/hooks/useAgencySettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function AgencySettings() {
  const navigate = useNavigate();
  const { agency, profile, isSuperAdmin } = useAgency();
  const { settings, branding, features, limits, isLoading, updateBranding, updateFeatures } = useAgencySettings();
  const { toast } = useToast();
  
  const [localBranding, setLocalBranding] = useState<AgencyBranding>(branding);
  const [localFeatures, setLocalFeatures] = useState<AgencyFeatures>(features);
  const [isSaving, setIsSaving] = useState(false);
  const [agencyName, setAgencyName] = useState(agency?.name || '');
  
  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!profile?.user_id || !agency?.id) return;
      
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .eq('agency_id', agency.id)
        .single();
        
      setIsAdmin(data?.role === 'admin' || isSuperAdmin);
    };
    
    checkAdminRole();
  }, [profile?.user_id, agency?.id, isSuperAdmin]);

  useEffect(() => {
    setLocalBranding(branding);
    setLocalFeatures(features);
    setAgencyName(agency?.name || '');
  }, [branding, features, agency?.name]);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Update branding
      const { error: brandingError } = await updateBranding(localBranding);
      if (brandingError) throw new Error(brandingError);
      
      // Update features
      const { error: featuresError } = await updateFeatures(localFeatures);
      if (featuresError) throw new Error(featuresError);
      
      // Update agency name if changed
      if (agencyName !== agency?.name) {
        const { error: nameError } = await supabase
          .from('agencies')
          .update({ name: agencyName })
          .eq('id', agency?.id);
          
        if (nameError) throw nameError;
      }
      
      // Apply branding to document
      applyBrandingToDocument(localBranding);
      
      toast({
        title: 'Configurações salvas',
        description: 'As configurações da agência foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (url: string) => {
    setLocalBranding(prev => ({ ...prev, logoUrl: url || null }));
  };

  if (!isAdmin && !isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Você não tem permissão para acessar as configurações da agência.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configurações da Agência</h1>
              <p className="text-muted-foreground">Personalize a aparência e funcionalidades</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
                <CardDescription>Nome e identidade da sua agência</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Nome da Agência</Label>
                    <Input
                      id="agencyName"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="Minha Agência"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Slogan</Label>
                    <Input
                      id="tagline"
                      value={localBranding.companyTagline || ''}
                      onChange={(e) => setLocalBranding(prev => ({ 
                        ...prev, 
                        companyTagline: e.target.value 
                      }))}
                      placeholder="Plataforma de Gestão"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <LogoUpload
                  currentLogoUrl={localBranding.logoUrl}
                  agencyId={agency?.id || ''}
                  onUploadComplete={handleLogoUpload}
                  label="Logo da Agência"
                />
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Cores da Marca
                </CardTitle>
                <CardDescription>Personalize as cores da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <ColorPicker
                    label="Cor Primária"
                    value={localBranding.primaryColor}
                    onChange={(color) => setLocalBranding(prev => ({ 
                      ...prev, 
                      primaryColor: color 
                    }))}
                  />
                  <ColorPicker
                    label="Cor de Destaque"
                    value={localBranding.accentColor}
                    onChange={(color) => setLocalBranding(prev => ({ 
                      ...prev, 
                      accentColor: color 
                    }))}
                  />
                </div>
                
                {/* Preview */}
                <div className="mt-6 p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium mb-3">Preview</p>
                  <div className="flex items-center gap-4">
                    <Button 
                      style={{ 
                        backgroundColor: `hsl(${localBranding.primaryColor})`,
                        color: `hsl(${localBranding.primaryForeground})`
                      }}
                    >
                      Botão Primário
                    </Button>
                    <div 
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: `hsl(${localBranding.primaryColor})` }}
                    >
                      {agency?.name?.charAt(0) || 'A'}
                    </div>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: `hsl(${localBranding.primaryColor})` }}
                    >
                      Texto em destaque
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Funcionalidades
                </CardTitle>
                <CardDescription>Habilite ou desabilite módulos da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: 'battles', label: 'Batalhas', description: 'Módulo de batalhas entre criadores' },
                    { key: 'creatorsAnalysis', label: 'Análise de Criadores', description: 'Métricas detalhadas de criadores' },
                    { key: 'scheduling', label: 'Agendamentos', description: 'Gestão de agendamento de lives' },
                    { key: 'charts', label: 'Gráficos', description: 'Dashboards e visualizações' },
                    { key: 'notes', label: 'Anotações', description: 'Sistema de notas e lembretes' },
                    { key: 'reports', label: 'Relatórios', description: 'Exportação de relatórios PDF' },
                  ].map((feature) => (
                    <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <Label htmlFor={feature.key} className="font-medium">
                          {feature.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      <Switch
                        id={feature.key}
                        checked={localFeatures[feature.key as keyof AgencyFeatures]}
                        onCheckedChange={(checked) => setLocalFeatures(prev => ({
                          ...prev,
                          [feature.key]: checked
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Limites do Plano
                </CardTitle>
                <CardDescription>Limites de uso baseados no seu plano atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Usuários', value: limits.maxUsers, icon: '👥' },
                    { label: 'Criadores', value: limits.maxCreators, icon: '🎭' },
                    { label: 'Lives/mês', value: limits.maxLivesPerMonth, icon: '📺' },
                    { label: 'Armazenamento', value: `${limits.storageGb} GB`, icon: '💾' },
                  ].map((limit) => (
                    <div key={limit.label} className="p-4 rounded-lg bg-muted/50 text-center">
                      <span className="text-2xl">{limit.icon}</span>
                      <p className="text-2xl font-bold text-foreground mt-2">{limit.value}</p>
                      <p className="text-sm text-muted-foreground">{limit.label}</p>
                    </div>
                  ))}
                </div>
                {isSuperAdmin && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    💡 Como super admin, você pode editar os limites diretamente no banco de dados.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
