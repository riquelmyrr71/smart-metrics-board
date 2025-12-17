import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, Trophy, TrendingUp, Users, Gem, Swords, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import curliLogo from '@/assets/logo-curli.png';

interface MetricSummary {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface RankingItem {
  name: string;
  value: number;
  executive?: string;
}

interface MonthlyData {
  diamonds: { total: number; entries: number };
  creators: { total: number; entries: number };
  scheduling: { scheduled: number; total: number; rate: number };
  battles: { total: number; entries: number };
  creatorsAnalysis: { total: number };
  rankings: {
    diamonds: RankingItem[];
    creators: RankingItem[];
    scheduling: RankingItem[];
    battles: RankingItem[];
  };
}

const OverviewDashboard: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  useEffect(() => {
    loadMonthlyData();
  }, [currentMonth]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      // Load charts data (diamonds and creators)
      const { data: chartsData } = await supabase
        .from('dashboard_data')
        .select('data')
        .eq('id', 'charts-daily-data')
        .single();

      // Load scheduling data
      const { data: schedulingData } = await supabase
        .from('live_schedules')
        .select('*')
        .gte('schedule_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('schedule_date', format(monthEnd, 'yyyy-MM-dd'));

      // Load battles data
      const { data: battlesData } = await supabase
        .from('dashboard_data')
        .select('data')
        .eq('id', 'battles-dashboard-data')
        .single();

      // Load creators analysis
      const { data: creatorsAnalysisData } = await supabase
        .from('dashboard_data')
        .select('data')
        .eq('id', 'creators-analysis-data')
        .single();

      // Process charts data
      let diamondsTotal = 0;
      let diamondsEntries = 0;
      let creatorsTotal = 0;
      let creatorsEntries = 0;
      const diamondsByMember: Record<string, number> = {};
      const creatorsByMember: Record<string, number> = {};

      if (chartsData?.data) {
        const data = chartsData.data as any;
        const entries = data.entries || [];
        const monthKey = format(currentMonth, 'yyyy-MM');
        
        entries.forEach((entry: any) => {
          if (entry.date?.startsWith(monthKey)) {
            diamondsTotal += entry.diamonds || 0;
            creatorsTotal += entry.creators || 0;
            if (entry.diamonds > 0) diamondsEntries++;
            if (entry.creators > 0) creatorsEntries++;
          }
        });
      }

      // Process scheduling data
      let scheduledCount = 0;
      let totalSchedules = 0;
      const schedulingByMember: Record<string, { scheduled: number; total: number; executive: string }> = {};

      if (schedulingData) {
        schedulingData.forEach((schedule: any) => {
          const member = schedule.member_name;
          if (!schedulingByMember[member]) {
            schedulingByMember[member] = { scheduled: 0, total: 0, executive: schedule.executive_name };
          }
          schedulingByMember[member].total++;
          totalSchedules++;
          if (schedule.is_scheduled) {
            schedulingByMember[member].scheduled++;
            scheduledCount++;
          }
        });
      }

      // Process battles data
      let battlesTotal = 0;
      let battlesEntries = 0;
      const battlesByMember: Record<string, { total: number; executive: string }> = {};

      if (battlesData?.data) {
        const data = battlesData.data as any;
        const monthKey = format(currentMonth, 'yyyy-MM');
        
        if (data.battleCounts) {
          Object.entries(data.battleCounts).forEach(([key, value]: [string, any]) => {
            if (key.startsWith(monthKey)) {
              const parts = key.split('_');
              const member = parts.slice(1).join('_');
              if (!battlesByMember[member]) {
                battlesByMember[member] = { total: 0, executive: '' };
              }
              battlesByMember[member].total += value as number;
              battlesTotal += value as number;
              if (value > 0) battlesEntries++;
            }
          });
        }
      }

      // Process creators analysis
      let creatorsAnalysisTotal = 0;
      if (creatorsAnalysisData?.data) {
        const data = creatorsAnalysisData.data as any;
        if (data.creatorsData) {
          Object.values(data.creatorsData).forEach((count: any) => {
            creatorsAnalysisTotal += count || 0;
          });
        }
      }

      // Build rankings
      const schedulingRanking: RankingItem[] = Object.entries(schedulingByMember)
        .map(([name, data]) => ({
          name,
          value: data.total > 0 ? Math.round((data.scheduled / data.total) * 100) : 0,
          executive: data.executive
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const battlesRanking: RankingItem[] = Object.entries(battlesByMember)
        .map(([name, data]) => ({
          name,
          value: data.total,
          executive: data.executive
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setMonthlyData({
        diamonds: { total: diamondsTotal, entries: diamondsEntries },
        creators: { total: creatorsTotal, entries: creatorsEntries },
        scheduling: { 
          scheduled: scheduledCount, 
          total: totalSchedules, 
          rate: totalSchedules > 0 ? Math.round((scheduledCount / totalSchedules) * 100) : 0 
        },
        battles: { total: battlesTotal, entries: battlesEntries },
        creatorsAnalysis: { total: creatorsAnalysisTotal },
        rankings: {
          diamonds: [],
          creators: [],
          scheduling: schedulingRanking,
          battles: battlesRanking
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`overview-${format(currentMonth, 'MM-yyyy')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  const metrics: MetricSummary[] = monthlyData ? [
    { 
      label: 'Diamantes', 
      value: formatNumber(monthlyData.diamonds.total), 
      icon: <Gem className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-700'
    },
    { 
      label: 'Criadores Entrada', 
      value: formatNumber(monthlyData.creators.total), 
      icon: <Users className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-700'
    },
    { 
      label: 'Taxa Agendamento', 
      value: `${monthlyData.scheduling.rate}%`, 
      icon: <Radio className="h-5 w-5" />,
      color: 'bg-green-100 text-green-700'
    },
    { 
      label: 'Batalhas', 
      value: formatNumber(monthlyData.battles.total), 
      icon: <Swords className="h-5 w-5" />,
      color: 'bg-red-100 text-red-700'
    },
    { 
      label: 'Criadores Análise', 
      value: formatNumber(monthlyData.creatorsAnalysis.total), 
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-700'
    }
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <img src={curliLogo} alt="Curli" className="h-8 w-auto" />
              <h1 className="text-xl font-bold text-foreground">Overview Geral</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[140px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleExportPDF} disabled={exporting} className="gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <Card key={index} className="border-border">
              <CardContent className="p-4">
                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${metric.color} mb-2`}>
                  {metric.icon}
                  <span className="text-xs font-medium">{metric.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rankings Section */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Rankings do Mês
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Scheduling Ranking */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-green-600" />
                Top Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData?.rankings.scheduling.length ? (
                <div className="space-y-2">
                  {monthlyData.rankings.scheduling.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                      <span className="font-bold text-green-600">{item.value}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Battles Ranking */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-600" />
                Top Batalhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData?.rankings.battles.length ? (
                <div className="space-y-2">
                  {monthlyData.rankings.battles.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                      <span className="font-bold text-red-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <h2 className="text-lg font-bold text-foreground mb-4">Acessar Dashboards</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link to="/">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="font-medium text-sm">Performance</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/graficos">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Gem className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-sm">Gráficos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/agendamentos">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Radio className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="font-medium text-sm">Agendamentos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/batalhas">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Swords className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="font-medium text-sm">Batalhas</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/criadores-analise">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="font-medium text-sm">Criadores</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Hidden Report for PDF */}
        <div className="fixed -left-[9999px] top-0">
          <div ref={reportRef} className="bg-white p-8 w-[800px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* PDF Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
              <img src={curliLogo} alt="Curli" className="h-10 w-auto" />
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900">OVERVIEW MENSAL</h1>
                <p className="text-sm text-gray-600 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              {metrics.map((metric, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                </div>
              ))}
            </div>

            {/* Rankings */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Rankings do Mês</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Scheduling Ranking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3">Top Agendamento</h3>
                {monthlyData?.rankings.scheduling.map((item, index) => (
                  <div key={item.name} className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
                    <span className="text-sm">
                      <span className="font-bold mr-2">{index + 1}.</span>
                      {item.name}
                    </span>
                    <span className="font-bold text-green-700">{item.value}%</span>
                  </div>
                ))}
              </div>

              {/* Battles Ranking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3">Top Batalhas</h3>
                {monthlyData?.rankings.battles.map((item, index) => (
                  <div key={item.name} className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
                    <span className="text-sm">
                      <span className="font-bold mr-2">{index + 1}.</span>
                      {item.name}
                    </span>
                    <span className="font-bold text-red-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OverviewDashboard;
