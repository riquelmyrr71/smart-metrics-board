import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Building2, Briefcase, AtSign, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/integrations/supabase/client';
import AvatarUpload from '@/components/AvatarUpload';
import logoF from '@/assets/logo-f.png';

const CompleteProfile: React.FC = () => {
  const { profile, user, refreshProfile } = useAgency();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    companyName: '',
    jobTitle: '',
    bio: '',
    tiktokUsername: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (profile) {
      // Check if profile is already completed
      if ((profile as any).profile_completed) {
        navigate('/');
        return;
      }

      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || '',
      }));
    }
  }, [profile, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (url: string) => {
    setFormData(prev => ({ ...prev, avatarUrl: url }));
  };

  const handleNext = () => {
    if (currentStep === 1 && !formData.fullName) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha seu nome completo.',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
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
        title: 'Perfil completo!',
        description: 'Bem-vindo à plataforma.',
      });

      navigate('/');
    } catch (error) {
      console.error('Error completing profile:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível completar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Dados Básicos' },
    { number: 2, title: 'Profissional' },
    { number: 3, title: 'Finalizar' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 right-0 w-1/2 h-1/2"
          style={{
            background: 'radial-gradient(ellipse at 100% 0%, rgba(0, 161, 199, 0.05) 0%, transparent 50%)',
          }}
        />
        <div 
          className="absolute bottom-0 left-0 w-1/2 h-1/2"
          style={{
            background: 'radial-gradient(ellipse at 0% 100%, rgba(0, 161, 199, 0.03) 0%, transparent 50%)',
          }}
        />
      </div>

      <motion.div 
        className="relative z-10 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/5 border border-neutral-200/50 p-8 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center">
            <img src={logoF} alt="Logo" className="h-8 w-8 object-contain" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Complete seu perfil
          </h1>
          <p className="text-sm text-neutral-500">
            Adicione mais informações para personalizar sua experiência
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  currentStep >= step.number
                    ? 'bg-tiktok text-white'
                    : 'bg-neutral-100 text-neutral-400'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  currentStep >= step.number ? 'text-neutral-900' : 'text-neutral-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  currentStep > step.number ? 'bg-tiktok' : 'bg-neutral-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-5">
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="flex justify-center mb-6">
                <AvatarUpload
                  userId={user?.id || ''}
                  currentAvatarUrl={formData.avatarUrl}
                  onUploadComplete={handleAvatarUpload}
                  size="lg"
                  fallbackInitial={formData.fullName?.charAt(0) || 'U'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-neutral-600 text-sm font-medium flex items-center gap-2">
                  <User size={14} className="text-neutral-400" />
                  Nome Completo *
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
                <Label htmlFor="phone" className="text-neutral-600 text-sm font-medium flex items-center gap-2">
                  <Phone size={14} className="text-neutral-400" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktokUsername" className="text-neutral-600 text-sm font-medium flex items-center gap-2">
                  <AtSign size={14} className="text-neutral-400" />
                  Username TikTok
                </Label>
                <Input
                  id="tiktokUsername"
                  value={formData.tiktokUsername}
                  onChange={(e) => handleChange('tiktokUsername', e.target.value)}
                  placeholder="@seuusername"
                  className="h-11 rounded-xl"
                />
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-neutral-600 text-sm font-medium flex items-center gap-2">
                  <Building2 size={14} className="text-neutral-400" />
                  Empresa
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Nome da sua empresa"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobTitle" className="text-neutral-600 text-sm font-medium flex items-center gap-2">
                  <Briefcase size={14} className="text-neutral-400" />
                  Cargo
                </Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  placeholder="Seu cargo"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-neutral-600 text-sm font-medium flex items-center gap-2">
                  <FileText size={14} className="text-neutral-400" />
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Conte um pouco sobre você..."
                  className="min-h-[100px] rounded-xl resize-none"
                />
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center py-6"
            >
              <div className="h-20 w-20 rounded-full bg-tiktok/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-tiktok" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Tudo pronto!
              </h2>
              <p className="text-sm text-neutral-500 mb-6">
                Seu perfil está completo. Clique em finalizar para acessar a plataforma.
              </p>

              {/* Summary */}
              <div className="bg-neutral-50 rounded-2xl p-4 text-left space-y-2">
                {formData.fullName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Nome:</span>
                    <span className="text-neutral-900 font-medium">{formData.fullName}</span>
                  </div>
                )}
                {formData.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Telefone:</span>
                    <span className="text-neutral-900">{formData.phone}</span>
                  </div>
                )}
                {formData.companyName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Empresa:</span>
                    <span className="text-neutral-900">{formData.companyName}</span>
                  </div>
                )}
                {formData.jobTitle && (
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Cargo:</span>
                    <span className="text-neutral-900">{formData.jobTitle}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-11 rounded-xl"
            >
              Voltar
            </Button>
          )}
          
          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              className="flex-1 h-11 rounded-xl gap-2"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-11 rounded-xl gap-2 bg-tiktok hover:bg-tiktok/90"
            >
              {isLoading ? 'Finalizando...' : 'Finalizar'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip Option */}
        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-sm text-neutral-400 hover:text-neutral-600 mt-4 transition-colors"
        >
          Preencher depois
        </button>
      </motion.div>
    </div>
  );
};

export default CompleteProfile;
