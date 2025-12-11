import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Diamond, Users, TrendingUp, Save, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

const CHART_DATA_ID = 'chart-daily-data';

const ChartsDashboard: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [newDiamonds, setNewDiamonds] = useState<string>('');
  const [newCreators, setNewCreators] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Add new entry
  const handleAddEntry = useCallback(() => {
    const diamonds = parseFloat(newDiamonds) || 0;
    const creators = parseInt(newCreators) || 0;

    if (diamonds === 0 && creators === 0) {
      toast.error('Adicione pelo menos um valor');
      return;
    }

    // Check if date already exists
    const existingIndex = entries.findIndex(e => e.date === selectedDate);
    
    if (existingIndex >= 0) {
      // Update existing entry
      setEntries(prev => prev.map((entry, idx) => 
        idx === existingIndex 
          ? { ...entry, diamonds: entry.diamonds + diamonds, creators: entry.creators + creators }
          : entry
      ));
      toast.success('Valores adicionados ao dia existente');
    } else {
      // Create new entry
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
  }));

  // Totals
  const totalDiamonds = entries.reduce((sum, e) => sum + e.diamonds, 0);
  const totalCreators = entries.reduce((sum, e) => sum + e.creators, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Métricas Diárias</h1>
        </div>
        <Button onClick={saveData} disabled={isSaving} className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Diamond className="w-4 h-4 text-purple-500" />
              Total de Diamantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {totalDiamonds.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Total de Criadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {totalCreators.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Dias Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{entries.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Entry Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Adicionar Entrada Diária</CardTitle>
          <CardDescription>Registre os diamantes e criadores do dia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diamonds">Diamantes</Label>
              <Input
                id="diamonds"
                type="number"
                placeholder="Ex: 50000"
                value={newDiamonds}
                onChange={(e) => setNewDiamonds(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creators">Criadores</Label>
              <Input
                id="creators"
                type="number"
                placeholder="Ex: 10"
                value={newCreators}
                onChange={(e) => setNewCreators(e.target.value)}
              />
            </div>
            <Button onClick={handleAddEntry} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Diamonds Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Diamond className="w-5 h-5 text-purple-500" />
              Diamantes por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="diamondsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dateLabel" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Diamantes']}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
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

        {/* Creators Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Criadores por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="dateLabel" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString('pt-BR'), 'Criadores']}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
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

      {/* Combined Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Evolução Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dateLabel" className="text-xs" />
                  <YAxis yAxisId="diamonds" orientation="left" className="text-xs" tickFormatter={(v) => v.toLocaleString('pt-BR')} />
                  <YAxis yAxisId="creators" orientation="right" className="text-xs" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      value.toLocaleString('pt-BR'), 
                      name === 'diamonds' ? 'Diamantes' : 'Criadores'
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend formatter={(value) => value === 'diamonds' ? 'Diamantes' : 'Criadores'} />
                  <Line 
                    yAxisId="diamonds"
                    type="monotone" 
                    dataKey="diamonds" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    dot={{ fill: '#a855f7' }}
                  />
                  <Line 
                    yAxisId="creators"
                    type="monotone" 
                    dataKey="creators" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum dado registrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Entradas</CardTitle>
          <CardDescription>Todas as entradas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Diamantes</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Criadores</th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        {format(new Date(entry.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-purple-500">
                        {entry.diamonds.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-blue-500">
                        {entry.creators.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma entrada registrada ainda
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChartsDashboard;
