import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Download, Calendar, Trophy, TrendingUp, Users, Gem, Swords, Radio, ChevronLeft, ChevronRight, Target, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, getDaysInMonth, eachDayOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import curliLogo from '@/assets/logo-curli.png';

// Data IDs from other dashboards
const CHART_DATA_ID = '00000000-0000-0000-0000-000000000002';
const BATTLES_DATA_ID = '00000000-0000-0000-0000-000000000003';
const CREATORS_DATA_ID = '00000000-0000-0000-0000-000000000004';

interface MetricSummary {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  projection?: string;
  subtext?: string;
}

interface RankingItem {
  name: string;
  value: number;
  executive?: string;
}

interface DailyChartData {
  date: string;
  day: string;
  diamonds: number;
  creators: number;
  scheduling: number;
  battles: number;
  diamondsAccum: number;
  creatorsAccum: number;
}

interface MonthlyData {
  diamonds: { total: number; entries: number; projection: number };
  creators: { total: number; entries: number; projection: number };
  scheduling: { scheduled: number; total: number; rate: number; daysWithScheduling: number };
  battles: { total: number; entries: number; average: number; daysWithBattles: number; battleRate: number };
  creatorsAnalysis: { total: number; lastUpdated: string | null };
  dailyData: DailyChartData[];
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
  const totalDaysInMonth = getDaysInMonth(currentMonth);
  const today = new Date();
  const daysElapsed = Math.min(
    differenceInDays(today, monthStart) + 1,
    totalDaysInMonth
  );

