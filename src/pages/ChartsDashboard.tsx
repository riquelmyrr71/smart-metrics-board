import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Diamond, Users, TrendingUp, Save, Loader2, FileText, Calendar, Target, Settings, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeeklyAnalysis } from '@/components/Charts/WeeklyAnalysis';
import logoImage from '@/assets/logo-curli.png';

interface DailyEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

interface MonthlyGoals {
  diamondsGoal: number;
  creatorsGoal: number;
}

const CHART_DATA_ID = '00000000-0000-0000-0000-000000000002';

const COLORS = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#1f2937', '#374151'];

const ChartsDashboard: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals>({ diamondsGoal: 0, creatorsGoal: 0 });
  const [newDiamonds, setNewDiamonds] = useState<string>('');
  const [newCreators, setNewCreators] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDaily, setIsExportingDaily] = useState(false);
  const [showGoalsSettings, setShowGoalsSettings] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const dailyReportRef = useRef<HTMLDivElement>(null);

  // Load data from database
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('dashboard_data')
        .select('*')
        .eq('id', CHART_DATA_ID)
        .maybeSingle();

      if (error) throw error;

      if (data?.data) {
        const parsed = data.data as { entries?: DailyEntry[]; monthlyGoals?: MonthlyGoals };
        if (parsed.entries) {
          setEntries(parsed.entries);
        }
        if (parsed.monthlyGoals) {
          setMonthlyGoals(parsed.monthlyGoals);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do gráfico');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save data to database
  const saveData = useCallback(async () => {
    try {
      setIsSaving(true);
      const payload = {
        id: CHART_DATA_ID,
        data: { entries, monthlyGoals } as unknown as import('@/integrations/supabase/types').Json,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('dashboard_data')
        .upsert(payload);

      if (error) throw error;
      toast.success('Dados salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setIsSaving(false);
    }
  }, [entries, monthlyGoals]);

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    
    try {
      setIsExporting(true);
      toast.info('Gerando relatório PDF...');
      
      // Dynamic import for html2canvas and jspdf
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;
      
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f0f0f',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 5;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`relatorio-metricas-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export Daily Report PDF (yesterday's data)
  const handleExportDailyPDF = useCallback(async () => {
    if (!dailyReportRef.current) return;
    
    try {
      setIsExportingDaily(true);
      toast.info('Gerando relatório diário PDF...');
      
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;
      
      const element = dailyReportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#fafafa',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      pdf.save(`relatorio-diario-${yesterdayDate}.pdf`);
      
      toast.success('Relatório diário exportado!');
    } catch (error) {
      console.error('Erro ao exportar PDF diário:', error);
      toast.error('Erro ao exportar relatório diário');
    } finally {
      setIsExportingDaily(false);
    }
  }, []);

  // Add new entry
  const handleAddEntry = useCallback(() => {
    const diamonds = parseFloat(newDiamonds) || 0;
    const creators = parseInt(newCreators) || 0;

    if (diamonds === 0 && creators === 0) {
      toast.error('Adicione pelo menos um valor');
      return;
    }

    const existingIndex = entries.findIndex(e => e.date === selectedDate);
    
    if (existingIndex >= 0) {
      setEntries(prev => prev.map((entry, idx) => 
        idx === existingIndex 
          ? { ...entry, diamonds: entry.diamonds + diamonds, creators: entry.creators + creators }
          : entry
      ));
      toast.success('Valores adicionados ao dia existente');
    } else {
      const newEntry: DailyEntry = {
        id: crypto.randomUUID(),
        date: selectedDate,
        diamonds,
        creators,
      };
      setEntries(prev => [...prev, newEntry].sort((a, b) => a.date.localeCompare(b.date)));
      toast.success('Entrada adicionada');
    }

    setNewDiamonds('');
    setNewCreators('');
  }, [newDiamonds, newCreators, selectedDate, entries]);

  // Delete entry
  const handleDeleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('Entrada removida');
  }, []);

  // Chart data
  const chartData = entries.map(entry => ({
    ...entry,
    dateLabel: format(new Date(entry.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
    fullDate: format(new Date(entry.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
  }));

  // Totals and statistics
  const totalDiamonds = entries.reduce((sum, e) => sum + e.diamonds, 0);
  const totalCreators = entries.reduce((sum, e) => sum + e.creators, 0);
  
  // Current month data
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonthEntries = entries.filter(e => {
    const entryDate = new Date(e.date + 'T12:00:00');
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
  });
  const monthDiamonds = currentMonthEntries.reduce((sum, e) => sum + e.diamonds, 0);
  const monthCreators = currentMonthEntries.reduce((sum, e) => sum + e.creators, 0);

  // Last 7 days
  const last7Days = entries.filter(e => {
    const entryDate = new Date(e.date + 'T12:00:00');
    return entryDate >= subDays(now, 7);
  });
  const weekDiamonds = last7Days.reduce((sum, e) => sum + e.diamonds, 0);
  const weekCreators = last7Days.reduce((sum, e) => sum + e.creators, 0);

  // Averages
  const avgDiamondsPerDay = entries.length > 0 ? totalDiamonds / entries.length : 0;
  const avgCreatorsPerDay = entries.length > 0 ? totalCreators / entries.length : 0;

  // Monthly goal progress
  const diamondsProgress = monthlyGoals.diamondsGoal > 0 
    ? Math.min(100, (monthDiamonds / monthlyGoals.diamondsGoal) * 100) 
    : 0;
  const creatorsProgress = monthlyGoals.creatorsGoal > 0 
    ? Math.min(100, (monthCreators / monthlyGoals.creatorsGoal) * 100) 
    : 0;

  // Today's data
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEntry = entries.find(e => e.date === todayStr);
  const todayDiamonds = todayEntry?.diamonds || 0;
  const todayCreators = todayEntry?.creators || 0;

  // Yesterday's data
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const yesterdayEntry = entries.find(e => e.date === yesterdayStr);
  const yesterdayDiamonds = yesterdayEntry?.diamonds || 0;
  const yesterdayCreators = yesterdayEntry?.creators || 0;

  // Day before yesterday's data (for yesterday's comparison)
  const dayBeforeYesterdayStr = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const dayBeforeYesterdayEntry = entries.find(e => e.date === dayBeforeYesterdayStr);
  const dayBeforeYesterdayDiamonds = dayBeforeYesterdayEntry?.diamonds || 0;
  const dayBeforeYesterdayCreators = dayBeforeYesterdayEntry?.creators || 0;

  // Yesterday's comparison calculations
  const yesterdayDiamondsDiff = yesterdayDiamonds - dayBeforeYesterdayDiamonds;
  const yesterdayCreatorsDiff = yesterdayCreators - dayBeforeYesterdayCreators;
  const yesterdayDiamondsPercentChange = dayBeforeYesterdayDiamonds > 0 
    ? ((yesterdayDiamonds - dayBeforeYesterdayDiamonds) / dayBeforeYesterdayDiamonds) * 100 
    : yesterdayDiamonds > 0 ? 100 : 0;
  const yesterdayCreatorsPercentChange = dayBeforeYesterdayCreators > 0 
    ? ((yesterdayCreators - dayBeforeYesterdayCreators) / dayBeforeYesterdayCreators) * 100 
    : yesterdayCreators > 0 ? 100 : 0;

  // Yesterday's goal percentage
  const yesterdayDiamondsGoalPercent = monthlyGoals.diamondsGoal > 0 
    ? (yesterdayDiamonds / monthlyGoals.diamondsGoal) * 100 
    : 0;
  const yesterdayCreatorsGoalPercent = monthlyGoals.creatorsGoal > 0 
    ? (yesterdayCreators / monthlyGoals.creatorsGoal) * 100 
    : 0;

  // Comparison calculations
  const diamondsDiff = todayDiamonds - yesterdayDiamonds;
  const creatorsDiff = todayCreators - yesterdayCreators;
  const diamondsPercentChange = yesterdayDiamonds > 0 
    ? ((todayDiamonds - yesterdayDiamonds) / yesterdayDiamonds) * 100 
    : todayDiamonds > 0 ? 100 : 0;
  const creatorsPercentChange = yesterdayCreators > 0 
    ? ((todayCreators - yesterdayCreators) / yesterdayCreators) * 100 
    : todayCreators > 0 ? 100 : 0;

  // Last 7 days comparison data for today view
  const recentDaysData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === dateStr);
    return {
      date: dateStr,
      dateLabel: format(date, 'dd/MM', { locale: ptBR }),
      dayName: format(date, 'EEE', { locale: ptBR }),
      diamonds: entry?.diamonds || 0,
      creators: entry?.creators || 0,
      isToday: isToday(date),
    };
  });

  // Pie chart data
  const pieData = [
    { name: 'Diamantes Mês', value: monthDiamonds },
    { name: 'Diamantes Anteriores', value: Math.max(0, totalDiamonds - monthDiamonds) },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-destructive/10 hover:text-destructive">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="Curli Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-xl font-bold text-foreground">
                Dashboard de Métricas
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportDailyPDF} 
              disabled={isExportingDaily || !yesterdayEntry}
              className="gap-2 border-border hover:bg-muted/50"
            >
              {isExportingDaily ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Relatório Diário
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF} 
              disabled={isExporting || entries.length === 0}
              className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Exportar PDF
            </Button>
            <Button onClick={saveData} disabled={isSaving} size="sm" className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Add Entry Form */}
        <Card className="border-destructive/20 bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-destructive" />
              Adicionar Entrada Diária
            </CardTitle>
            <CardDescription>Registre os diamantes e criadores do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Data
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-background border-border focus:border-destructive"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diamonds" className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-destructive" />
                  Diamantes
                </Label>
                <Input
                  id="diamonds"
                  type="number"
                  placeholder="Ex: 50000"
                  value={newDiamonds}
                  onChange={(e) => setNewDiamonds(e.target.value)}
                  className="bg-background border-border focus:border-destructive"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creators" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-foreground" />
                  Criadores
                </Label>
                <Input
                  id="creators"
                  type="number"
                  placeholder="Ex: 10"
                  value={newCreators}
                  onChange={(e) => setNewCreators(e.target.value)}
                  className="bg-background border-border focus:border-destructive"
                />
              </div>
              <Button onClick={handleAddEntry} className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Goals Settings */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-destructive" />
                Metas Mensais
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowGoalsSettings(!showGoalsSettings)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                {showGoalsSettings ? 'Ocultar' : 'Configurar'}
              </Button>
            </div>
            <CardDescription>Acompanhe o progresso em relação às metas do mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showGoalsSettings && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-border">
                <div className="space-y-2">
                  <Label htmlFor="diamondsGoal" className="flex items-center gap-2">
                    <Diamond className="w-4 h-4 text-destructive" />
                    Meta de Diamantes
                  </Label>
                  <Input
                    id="diamondsGoal"
                    type="number"
                    placeholder="Ex: 500000"
                    value={monthlyGoals.diamondsGoal || ''}
                    onChange={(e) => setMonthlyGoals(prev => ({ ...prev, diamondsGoal: parseFloat(e.target.value) || 0 }))}
                    className="bg-background border-border focus:border-destructive"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creatorsGoal" className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-foreground" />
                    Meta de Criadores
                  </Label>
                  <Input
                    id="creatorsGoal"
                    type="number"
                    placeholder="Ex: 50"
                    value={monthlyGoals.creatorsGoal || ''}
                    onChange={(e) => setMonthlyGoals(prev => ({ ...prev, creatorsGoal: parseInt(e.target.value) || 0 }))}
                    className="bg-background border-border focus:border-destructive"
                  />
                </div>
              </div>
            )}

            {/* Progress Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Diamonds Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Diamond className="w-5 h-5 text-destructive" />
                    <span className="font-medium">Diamantes</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {monthDiamonds.toLocaleString('pt-BR')} / {monthlyGoals.diamondsGoal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-destructive rounded-full transition-all duration-500"
                    style={{ width: `${diamondsProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-bold ${diamondsProgress >= 100 ? 'text-success' : diamondsProgress >= 50 ? 'text-warning' : 'text-destructive'}`}>
                    {diamondsProgress.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">
                    Faltam: {Math.max(0, monthlyGoals.diamondsGoal - monthDiamonds).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Creators Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-foreground" />
                    <span className="font-medium">Criadores</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {monthCreators.toLocaleString('pt-BR')} / {monthlyGoals.creatorsGoal.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-foreground/70 rounded-full transition-all duration-500"
                    style={{ width: `${creatorsProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-bold ${creatorsProgress >= 100 ? 'text-success' : creatorsProgress >= 50 ? 'text-warning' : 'text-destructive'}`}>
                    {creatorsProgress.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">
                    Faltam: {Math.max(0, monthlyGoals.creatorsGoal - monthCreators).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TODAY'S METRICS - Separate Section */}
        <Card className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-background">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="w-6 h-6 text-destructive" />
              Métricas de Hoje
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </CardTitle>
            <CardDescription>Visualização separada dos dados de hoje com comparações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Today's Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Today's Diamonds */}
              <div className="relative overflow-hidden rounded-xl border border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Diamantes Hoje</p>
                    <p className="text-4xl font-bold text-destructive">
                      {todayDiamonds.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Diamond className="w-10 h-10 text-destructive/30" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {diamondsDiff > 0 ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                      <ArrowUpRight className="w-4 h-4" />
                      +{diamondsDiff.toLocaleString('pt-BR')}
                    </span>
                  ) : diamondsDiff < 0 ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                      <ArrowDownRight className="w-4 h-4" />
                      {diamondsDiff.toLocaleString('pt-BR')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Minus className="w-4 h-4" />
                      Igual
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">vs ontem</span>
                  {diamondsPercentChange !== 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      diamondsPercentChange > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {diamondsPercentChange > 0 ? '+' : ''}{diamondsPercentChange.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Ontem: {yesterdayDiamonds.toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Today's Creators */}
              <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Criadores Hoje</p>
                    <p className="text-4xl font-bold text-foreground">
                      {todayCreators.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Users className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {creatorsDiff > 0 ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                      <ArrowUpRight className="w-4 h-4" />
                      +{creatorsDiff.toLocaleString('pt-BR')}
                    </span>
                  ) : creatorsDiff < 0 ? (
                    <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                      <ArrowDownRight className="w-4 h-4" />
                      {creatorsDiff.toLocaleString('pt-BR')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Minus className="w-4 h-4" />
                      Igual
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">vs ontem</span>
                  {creatorsPercentChange !== 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      creatorsPercentChange > 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {creatorsPercentChange > 0 ? '+' : ''}{creatorsPercentChange.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Ontem: {yesterdayCreators.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* 7-Day Comparison Chart */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Comparação dos Últimos 7 Dias</h3>
              
              {/* Mini Bar Chart for Recent Days */}
              <div className="grid grid-cols-7 gap-2">
                {recentDaysData.map((day) => (
                  <div 
                    key={day.date} 
                    className={`text-center p-3 rounded-lg transition-all ${
                      day.isToday 
                        ? 'bg-destructive/20 border-2 border-destructive/50 ring-2 ring-destructive/20' 
                        : 'bg-muted/30 border border-border hover:bg-muted/50'
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${day.isToday ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {day.dayName}
                    </p>
                    <p className={`text-xs mb-2 ${day.isToday ? 'text-destructive/70' : 'text-muted-foreground/70'}`}>
                      {day.dateLabel}
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Diamond className="w-3 h-3 text-destructive" />
                        <span className={`text-xs font-bold ${day.isToday ? 'text-destructive' : 'text-foreground'}`}>
                          {day.diamonds >= 1000 ? (day.diamonds / 1000).toFixed(1) + 'k' : day.diamonds}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground">
                          {day.creators}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 7-Day Line Chart */}
              <div className="h-[200px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={recentDaysData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dateLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="diamonds" orientation="left" fontSize={11} stroke="#dc2626" tickFormatter={(v) => (v/1000).toFixed(0) + 'k'} />
                    <YAxis yAxisId="creators" orientation="right" fontSize={11} stroke="#374151" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        value.toLocaleString('pt-BR'), 
                        name === 'diamonds' ? 'Diamantes' : 'Criadores'
                      ]}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Line 
                      yAxisId="diamonds"
                      type="monotone" 
                      dataKey="diamonds" 
                      stroke="#dc2626" 
                      strokeWidth={2}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Bar 
                      yAxisId="creators"
                      dataKey="creators" 
                      fill="#374151" 
                      radius={[4, 4, 0, 0]}
                      opacity={0.6}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
              <div className="text-center p-3 rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Média 7 dias (Diam.)</p>
                <p className="text-lg font-bold text-destructive">
                  {Math.round(recentDaysData.reduce((s, d) => s + d.diamonds, 0) / 7).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Média 7 dias (Cri.)</p>
                <p className="text-lg font-bold text-foreground">
                  {(recentDaysData.reduce((s, d) => s + d.creators, 0) / 7).toFixed(1)}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Melhor Dia (Diam.)</p>
                <p className="text-lg font-bold text-destructive">
                  {Math.max(...recentDaysData.map(d => d.diamonds)).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Total 7 dias (Diam.)</p>
                <p className="text-lg font-bold text-destructive">
                  {recentDaysData.reduce((s, d) => s + d.diamonds, 0).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Analysis Section */}
        <WeeklyAnalysis entries={entries} />

        {/* Report Section - This will be exported as PDF */}
        <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-lg">
          {/* Report Header */}
          <div className="text-center pb-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Relatório de Métricas Diárias</h2>
            <p className="text-muted-foreground">
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Monthly Progress for PDF */}
          {(monthlyGoals.diamondsGoal > 0 || monthlyGoals.creatorsGoal > 0) && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Meta Diamantes</p>
                <p className="text-2xl font-bold text-destructive">{diamondsProgress.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {monthDiamonds.toLocaleString('pt-BR')} / {monthlyGoals.diamondsGoal.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Meta Criadores</p>
                <p className="text-2xl font-bold text-foreground">{creatorsProgress.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {monthCreators.toLocaleString('pt-BR')} / {monthlyGoals.creatorsGoal.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-4 text-center">
                <Diamond className="w-6 h-6 text-destructive mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Total Diamantes</p>
                <p className="text-xl font-bold text-destructive">
                  {totalDiamonds.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Total Criadores</p>
                <p className="text-xl font-bold text-foreground">
                  {totalCreators.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 text-destructive/80 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Mês Atual (Diam.)</p>
                <p className="text-xl font-bold text-destructive/90">
                  {monthDiamonds.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Mês Atual (Cri.)</p>
                <p className="text-xl font-bold text-foreground/90">
                  {monthCreators.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 text-destructive/70 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Média/Dia (Diam.)</p>
                <p className="text-xl font-bold text-destructive/80">
                  {Math.round(avgDiamondsPerDay).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border">
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Média/Dia (Cri.)</p>
                <p className="text-xl font-bold text-foreground/80">
                  {avgCreatorsPerDay.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Diamonds Area Chart */}
            <Card className="border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Diamond className="w-5 h-5 text-destructive" />
                  Evolução de Diamantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="diamondsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dateLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => (v/1000).toFixed(0) + 'k'} />
                        <Tooltip 
                          formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Diamantes']}
                          labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="diamonds" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          fill="url(#diamondsGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhum dado registrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Creators Bar Chart */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-foreground" />
                  Criadores por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="dateLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Criadores']}
                          labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Bar dataKey="creators" fill="#374151" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Nenhum dado registrado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Evolution Chart */}
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-destructive" />
                Evolução Geral - Diamantes × Criadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <defs>
                        <linearGradient id="combinedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="diamonds" orientation="left" fontSize={11} stroke="#dc2626" tickFormatter={(v) => (v/1000).toFixed(0) + 'k'} />
                      <YAxis yAxisId="creators" orientation="right" fontSize={11} stroke="#374151" />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          value.toLocaleString('pt-BR'), 
                          name === 'diamonds' ? 'Diamantes' : 'Criadores'
                        ]}
                        labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Legend 
                        formatter={(value) => value === 'diamonds' ? 'Diamantes' : 'Criadores'}
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                      <Area 
                        yAxisId="diamonds"
                        type="monotone" 
                        dataKey="diamonds" 
                        stroke="#dc2626" 
                        strokeWidth={2}
                        fill="url(#combinedGradient)" 
                      />
                      <Bar 
                        yAxisId="creators"
                        dataKey="creators" 
                        fill="#374151" 
                        radius={[4, 4, 0, 0]}
                        opacity={0.8}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Nenhum dado registrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entries Table (outside PDF export) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Histórico de Entradas
            </CardTitle>
            <CardDescription>Todas as entradas registradas • {entries.length} dias</CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Diamantes</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Criadores</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice().reverse().map((entry, idx) => (
                      <tr key={entry.id} className={`border-t border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40 transition-colors`}>
                        <td className="py-3 px-4 font-medium">
                          {format(new Date(entry.date + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-destructive">
                          {entry.diamonds.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          {entry.creators.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t-2 border-border">
                      <td className="py-3 px-4 font-bold">TOTAL</td>
                      <td className="py-3 px-4 text-right font-bold text-destructive">
                        {totalDiamonds.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {totalCreators.toLocaleString('pt-BR')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma entrada registrada ainda</p>
                <p className="text-sm mt-1">Adicione sua primeira entrada diária acima</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Hidden Daily Report for PDF Export */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={dailyReportRef} 
          className="p-8 w-[600px]"
          style={{ backgroundColor: '#fafafa' }}
        >
          {/* Header */}
          <div className="text-center mb-8 pb-6" style={{ borderBottom: '2px solid #1a1a1a' }}>
            <img src={logoImage} alt="Curli Logo" className="w-16 h-16 mx-auto mb-3 object-contain" />
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1a1a1a' }}>Relatório Diário</h1>
            <p className="text-lg font-medium" style={{ color: '#b91c1c' }}>
              {format(subDays(new Date(), 1), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-sm mt-1" style={{ color: '#525252' }}>CURLI AGÊNCIA</p>
          </div>

          {/* Yesterday's Main Metrics */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Diamonds Card - Pastel Red */}
            <div className="rounded-xl p-6" style={{ backgroundColor: '#fecaca', border: '1px solid #f87171' }}>
              <div className="flex items-center gap-2 mb-2">
                <Diamond className="w-5 h-5" style={{ color: '#b91c1c' }} />
                <span className="text-sm" style={{ color: '#525252' }}>Diamantes</span>
              </div>
              <p className="text-3xl font-bold mb-4" style={{ color: '#991b1b' }}>
                {yesterdayDiamonds.toLocaleString('pt-BR')}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#525252' }}>Dia anterior:</span>
                  <span style={{ color: '#1a1a1a' }}>{dayBeforeYesterdayDiamonds.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#525252' }}>Diferença:</span>
                  <span style={{ color: yesterdayDiamondsDiff >= 0 ? '#166534' : '#b91c1c' }}>
                    {yesterdayDiamondsDiff >= 0 ? '+' : ''}{yesterdayDiamondsDiff.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#525252' }}>Variação:</span>
                  <span style={{ color: yesterdayDiamondsPercentChange >= 0 ? '#166534' : '#b91c1c' }}>
                    {yesterdayDiamondsPercentChange >= 0 ? '+' : ''}{yesterdayDiamondsPercentChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Creators Card - Pastel Gray */}
            <div className="rounded-xl p-6" style={{ backgroundColor: '#e5e5e5', border: '1px solid #a3a3a3' }}>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5" style={{ color: '#1a1a1a' }} />
                <span className="text-sm" style={{ color: '#525252' }}>Criadores</span>
              </div>
              <p className="text-3xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
                {yesterdayCreators.toLocaleString('pt-BR')}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#525252' }}>Dia anterior:</span>
                  <span style={{ color: '#1a1a1a' }}>{dayBeforeYesterdayCreators.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#525252' }}>Diferença:</span>
                  <span style={{ color: yesterdayCreatorsDiff >= 0 ? '#166534' : '#b91c1c' }}>
                    {yesterdayCreatorsDiff >= 0 ? '+' : ''}{yesterdayCreatorsDiff.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#525252' }}>Variação:</span>
                  <span style={{ color: yesterdayCreatorsPercentChange >= 0 ? '#166534' : '#b91c1c' }}>
                    {yesterdayCreatorsPercentChange >= 0 ? '+' : ''}{yesterdayCreatorsPercentChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Goal Progress Section */}
          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid #d4d4d4' }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a1a1a' }}>
              <Target className="w-5 h-5" style={{ color: '#b91c1c' }} />
              Progresso das Metas Mensais
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#525252' }}>Diamantes</span>
                  <span style={{ color: '#1a1a1a' }}>
                    {yesterdayDiamondsGoalPercent.toFixed(2)}% da meta diária
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#fecaca' }}>
                  <div 
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, yesterdayDiamondsGoalPercent)}%`, backgroundColor: '#b91c1c' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: '#525252' }}>Criadores</span>
                  <span style={{ color: '#1a1a1a' }}>
                    {yesterdayCreatorsGoalPercent.toFixed(2)}% da meta diária
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e5e5' }}>
                  <div 
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, yesterdayCreatorsGoalPercent)}%`, backgroundColor: '#1a1a1a' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Averages Section */}
          <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid #d4d4d4' }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#1a1a1a' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#b91c1c' }} />
              Médias
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                <p className="text-sm mb-1" style={{ color: '#525252' }}>Média Diária de Diamantes</p>
                <p className="text-xl font-bold" style={{ color: '#991b1b' }}>
                  {Math.round(avgDiamondsPerDay).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
                <p className="text-sm mb-1" style={{ color: '#525252' }}>Média Diária de Criadores</p>
                <p className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
                  {avgCreatorsPerDay.toFixed(1)}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                <p className="text-sm mb-1" style={{ color: '#525252' }}>Total Mês (Diamantes)</p>
                <p className="text-xl font-bold" style={{ color: '#991b1b' }}>
                  {monthDiamonds.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f5f5f5' }}>
                <p className="text-sm mb-1" style={{ color: '#525252' }}>Total Mês (Criadores)</p>
                <p className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
                  {monthCreators.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8 text-xs" style={{ color: '#737373' }}>
            Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsDashboard;
