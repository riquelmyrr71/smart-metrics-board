import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, KeyRound, User, Phone, Building2, ArrowLeft } from "lucide-react";
import logoF from "@/assets/logo-f.png";

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    agencyCode: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro de validação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Verify the agency code exists
      const { data: codeData, error: codeError } = await supabase
        .from("agency_login_codes")
        .select("id, agency_id, email")
        .eq("code", formData.agencyCode.trim())
        .eq("is_active", true)
        .single();

      if (codeError || !codeData) {
        toast({
          title: "Código inválido",
          description: "O código da agência informado não é válido.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create the user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            company_name: formData.companyName,
          },
        },
      });

      if (signUpError) {
        toast({
          title: "Erro ao criar conta",
          description: signUpError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (signUpData.user) {
        // Update the agency_login_codes with the new email if different
        if (codeData.email !== formData.email.toLowerCase().trim()) {
          await supabase
            .from("agency_login_codes")
            .update({ email: formData.email.toLowerCase().trim() })
            .eq("id", codeData.id);
        }

        // Update profile with initial data
        await supabase
          .from("profiles")
          .update({
            full_name: formData.fullName,
            phone: formData.phone,
            company_name: formData.companyName,
            agency_id: codeData.agency_id,
          })
          .eq("user_id", signUpData.user.id);

        toast({
          title: "Conta criada com sucesso!",
          description: "Complete seu perfil para continuar.",
        });
        navigate("/completar-perfil");
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao criar a conta.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex flex-col relative overflow-hidden">
      {/* Subtle organic background shapes */}
      <div 
        className="absolute top-0 right-0 w-[60%] h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 100% 0%, rgba(30, 30, 30, 0.03) 0%, transparent 60%)',
        }}
      />
      
      {/* Header with dark curved section on the left */}
      <motion.header 
        className="w-full relative z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Dark curved header background - positioned more to the left */}
        <div 
          className="absolute top-0 left-0 h-20"
          style={{
            width: '280px',
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
            borderRadius: '0 0 50% 0',
          }}
        />
        
        <div className="relative px-8 py-5 flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
            onClick={() => navigate("/login")}
          >
            <img src={logoF} alt="Logo" className="h-10 w-auto object-contain" />
          </motion.div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a 
              href="/sobre" 
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide"
            >
              Sobre
            </a>
            <a 
              href="/recursos" 
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide"
            >
              Recursos
            </a>
            <a 
              href="/contato" 
              className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide"
            >
              Contato
            </a>
          </nav>

          {/* CTA Button */}
          <Button 
            variant="outline"
            className="px-6 py-2 bg-transparent border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all duration-300 font-medium rounded-full text-sm"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
        </div>
      </motion.header>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center relative px-6 py-8">
        {/* Rotating soft red organic elements around the card */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '650px',
            height: '650px',
            background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.08) 0%, rgba(178, 34, 34, 0.12) 50%, rgba(139, 0, 0, 0.06) 100%)',
            borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
            filter: 'blur(2px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '580px',
            height: '580px',
            background: 'linear-gradient(225deg, rgba(139, 0, 0, 0.05) 0%, rgba(220, 20, 60, 0.08) 50%, rgba(139, 0, 0, 0.04) 100%)',
            borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
            filter: 'blur(1px)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '720px',
            height: '720px',
            background: 'linear-gradient(45deg, rgba(30, 30, 30, 0.02) 0%, rgba(60, 60, 60, 0.04) 50%, rgba(30, 30, 30, 0.02) 100%)',
            borderRadius: '50% 50% 45% 55% / 45% 55% 50% 50%',
          }}
          animate={{ rotate: 180 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />

        {/* Register Card */}
        <motion.div 
          className="relative z-10 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/5 border border-neutral-200/50 p-10 w-full max-w-lg"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Back button */}
          <motion.button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mb-6"
            whileHover={{ x: -3 }}
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Voltar ao login</span>
          </motion.button>

          {/* Header Text */}
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-2xl font-semibold text-neutral-900 mb-3 tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              Criar sua conta
            </motion.h1>
            <motion.p 
              className="text-sm text-neutral-500 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Preencha os dados abaixo para se cadastrar na plataforma
            </motion.p>
          </div>

          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* User Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Informações Pessoais</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="fullName" 
                    className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                  >
                    <User size={14} className="text-neutral-400" />
                    Nome Completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                    className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="phone" 
                    className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                  >
                    <Phone size={14} className="text-neutral-400" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                >
                  <Mail size={14} className="text-neutral-400" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="companyName" 
                  className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                >
                  <Building2 size={14} className="text-neutral-400" />
                  Nome da Empresa/Agência
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-sm"
                />
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Senha de Acesso</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className="text-neutral-600 text-sm font-medium"
                  >
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label 
                    htmlFor="confirmPassword" 
                    className="text-neutral-600 text-sm font-medium"
                  >
                    Confirmar Senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    required
                    className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Agency Code Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Código da Agência</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="agencyCode" 
                  className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                >
                  <KeyRound size={14} className="text-neutral-400" />
                  Código de 6 Dígitos
                </Label>
                <Input
                  id="agencyCode"
                  type="text"
                  placeholder="000000"
                  value={formData.agencyCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    handleChange("agencyCode", value);
                  }}
                  required
                  maxLength={6}
                  className="h-14 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-2xl text-center tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-neutral-400 text-center mt-2">
                  Insira o código fornecido pela administração para vincular sua conta
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || formData.agencyCode.length !== 6}
              className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl shadow-lg shadow-neutral-900/10 hover:shadow-neutral-900/20 transition-all text-sm mt-6 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Criando conta...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Criar Conta
                  <ArrowRight size={16} />
                </span>
              )}
            </Button>

            <p className="text-xs text-neutral-400 text-center pt-2">
              Ao criar sua conta, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </motion.form>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        className="relative z-10 py-6 px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>© 2025 LiveMetrics. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-neutral-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-neutral-600 transition-colors">Termos</a>
            <a href="#" className="hover:text-neutral-600 transition-colors">Suporte</a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Register;