  useEffect(() => {
    loadMonthlyData();
  }, [currentMonth]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel with correct UUIDs
      const [chartsResult, schedulingResult, battlesResult, creatorsAnalysisResult] = await Promise.all([
        supabase.from('dashboard_data').select('data, updated_at').eq('id', CHART_DATA_ID).maybeSingle(),
        supabase.from('live_schedules').select('*').gte('schedule_date', format(monthStart, 'yyyy-MM-dd')).lte('schedule_date', format(monthEnd, 'yyyy-MM-dd')),
        supabase.from('dashboard_data').select('data, updated_at').eq('id', BATTLES_DATA_ID).maybeSingle(),
        supabase.from('dashboard_data').select('data, updated_at').eq('id', CREATORS_DATA_ID).maybeSingle()
      ]);

      const chartsData = chartsResult.data;
      const schedulingData = schedulingResult.data;
      const battlesData = battlesResult.data;
      const creatorsAnalysisData = creatorsAnalysisResult.data;

      // Initialize daily data map
      const dailyMap: Record<string, DailyChartData> = {};
      const monthKey = format(currentMonth, 'yyyy-MM');
      
      // Initialize all days of the month
      eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        dailyMap[dateStr] = {
          date: dateStr,
          day: format(day, 'dd'),
          diamonds: 0,
          creators: 0,
          scheduling: 0,
          battles: 0,
          diamondsAccum: 0,
          creatorsAccum: 0
        };
      });

      // Process charts data (diamonds and creators)
      let diamondsTotal = 0;
      let diamondsEntries = 0;
      let creatorsTotal = 0;
      let creatorsEntries = 0;

      if (chartsData?.data) {
        const data = chartsData.data as any;
        const entries = data.entries || [];
        
        entries.forEach((entry: any) => {
          if (entry.date?.startsWith(monthKey) && dailyMap[entry.date]) {
            dailyMap[entry.date].diamonds = entry.diamonds || 0;
            dailyMap[entry.date].creators = entry.creators || 0;
            diamondsTotal += entry.diamonds || 0;
            creatorsTotal += entry.creators || 0;
            if (entry.diamonds > 0) diamondsEntries++;
            if (entry.creators > 0) creatorsEntries++;
          }
        });
      }

      // Calculate accumulated values
      let diamondsAccum = 0;
      let creatorsAccum = 0;
      Object.keys(dailyMap).sort().forEach(date => {
        diamondsAccum += dailyMap[date].diamonds;
        creatorsAccum += dailyMap[date].creators;
        dailyMap[date].diamondsAccum = diamondsAccum;
        dailyMap[date].creatorsAccum = creatorsAccum;
      });

      // Process scheduling data
      let scheduledCount = 0;
      let totalSchedules = 0;
      const schedulingByMember: Record<string, { scheduled: number; total: number; executive: string }> = {};
      const daysWithScheduling = new Set<string>();

      if (schedulingData) {
        schedulingData.forEach((schedule: any) => {
          const member = schedule.member_name;
          const date = schedule.schedule_date;
          
          if (!schedulingByMember[member]) {
            schedulingByMember[member] = { scheduled: 0, total: 0, executive: schedule.executive_name };
          }
          schedulingByMember[member].total++;
          totalSchedules++;
          
          if (schedule.is_scheduled) {
            schedulingByMember[member].scheduled++;
            scheduledCount++;
            daysWithScheduling.add(date);
          }
          
          if (dailyMap[date]) {
            const totalForDay = schedulingData.filter((s: any) => s.schedule_date === date).length;
            const scheduledForDay = schedulingData.filter((s: any) => s.schedule_date === date && s.is_scheduled).length;
            dailyMap[date].scheduling = totalForDay > 0 ? Math.round((scheduledForDay / totalForDay) * 100) : 0;
          }
        });
      }

      // Process battles data - NEW CORRECT FORMAT
      let battlesTotal = 0;
      let battlesEntries = 0;
      const battlesByMember: Record<string, { total: number; executive: string }> = {};
      const daysWithBattles = new Set<string>();

      if (battlesData?.data) {
        const data = battlesData.data as any;
        const battleData = data.battleData || {};
        const teamStructure = data.teamStructure || [];
        
        // Create member to executive mapping
        const memberToExecutive: Record<string, string> = {};
        teamStructure.forEach((team: any) => {
          team.members?.forEach((member: string) => {
            memberToExecutive[member] = team.executive;
          });
        });
        
        // Process battle data
        Object.entries(battleData).forEach(([member, dates]: [string, any]) => {
          if (!battlesByMember[member]) {
            battlesByMember[member] = { total: 0, executive: memberToExecutive[member] || '' };
          }
          
          Object.entries(dates).forEach(([dateStr, count]: [string, any]) => {
            if (dateStr.startsWith(monthKey)) {
              const battleCount = Number(count) || 0;
              battlesByMember[member].total += battleCount;
              battlesTotal += battleCount;
              if (battleCount > 0) {
                battlesEntries++;
                daysWithBattles.add(dateStr);
              }
              
              if (dailyMap[dateStr]) {
                dailyMap[dateStr].battles += battleCount;
              }
            }
          });
        });
      }

      // Calculate battle rate (% of days with battles up to today)
      const battleRate = daysElapsed > 0 ? Math.round((daysWithBattles.size / daysElapsed) * 100) : 0;

      // Process creators analysis
      let creatorsAnalysisTotal = 0;
      let creatorsLastUpdated: string | null = null;
      
      if (creatorsAnalysisData?.data) {
        const data = creatorsAnalysisData.data as any;
        if (data.creatorsData) {
          Object.values(data.creatorsData).forEach((count: any) => {
            creatorsAnalysisTotal += Number(count) || 0;
          });
        }
        creatorsLastUpdated = creatorsAnalysisData.updated_at || null;
      }

      // Calculate projections based on days with data
      const diamondsProjection = diamondsEntries > 0 
        ? Math.round((diamondsTotal / diamondsEntries) * totalDaysInMonth) 
        : 0;
      const creatorsProjection = creatorsEntries > 0 
        ? Math.round((creatorsTotal / creatorsEntries) * totalDaysInMonth) 
        : 0;
      const battlesAverage = daysWithBattles.size > 0 
        ? Math.round(battlesTotal / daysWithBattles.size) 
        : 0;

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

      // Convert daily map to sorted array
      const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      setMonthlyData({
        diamonds: { total: diamondsTotal, entries: diamondsEntries, projection: diamondsProjection },
        creators: { total: creatorsTotal, entries: creatorsEntries, projection: creatorsProjection },
        scheduling: { 
          scheduled: scheduledCount, 
          total: totalSchedules, 
          rate: totalSchedules > 0 ? Math.round((scheduledCount / totalSchedules) * 100) : 0,
          daysWithScheduling: daysWithScheduling.size
        },
        battles: { 
          total: battlesTotal, 
          entries: battlesEntries, 
          average: battlesAverage,
          daysWithBattles: daysWithBattles.size,
          battleRate
        },
        creatorsAnalysis: { total: creatorsAnalysisTotal, lastUpdated: creatorsLastUpdated },
        dailyData,
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

  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // Filter data to only show up to today
  const todayStr = format(today, 'yyyy-MM-dd');
  const filteredDailyData = monthlyData?.dailyData.filter(d => d.date <= todayStr) || [];

  const metrics: MetricSummary[] = monthlyData ? [
    { 
      label: 'Diamantes', 
      value: formatNumber(monthlyData.diamonds.total), 
      icon: <Gem className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-700',
      projection: `Proj: ${formatCompact(monthlyData.diamonds.projection)}`,
      subtext: `${monthlyData.diamonds.entries} dias com dados`
    },
    { 
      label: 'Criadores Entrada', 
      value: formatNumber(monthlyData.creators.total), 
      icon: <Users className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-700',
      projection: `Proj: ${formatNumber(monthlyData.creators.projection)}`,
      subtext: `${monthlyData.creators.entries} dias com dados`
    },
    { 
      label: 'Taxa Agendamento', 
      value: `${monthlyData.scheduling.rate}%`, 
      icon: <Radio className="h-5 w-5" />,
      color: 'bg-green-100 text-green-700',
      subtext: `${monthlyData.scheduling.daysWithScheduling}/${daysElapsed} dias`
    },
    { 
      label: 'Batalhas', 
      value: formatNumber(monthlyData.battles.total), 
      icon: <Swords className="h-5 w-5" />,
      color: 'bg-red-100 text-red-700',
      projection: `Taxa: ${monthlyData.battles.battleRate}%`,
      subtext: `Média: ${monthlyData.battles.average}/dia | ${monthlyData.battles.daysWithBattles} dias`
    },
    { 
      label: 'Criadores Análise', 
      value: formatNumber(monthlyData.creatorsAnalysis.total), 
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-700',
      subtext: monthlyData.creatorsAnalysis.lastUpdated 
        ? `Atualizado: ${format(new Date(monthlyData.creatorsAnalysis.lastUpdated), 'dd/MM HH:mm')}`
        : 'Hoje'
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
          <div className="flex items-center gap-3">
            <img src={curliLogo} alt="Curli" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-foreground">Overview Geral</h1>
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
                {metric.projection && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {metric.projection}
                  </p>
                )}
                {metric.subtext && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {metric.subtext}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Evolution Charts */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução Mensal
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Diamonds Evolution Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gem className="h-4 w-4 text-purple-600" />
                Diamantes Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filteredDailyData}>
                  <defs>
                    <linearGradient id="diamondsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" tickFormatter={formatCompact} />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value), 'Diamantes']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="diamondsAccum" 
                    stroke="#9333ea" 
                    fill="url(#diamondsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Creators Evolution Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Criadores Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filteredDailyData}>
                  <defs>
                    <linearGradient id="creatorsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value), 'Criadores']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="creatorsAccum" 
                    stroke="#2563eb" 
                    fill="url(#creatorsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Metrics Combined Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4 text-green-600" />
                Taxa de Agendamento Diária (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={filteredDailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Taxa']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="scheduling" 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Battles Daily Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-600" />
                Batalhas por Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={filteredDailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value), 'Batalhas']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="battles" fill="#dc2626" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Projections Section */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Projeções do Mês
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Projeção Diamantes</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {formatNumber(monthlyData?.diamonds.projection || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {monthlyData?.diamonds.entries || 0} dias com dados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Projeção Criadores</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatNumber(monthlyData?.creators.projection || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {monthlyData?.creators.entries || 0} dias com dados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-muted-foreground">Média Batalhas/Dia</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {monthlyData?.battles.average || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatNumber(monthlyData?.battles.total || 0)} batalhas
              </p>
            </CardContent>
          </Card>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Link to="/painel">
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
          <Link to="/anotacoes">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-sm">Anotações</p>
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
            <div className="grid grid-cols-5 gap-3 mb-6">
              {metrics.map((metric, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                  {metric.projection && (
                    <p className="text-xs text-gray-500">{metric.projection}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Projections */}
            <h2 className="text-base font-bold text-gray-900 mb-3">Projeções</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-700 mb-1">Projeção Diamantes</p>
                <p className="text-xl font-bold text-purple-900">{formatNumber(monthlyData?.diamonds.projection || 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700 mb-1">Projeção Criadores</p>
                <p className="text-xl font-bold text-blue-900">{formatNumber(monthlyData?.creators.projection || 0)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-1">Média Batalhas/Dia</p>
                <p className="text-xl font-bold text-red-900">{monthlyData?.battles.average || 0}</p>
              </div>
            </div>

            {/* Rankings */}
            <h2 className="text-base font-bold text-gray-900 mb-3">Rankings do Mês</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Scheduling Ranking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Top Agendamento</h3>
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
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Top Batalhas</h3>
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
