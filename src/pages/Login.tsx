import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { branding } from "@/config/branding";

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

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Stylish Header */}
      <motion.header 
        className="w-full px-8 py-4 flex items-center justify-between relative z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#8B0000] to-[#B22222] flex items-center justify-center shadow-lg shadow-[#8B0000]/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="text-white font-bold text-lg" style={{ fontFamily: "'Inter', sans-serif" }}>C</span>
          </motion.div>
          <span 
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}
          >
            {branding.companyName}
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a 
            href="#" 
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Sobre
          </a>
          <a 
            href="#" 
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Recursos
          </a>
          <a 
            href="#" 
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Contato
          </a>
        </nav>

        <Button 
          variant="outline"
          className="px-6 py-2 border-[#8B0000]/30 text-[#8B0000] hover:bg-[#8B0000] hover:text-white transition-all duration-300 font-medium rounded-full text-sm"
          style={{ fontFamily: "'Inter', sans-serif" }}
          onClick={() => navigate("/register")}
        >
          Cadastrar-se
        </Button>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Rotating red organic element in background */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '800px',
            height: '800px',
            background: 'linear-gradient(135deg, #8B0000 0%, #B22222 50%, #8B0000 100%)',
            borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
            opacity: 0.08,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '600px',
            height: '600px',
            background: 'linear-gradient(225deg, #8B0000 0%, #DC143C 50%, #8B0000 100%)',
            borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
            opacity: 0.05,
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10 w-full max-w-sm px-6">
          {/* Login Card */}
          <motion.div 
            className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/5 border border-gray-100 p-8"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.h1 
                className="text-2xl font-semibold text-gray-900 mb-2"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Já sou uma Agência Parceira
              </motion.h1>
              <motion.p 
                className="text-sm text-gray-500 leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Plataforma de gerenciamento para agências de live do TikTok
              </motion.p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label 
                  htmlFor="email" 
                  className="text-gray-700 text-sm font-medium"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#8B0000] focus:ring-[#8B0000]/20 rounded-xl transition-all"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Label 
                  htmlFor="password" 
                  className="text-gray-700 text-sm font-medium"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
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
                    className="h-11 bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#8B0000] focus:ring-[#8B0000]/20 pr-11 rounded-xl transition-all"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </motion.div>

              <motion.button
                type="button"
                className="text-xs text-[#8B0000] hover:text-[#6B0000] font-medium transition-colors"
                style={{ fontFamily: "'Inter', sans-serif" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
              >
                Esqueci minha senha
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-[#8B0000] hover:bg-[#6B0000] text-white font-medium rounded-xl shadow-lg shadow-[#8B0000]/20 hover:shadow-[#8B0000]/30 transition-all text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Entrar
                      <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          {/* Footer */}
          <motion.p 
            className="text-center text-xs text-gray-400 mt-6"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            © {new Date().getFullYear()} {branding.companyName}
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default Login;
