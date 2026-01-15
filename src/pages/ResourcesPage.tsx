import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Calendar, Users, FileText, Shield, Zap } from "lucide-react";
import logoF from "@/assets/logo-f.png";

const ResourcesPage = () => {
  const navigate = useNavigate();

  const resources = [
    {
      icon: BarChart3,
      title: "Dashboard Analítico",
      description: "Visualize métricas em tempo real com gráficos interativos e relatórios detalhados.",
      tag: "Analytics"
    },
    {
      icon: Calendar,
      title: "Agendamentos",
      description: "Gerencie a agenda de lives dos criadores com facilidade e eficiência.",
      tag: "Organização"
    },
    {
      icon: Users,
      title: "Gestão de Criadores",
      description: "Acompanhe o desempenho individual e coletivo de todos os seus talentos.",
      tag: "Gestão"
    },
    {
      icon: FileText,
      title: "Relatórios",
      description: "Gere relatórios personalizados para análise de performance e crescimento.",
      tag: "Relatórios"
    },
    {
      icon: Shield,
      title: "Segurança",
      description: "Proteção de dados com criptografia e autenticação segura.",
      tag: "Segurança"
    },
    {
      icon: Zap,
      title: "Automações",
      description: "Automatize tarefas repetitivas e foque no que realmente importa.",
      tag: "Produtividade"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex flex-col relative overflow-hidden">
      {/* Subtle background elements */}
      <div 
        className="absolute top-0 left-0 w-[50%] h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 0% 50%, rgba(139, 0, 0, 0.02) 0%, transparent 50%)',
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
            <a href="/sobre" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide">Sobre</a>
            <span className="text-sm text-neutral-900 font-semibold tracking-wide">Recursos</span>
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
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 mb-6 tracking-tight">
            Recursos
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Ferramentas poderosas para impulsionar o crescimento da sua agência 
            e maximizar o potencial dos seus criadores.
          </p>
        </motion.div>

        {/* Resources Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource, index) => (
            <motion.div
              key={resource.title}
              className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200/50 shadow-sm hover:shadow-lg hover:bg-white transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.08 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 bg-neutral-100 group-hover:bg-neutral-900 rounded-xl flex items-center justify-center transition-colors duration-300">
                  <resource.icon size={22} className="text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full">
                  {resource.tag}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{resource.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{resource.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 rounded-3xl p-10">
            <h2 className="text-2xl font-semibold text-white mb-4">Pronto para começar?</h2>
            <p className="text-neutral-400 mb-6 max-w-md mx-auto">
              Junte-se às agências que já estão transformando seu gerenciamento de lives.
            </p>
            <Button 
              className="bg-white text-neutral-900 hover:bg-neutral-100 px-8 py-3 rounded-full font-medium"
              onClick={() => navigate("/login")}
            >
              Acessar Plataforma
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer 
        className="py-6 text-center relative z-10 border-t border-neutral-200/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Curli Agency. Todos os direitos reservados.
        </p>
      </motion.footer>
    </div>
  );
};

export default ResourcesPage;
