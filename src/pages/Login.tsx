import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, KeyRound } from "lucide-react";
import logoF from "@/assets/logo-f.png";

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
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
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
            onClick={() => navigate("/register")}
          >
            Cadastrar-se
          </Button>
        </div>
      </motion.header>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center relative px-6">
        {/* Rotating soft red organic elements around the card */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            width: '550px',
            height: '550px',
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
            width: '480px',
            height: '480px',
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
            width: '620px',
            height: '620px',
            background: 'linear-gradient(45deg, rgba(30, 30, 30, 0.02) 0%, rgba(60, 60, 60, 0.04) 50%, rgba(30, 30, 30, 0.02) 100%)',
            borderRadius: '50% 50% 45% 55% / 45% 55% 50% 50%',
          }}
          animate={{ rotate: 180 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />

        {/* Login Card */}
        <motion.div 
          className="relative z-10 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/5 border border-neutral-200/50 p-10 w-full max-w-md"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Header Text */}
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-2xl font-semibold text-neutral-900 mb-3 tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Já sou uma Agência Parceira
            </motion.h1>
            <motion.p 
              className="text-sm text-neutral-500 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Acesse sua conta usando apenas seu email
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
                  className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                >
                  <Mail size={14} className="text-neutral-400" />
                  Seu Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-base"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-2 flex justify-center"
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl shadow-lg shadow-neutral-900/10 hover:shadow-neutral-900/20 transition-all text-sm"
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
                className="pt-4 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  type="button"
                  className="text-sm text-neutral-500 hover:text-neutral-700 font-medium transition-colors flex items-center gap-2"
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
                className="bg-neutral-100/50 rounded-xl p-4 mb-4 text-center"
              >
                <p className="text-sm text-neutral-600">
                  Enviamos um código para <span className="font-semibold text-neutral-900">{email}</span>
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
                  className="text-neutral-600 text-sm font-medium flex items-center gap-2"
                >
                  <KeyRound size={14} className="text-neutral-400" />
                  Código de Verificação
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Digite o código"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="h-12 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl transition-all text-base text-center tracking-widest font-mono"
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
                  className="flex-1 h-12 border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl text-sm"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl shadow-lg shadow-neutral-900/10 transition-all text-sm"
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

              <motion.div
                className="flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-sm text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
                >
                  Não recebeu? Reenviar código
                </button>
              </motion.div>
            </form>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        className="py-4 text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Curli Agency. Todos os direitos reservados.
        </p>
      </motion.footer>
    </div>
  );
};

export default Login;
