import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, KeyRound } from "lucide-react";
import { branding } from "@/config/branding";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        toast({
          title: "Erro ao enviar código",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Código enviado!",
        description: "Verifique seu email para obter o código de acesso.",
      });
      setStep("code");
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao tentar enviar o código.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        toast({
          title: "Código inválido",
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
        description: "Ocorreu um erro ao verificar o código.",
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
      <div className="flex-1 flex relative">
        {/* Rotating red organic element in background */}
        <motion.div
          className="absolute left-1/4 top-1/2 -translate-y-1/2 pointer-events-none"
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
          className="absolute left-1/3 top-1/2 -translate-y-1/2 pointer-events-none"
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

        {/* Right side - Card positioned below logo */}
        <div className="flex-1 flex justify-end items-start pt-8 pr-12 relative z-10">
          <motion.div 
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/10 border border-gray-100 p-10 w-full max-w-md"
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Header Text */}
            <div className="mb-8">
              <motion.h1 
                className="text-3xl font-bold text-gray-900 mb-3"
                style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.03em' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Já sou uma Agência Parceira
              </motion.h1>
              <motion.p 
                className="text-base text-gray-500 leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Plataforma de gerenciamento para agências de live do TikTok. Acesse sua conta usando apenas seu email.
              </motion.p>
            </div>

            {step === "email" ? (
              /* Email Step */
              <form onSubmit={handleSendCode} className="space-y-6">
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label 
                    htmlFor="email" 
                    className="text-gray-700 text-sm font-medium flex items-center gap-2"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <Mail size={16} className="text-[#8B0000]" />
                    Seu Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#8B0000] focus:ring-[#8B0000]/20 rounded-xl transition-all text-base"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-48 h-11 bg-[#8B0000] hover:bg-[#6B0000] text-white font-medium rounded-xl shadow-lg shadow-[#8B0000]/20 hover:shadow-[#8B0000]/30 transition-all text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Entrar com Email
                        <ArrowRight size={16} />
                      </span>
                    )}
                  </Button>
                </motion.div>

                <motion.div
                  className="pt-4 border-t border-gray-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <button
                    type="button"
                    className="text-sm text-[#8B0000] hover:text-[#6B0000] font-medium transition-colors flex items-center gap-2"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <KeyRound size={14} />
                    Esqueci minha senha
                  </button>
                </motion.div>
              </form>
            ) : (
              /* Code Verification Step */
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#8B0000]/5 rounded-xl p-4 mb-4"
                >
                  <p className="text-sm text-gray-600" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Enviamos um código para <span className="font-semibold text-[#8B0000]">{email}</span>
                  </p>
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label 
                    htmlFor="code" 
                    className="text-gray-700 text-sm font-medium flex items-center gap-2"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <KeyRound size={16} className="text-[#8B0000]" />
                    Código de Verificação
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="Digite o código"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="h-12 bg-gray-50/50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#8B0000] focus:ring-[#8B0000]/20 rounded-xl transition-all text-base text-center tracking-widest font-mono"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex gap-3 pt-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("email")}
                    className="h-11 px-6 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-40 h-11 bg-[#8B0000] hover:bg-[#6B0000] text-white font-medium rounded-xl shadow-lg shadow-[#8B0000]/20 hover:shadow-[#8B0000]/30 transition-all text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verificando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Verificar
                        <ArrowRight size={16} />
                      </span>
                    )}
                  </Button>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={handleSendCode}
                  className="text-sm text-gray-500 hover:text-[#8B0000] font-medium transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Não recebeu? Reenviar código
                </motion.button>
              </form>
            )}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer 
        className="py-4 text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p 
          className="text-xs text-gray-400"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          © {new Date().getFullYear()} {branding.companyName}. Todos os direitos reservados.
        </p>
      </motion.footer>
    </div>
  );
};

export default Login;
