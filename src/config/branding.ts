/**
 * AgencyHub - Platform Configuration
 * 
 * Multi-tenant CRM for Live Streaming Agencies
 */

export interface BrandingConfig {
  // Company Information
  companyName: string;
  companyShortName: string;
  companyTagline: string;
  
  // Logo
  logo: {
    src: string | null;
    alt: string;
    width: number;
    height: number;
  };
  
  // Colors (HSL format for CSS variables)
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
  
  // PDF Reports
  reports: {
    headerText: string;
    footerText: string;
    showLogo: boolean;
  };
  
  // Dashboard Titles
  titles: {
    overview: string;
    panel: string;
    charts: string;
    notes: string;
    scheduling: string;
    battles: string;
    creatorsAnalysis: string;
  };
  
  // Contact/Support
  contact: {
    email: string;
    website: string;
  };
}

// AgencyHub branding configuration
export const branding: BrandingConfig = {
  companyName: 'AgencyHub',
  companyShortName: 'AgencyHub',
  companyTagline: 'Plataforma de Gestão para Agências de Live',
  
  logo: {
    src: null,
    alt: 'AgencyHub Logo',
    width: 120,
    height: 40,
  },
  
  colors: {
    primary: '220 70% 50%',
    primaryForeground: '220 10% 98%',
    accent: '220 80% 95%',
    accentForeground: '220 70% 45%',
  },
  
  reports: {
    headerText: 'Relatório de Performance',
    footerText: 'Relatório gerado pelo AgencyHub',
    showLogo: true,
  },
  
  titles: {
    overview: 'Overview Geral',
    panel: 'Painel de Performance',
    charts: 'Dashboard de Métricas',
    notes: 'Anotações',
    scheduling: 'Agendamento de Lives',
    battles: 'Dashboard de Batalhas',
    creatorsAnalysis: 'Análise de Criadores',
  },
  
  contact: {
    email: 'contato@agencyhub.com',
    website: 'https://agencyhub.com',
  },
};

// Helper function to apply branding colors to CSS variables
export const applyBrandingColors = () => {
  const root = document.documentElement;
  root.style.setProperty('--primary', branding.colors.primary);
  root.style.setProperty('--primary-foreground', branding.colors.primaryForeground);
  root.style.setProperty('--accent', branding.colors.accent);
  root.style.setProperty('--accent-foreground', branding.colors.accentForeground);
};

// Logo component helper
export const getBrandLogo = (): { src: string | null; alt: string } => {
  return {
    src: branding.logo.src,
    alt: branding.logo.alt,
  };
};

// Get formatted company name for reports
export const getReportHeader = (reportType: string): string => {
  return `${branding.companyName} - ${reportType}`;
};

export const getReportFooter = (): string => {
  return `${branding.companyName} - ${branding.reports.footerText}`;
};
