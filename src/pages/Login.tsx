import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, TrendingUp } from "lucide-react";
import { branding } from "@/config/branding";
import loginBg from "@/assets/login-bg.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo ao painel.",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao tentar fazer login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8, rotate: -10 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  const imageSlideVariants = {
    hidden: { x: 100, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - Form */}
      <div className="w-full lg:w-[60%] flex flex-col bg-background relative z-20">
        {/* Header Navigation - ClickUp style */}
        <motion.header 
          className="w-full px-8 py-4 flex items-center justify-between border-b border-border/50"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <motion.div 
              className="h-10 w-10 rounded-xl bg-[#8B0000] flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
            </motion.div>
            <span className="text-lg font-bold text-foreground">{branding.companyName}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={activeTab === "login" ? "outline" : "ghost"}
              className={`px-6 ${activeTab === "login" ? "border-[#8B0000] text-[#8B0000]" : "text-muted-foreground"}`}
              onClick={() => setActiveTab("login")}
            >
              Login
            </Button>
            <Button 
              variant={activeTab === "register" ? "default" : "ghost"}
              className={`px-6 ${activeTab === "register" ? "bg-[#8B0000] hover:bg-[#6B0000] text-white" : "text-muted-foreground"}`}
              onClick={() => setActiveTab("register")}
            >
              Cadastrar
            </Button>
          </div>
        </motion.header>

        {/* Form Content */}
        <div className="flex-1 flex items-center justify-center p-8 relative">
          {/* Rotating organic shapes around card */}
          <motion.div
            className="absolute w-[480px] h-[440px] border-2 border-dashed border-muted-foreground/20"
            style={{ borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute w-[520px] h-[480px] border border-muted-foreground/10"
            style={{ borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
          
          <motion.div 
            className="w-full max-w-md space-y-6 relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Platform Description */}
            <motion.div className="text-center space-y-2" variants={itemVariants}>
              <motion.div variants={logoVariants}>
                <h1 className="text-2xl font-bold text-foreground">
                  {activeTab === "login" ? "Já sou uma Agência Parceira" : "Criar Nova Conta"}
                </h1>
              </motion.div>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Plataforma profissional de gerenciamento para agências de live do TikTok. 
                Centralize métricas, relatórios e análises do seu time.
              </p>
            </motion.div>

            {/* Login Form */}
            <motion.form 
              onSubmit={handleLogin} 
              className="space-y-5 bg-card p-8 rounded-2xl border border-border shadow-xl backdrop-blur-sm"
              variants={itemVariants}
            >
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#8B0000] focus:ring-[#8B0000]/20 transition-all duration-200"
                />
              </motion.div>
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <Label htmlFor="password" className="text-foreground font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#8B0000] focus:ring-[#8B0000]/20 pr-12 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </motion.div>
              
              {activeTab === "login" && (
                <motion.button
                  type="button"
                  className="text-sm text-[#8B0000] hover:text-[#6B0000] font-medium transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                >
                  Esqueci minha senha
                </motion.button>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#8B0000] hover:bg-[#6B0000] text-white font-semibold shadow-lg shadow-[#8B0000]/25 hover:shadow-[#8B0000]/40 transition-all text-base"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {activeTab === "login" ? "Entrando..." : "Cadastrando..."}
                    </span>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      {activeTab === "login" ? "Entrar" : "Criar Conta"}
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.p 
              className="text-center text-xs text-muted-foreground"
              variants={itemVariants}
            >
              © {new Date().getFullYear()} {branding.companyName}. Todos os direitos reservados.
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Image with rotating organic shape */}
      <motion.div 
        className="hidden lg:block lg:w-[40%] relative"
        variants={imageSlideVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Background image */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            backgroundImage: `url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
          }}
        />
        
        {/* Subtle gradient overlay */}
        <div 
          className="absolute inset-0 z-5"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 60%)',
          }}
        />
      </motion.div>
    </div>
  );
};

export default Login;
