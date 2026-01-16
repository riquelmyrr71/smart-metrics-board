import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, KeyRound, Lock } from "lucide-react";
import logoF from "@/assets/logo-f.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if email exists in agency_login_codes
      const { data: codeData, error } = await supabase
        .from("agency_login_codes")
        .select("id, email")
        .eq("email", email.toLowerCase().trim())
        .eq("is_active", true)
        .single();

      if (error || !codeData) {
        toast({
          title: "Email não encontrado",
          description: "Este email não está cadastrado como agência parceira.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Email exists, proceed to code step
      setStep("code");
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao verificar o email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verify the code matches for this email
      const { data: codeData, error } = await supabase
        .from("agency_login_codes")
        .select("id, email, code, agency_id")
        .eq("email", email.toLowerCase().trim())
        .eq("code", code.trim())
        .eq("is_active", true)
        .single();

      if (error || !codeData) {
        toast({
          title: "Código inválido",
          description: "O código informado está incorreto.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Code is correct, proceed to password step
      setStep("password");
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error.message === "Invalid login credentials" 
            ? "Senha incorreta. Tente novamente." 
            : error.message,
          variant: "destructive",
        });
        setIsLoading(false);
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
        description: "Ocorreu um erro ao fazer login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "email":
        return "Acesse sua conta";
      case "code":
        return "Código da Agência";
      case "password":
        return "Digite sua senha";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "email":
        return "Digite o email cadastrado da sua agência";
      case "code":
        return "Digite o código de 6 dígitos da sua agência";
      case "password":
        return "Digite sua senha para acessar o painel";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Header */}
      <motion.header 
        className="w-full relative z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Dark curved header background */}
        <div 
          className="absolute top-0 left-0 h-20"
          style={{
            width: '280px',
            background: 'hsl(var(--card))',
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium tracking-wide"
            >
              Sobre
            </a>
            <a 
              href="/recursos" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium tracking-wide"
            >
              Recursos
            </a>
            <a 
              href="/contato" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium tracking-wide"
            >
              Contato
            </a>
          </nav>

          {/* CTA Button */}
          <Button 
            variant="outline"
            className="px-6 py-2 rounded-full text-sm"
            onClick={() => navigate("/register")}
          >
            Cadastrar-se
          </Button>
        </div>
      </motion.header>

      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center relative px-6">
        {/* Subtle background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, hsl(var(--tiktok)) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Login Card */}
        <motion.div 
          className="relative z-10 bg-card backdrop-blur-xl rounded-2xl shadow-2xl border border-border p-10 w-full max-w-md"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {["email", "code", "password"].map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s 
                    ? "w-8 bg-foreground" 
                    : i < ["email", "code", "password"].indexOf(step)
                      ? "w-4 bg-muted-foreground"
                      : "w-4 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Header Text */}
          <div className="mb-8 text-center">
            <motion.h1 
              key={step}
              className="text-2xl font-semibold text-foreground mb-3 tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {getStepTitle()}
            </motion.h1>
            <motion.p 
              key={`desc-${step}`}
              className="text-sm text-muted-foreground leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {getStepDescription()}
            </motion.p>
          </div>

          {step === "email" && (
            <motion.form 
              onSubmit={handleEmailSubmit} 
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-muted-foreground text-sm font-medium flex items-center gap-2"
                >
                  <Mail size={14} className="text-muted-foreground" />
                  Email da Agência
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agencia@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-12 rounded-xl transition-all text-base"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-sm"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continuar
                    <ArrowRight size={16} />
                  </span>
                )}
              </Button>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors flex items-center gap-2"
                >
                  <KeyRound size={14} />
                  Esqueci meus dados
                </button>
              </div>
            </motion.form>
          )}

          {step === "code" && (
            <motion.form 
              onSubmit={handleCodeSubmit} 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="code" 
                  className="text-muted-foreground text-sm font-medium flex items-center gap-2"
                >
                  <KeyRound size={14} className="text-muted-foreground" />
                  Código da Agência
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(value);
                  }}
                  required
                  autoFocus
                  maxLength={6}
                  className="h-14 rounded-xl transition-all text-2xl text-center tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  O código foi fornecido pela administração
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  className="flex-1 h-12 rounded-xl text-sm"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || code.length !== 6}
                  className="flex-1 h-12 rounded-xl text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Verificando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continuar
                      <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </div>
            </motion.form>
          )}

          {step === "password" && (
            <motion.form 
              onSubmit={handlePasswordSubmit} 
              className="space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-muted-foreground text-sm font-medium flex items-center gap-2"
                >
                  <Lock size={14} className="text-muted-foreground" />
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="h-12 rounded-xl transition-all text-base"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("code");
                    setPassword("");
                  }}
                  className="flex-1 h-12 rounded-xl text-sm"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || password.length < 6}
                  className="flex-1 h-12 rounded-xl text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Entrar
                      <ArrowRight size={16} />
                    </span>
                  )}
                </Button>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </motion.form>
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
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Curli Agency. Todos os direitos reservados.
        </p>
      </motion.footer>
    </div>
  );
};

export default Login;
