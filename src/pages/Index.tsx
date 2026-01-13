import { Dashboard } from '@/components/Dashboard/Dashboard';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout';

const Index = () => {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Painel de Performance | LiveMetrics</title>
        <meta name="description" content="Painel de performance com métricas de recrutamento e diamantes. Edite inline, calcule projeções automaticamente e exporte para CSV/PDF." />
      </Helmet>
      <Dashboard />
    </DashboardLayout>
  );
};

export default Index;
