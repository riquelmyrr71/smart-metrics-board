import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Target, Zap, Award } from "lucide-react";
import logoF from "@/assets/logo-f.png";

const AboutPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Equipe Especializada",
      description: "Profissionais dedicados ao crescimento de agências de live no TikTok."
    },
    {
      icon: Target,
      title: "Foco em Resultados",
      description: "Métricas claras e objetivos mensuráveis para o sucesso da sua agência."
    },
    {
      icon: Zap,
      title: "Tecnologia Avançada",
      description: "Ferramentas modernas para gerenciamento eficiente de criadores."
    },
    {
      icon: Award,
      title: "Excelência",
      description: "Compromisso com a qualidade e satisfação dos nossos parceiros."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex flex-col relative overflow-hidden">
      {/* Subtle background elements */}
      <div 
        className="absolute top-0 right-0 w-[60%] h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 100% 0%, rgba(139, 0, 0, 0.03) 0%, transparent 60%)',
        }}
      />

      {/* Header */}
      <motion.header 
        className="w-full relative z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div 
          className="absolute top-0 left-0 h-20"
          style={{
            width: '280px',
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
            borderRadius: '0 0 50% 0',
          }}
        />
        
        <div className="relative px-8 py-5 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate("/login")}
          >
            <img src={logoF} alt="Logo" className="h-10 w-auto object-contain" />
          </motion.div>
          
          <nav className="hidden md:flex items-center gap-8">
            <span className="text-sm text-neutral-900 font-semibold tracking-wide">Sobre</span>
            <a href="/recursos" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide">Recursos</a>
            <a href="/contato" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide">Contato</a>
          </nav>

          <Button 
            variant="outline"
            className="px-6 py-2 bg-transparent border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all duration-300 font-medium rounded-full text-sm"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 px-8 py-16 max-w-6xl mx-auto w-full">
        {/* Back button */}
        <motion.button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors mb-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Voltar</span>
        </motion.button>

        {/* Hero Section */}
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 mb-6 tracking-tight">
            Sobre Nós
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Somos uma plataforma dedicada ao gerenciamento de agências de live do TikTok, 
            conectando criadores e oportunidades de forma eficiente.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-neutral-200/50 shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center mb-4">
                <feature.icon size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">{feature.title}</h3>
              <p className="text-neutral-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Mission Section */}
        <motion.div 
          className="text-center bg-neutral-900 rounded-3xl p-12 text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-2xl font-semibold mb-4">Nossa Missão</h2>
          <p className="text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Empoderar agências de live com ferramentas inteligentes que simplificam 
            o gerenciamento, maximizam resultados e criam conexões duradouras entre 
            criadores e audiências.
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        className="py-6 text-center relative z-10 border-t border-neutral-200/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Curli Agency. Todos os direitos reservados.
        </p>
      </motion.footer>
    </div>
  );
};

export default AboutPage;
