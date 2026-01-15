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
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-background relative z-20">
        {/* Organic curved shape overlay */}
        <motion.div 
          className="absolute top-0 right-0 w-[120px] h-full hidden lg:block"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            background: 'hsl(var(--background))',
            clipPath: 'ellipse(100% 80% at 0% 50%)',
            zIndex: 30,
            marginRight: '-60px',
          }}
        />
        
        <motion.div 
          className="w-full max-w-md space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo and Header */}
          <motion.div className="text-center space-y-4" variants={itemVariants}>
            <motion.div className="flex justify-center" variants={logoVariants}>
              <motion.div 
                className="h-16 w-16 rounded-2xl bg-[#8B0000] flex items-center justify-center shadow-lg shadow-[#8B0000]/30"
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <TrendingUp className="h-8 w-8 text-white" />
              </motion.div>
            </motion.div>
            <motion.div variants={itemVariants}>
              <h1 className="text-3xl font-bold text-foreground">
                {branding.companyName}
              </h1>
              <p className="text-muted-foreground mt-2">
                {branding.companyTagline}
              </p>
            </motion.div>
          </motion.div>

          {/* Login Form */}
          <motion.form 
            onSubmit={handleLogin} 
            className="space-y-6 bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-xl"
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
                    Entrando...
                  </span>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Entrar
                  </>
                )}
              </Button>
            </motion.div>
          </motion.form>

          {/* Footer */}
          <motion.p 
            className="text-center text-sm text-muted-foreground"
            variants={itemVariants}
          >
            © {new Date().getFullYear()} {branding.companyName}. Todos os direitos reservados.
          </motion.p>
        </motion.div>
      </div>

      {/* Right side - Image with organic shape overlay */}
      <motion.div 
        className="hidden lg:block lg:w-[45%] relative"
        variants={imageSlideVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Dark red organic shape */}
        <motion.div 
          className="absolute inset-0 z-10"
          initial={{ clipPath: 'ellipse(0% 100% at 100% 50%)' }}
          animate={{ clipPath: 'ellipse(70% 100% at 100% 50%)' }}
          transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            background: '#8B0000',
          }}
        />
        
        {/* Background image */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{
            backgroundImage: `url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Gradient overlay on image */}
        <div 
          className="absolute inset-0 z-5"
          style={{
            background: 'linear-gradient(135deg, rgba(139,0,0,0.3) 0%, transparent 50%)',
          }}
        />
      </motion.div>
    </div>
  );
};

export default Login;
