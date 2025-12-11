import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Diamond, Users, TrendingUp, Save, Loader2, FileText, Calendar, Target, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

const CHART_DATA_ID = 'chart-daily-data';

const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

const ChartsDashboard: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [newDiamonds, setNewDiamonds] = useState<string>('');
  const [newCreators, setNewCreators] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

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
        const parsed = data.data as { entries?: DailyEntry[] };
        if (parsed.entries) {
          setEntries(parsed.entries);
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
        data: { entries } as unknown as import('@/integrations/supabase/types').Json,
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
  }, [entries]);

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
        backgroundColor: '#1a1a2e',
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-purple-950/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                Dashboard de Métricas
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF} 
              disabled={isExporting || entries.length === 0}
              className="gap-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Exportar PDF
            </Button>
            <Button onClick={saveData} disabled={isSaving} size="sm" className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Add Entry Form */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-card to-purple-950/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-purple-500" />
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
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diamonds" className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-purple-500" />
                  Diamantes
                </Label>
                <Input
                  id="diamonds"
                  type="number"
                  placeholder="Ex: 50000"
                  value={newDiamonds}
                  onChange={(e) => setNewDiamonds(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creators" className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Criadores
                </Label>
                <Input
                  id="creators"
                  type="number"
                  placeholder="Ex: 10"
                  value={newCreators}
                  onChange={(e) => setNewCreators(e.target.value)}
                  className="bg-background"
                />
              </div>
              <Button onClick={handleAddEntry} className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Section - This will be exported as PDF */}
        <div ref={reportRef} className="space-y-6 bg-background p-4 rounded-lg">
          {/* Report Header */}
          <div className="text-center pb-4 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Relatório de Métricas Diárias</h2>
            <p className="text-muted-foreground">
              Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Diamond className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Total Diamantes</p>
                <p className="text-xl font-bold text-purple-400">
                  {totalDiamonds.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Total Criadores</p>
                <p className="text-xl font-bold text-blue-400">
                  {totalCreators.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Mês Atual (Diam.)</p>
                <p className="text-xl font-bold text-green-400">
                  {monthDiamonds.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Mês Atual (Cri.)</p>
                <p className="text-xl font-bold text-amber-400">
                  {monthCreators.toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Média/Dia (Diam.)</p>
                <p className="text-xl font-bold text-cyan-400">
                  {Math.round(avgDiamondsPerDay).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border-rose-500/30">
              <CardContent className="p-4 text-center">
                <Target className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Média/Dia (Cri.)</p>
                <p className="text-xl font-bold text-rose-400">
                  {avgCreatorsPerDay.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Diamonds Area Chart */}
            <Card className="border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Diamond className="w-5 h-5 text-purple-500" />
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
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
                          stroke="#a855f7" 
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
            <Card className="border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-blue-500" />
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
                        <Bar dataKey="creators" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
          <Card className="border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-green-500" />
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
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dateLabel" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="diamonds" orientation="left" fontSize={11} stroke="#a855f7" tickFormatter={(v) => (v/1000).toFixed(0) + 'k'} />
                      <YAxis yAxisId="creators" orientation="right" fontSize={11} stroke="#3b82f6" />
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
                        stroke="#a855f7" 
                        strokeWidth={2}
                        fill="url(#combinedGradient)" 
                      />
                      <Bar 
                        yAxisId="creators"
                        dataKey="creators" 
                        fill="#3b82f6" 
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
                        <td className="py-3 px-4 text-right font-bold text-purple-500">
                          {entry.diamonds.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-500">
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
                      <td className="py-3 px-4 text-right font-bold text-purple-500">
                        {totalDiamonds.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-500">
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
    </div>
  );
};

export default ChartsDashboard;
