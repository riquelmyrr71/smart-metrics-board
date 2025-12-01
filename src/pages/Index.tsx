import { Dashboard } from '@/components/Dashboard/Dashboard';
import { Helmet } from 'react-helmet';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Painel de Performance | Dashboard de KPIs</title>
        <meta name="description" content="Painel de performance com métricas de recrutamento e diamantes. Edite inline, calcule projeções automaticamente e exporte para CSV/PDF." />
      </Helmet>
      <Dashboard />
    </>
  );
};

export default Index;
