import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-8 bg-background relative z-20">
        {/* Organic curved shape overlay */}
        <div 
          className="absolute top-0 right-0 w-[120px] h-full hidden lg:block"
          style={{
            background: 'hsl(var(--background))',
            clipPath: 'ellipse(100% 80% at 0% 50%)',
            zIndex: 30,
            marginRight: '-60px',
          }}
        />
        
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-[#8B0000] flex items-center justify-center shadow-lg shadow-[#8B0000]/30">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {branding.companyName}
              </h1>
              <p className="text-muted-foreground mt-2">
                {branding.companyTagline}
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6 bg-card/80 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-xl">
            <div className="space-y-2">
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
                className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#8B0000] focus:ring-[#8B0000]/20"
              />
            </div>
            <div className="space-y-2">
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
                  className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-[#8B0000] focus:ring-[#8B0000]/20 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
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
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {branding.companyName}. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right side - Image with organic shape overlay */}
      <div className="hidden lg:block lg:w-[45%] relative">
        {/* Dark red organic shape */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: '#8B0000',
            clipPath: 'ellipse(70% 100% at 100% 50%)',
          }}
        />
        
        {/* Background image */}
        <div 
          className="absolute inset-0 z-0"
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
      </div>
    </div>
  );
};

export default Login;
