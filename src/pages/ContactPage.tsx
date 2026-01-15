import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, MessageSquare, Send, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoF from "@/assets/logo-f.png";

const ContactPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
      setIsLoading(false);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "contato@curli.agency",
      description: "Resposta em até 24h"
    },
    {
      icon: MapPin,
      title: "Localização",
      value: "São Paulo, Brasil",
      description: "100% remoto"
    },
    {
      icon: Clock,
      title: "Horário",
      value: "Seg - Sex",
      description: "9h às 18h"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex flex-col relative overflow-hidden">
      {/* Subtle background elements */}
      <div 
        className="absolute bottom-0 right-0 w-[40%] h-[60%] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 100% 100%, rgba(139, 0, 0, 0.03) 0%, transparent 60%)',
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
            <a href="/recursos" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors font-medium tracking-wide">Recursos</a>
            <span className="text-sm text-neutral-900 font-semibold tracking-wide">Contato</span>
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
            Contato
          </h1>
          <p className="text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Tem alguma dúvida ou quer saber mais sobre nossa plataforma? 
            Entre em contato conosco.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Contact Form */}
          <motion.div 
            className="lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-neutral-200/50 shadow-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
                <MessageSquare size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">Envie uma mensagem</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-neutral-600 text-sm font-medium">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-600 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-neutral-600 text-sm font-medium">
                  Assunto
                </Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Sobre o que gostaria de falar?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  className="h-11 bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-neutral-600 text-sm font-medium">
                  Mensagem
                </Label>
                <Textarea
                  id="message"
                  placeholder="Escreva sua mensagem aqui..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="bg-neutral-50/50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-neutral-200 rounded-xl resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl shadow-lg shadow-neutral-900/10 transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enviar Mensagem
                    <Send size={16} />
                  </span>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Contact Info */}
          <motion.div 
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            {contactInfo.map((info, index) => (
              <motion.div
                key={info.title}
                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-neutral-200/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <info.icon size={20} className="text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-400 mb-1">{info.title}</p>
                    <p className="text-neutral-900 font-medium">{info.value}</p>
                    <p className="text-sm text-neutral-500">{info.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Quick CTA */}
            <div className="bg-neutral-900 rounded-2xl p-6 text-white mt-6">
              <h3 className="font-semibold mb-2">Prefere uma demonstração?</h3>
              <p className="text-sm text-neutral-400 mb-4">
                Agende uma call para conhecer a plataforma.
              </p>
              <Button 
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white hover:text-neutral-900 rounded-xl"
                onClick={() => navigate("/login")}
              >
                Agendar Demo
              </Button>
            </div>
          </motion.div>
        </div>
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

export default ContactPage;
