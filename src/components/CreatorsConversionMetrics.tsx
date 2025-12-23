import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Users, UserCheck, ArrowRight, Loader2, Percent, Target, Calendar, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface DailyEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

interface CreatorsData {
  [memberName: string]: number;
}

interface TeamStructure {
  executive: string;
  members: string[];
}

interface CreatorsAnalysisData {
  creatorsData?: CreatorsData;
  teamStructure?: TeamStructure[];
  lastUpdated?: string;
}

interface MonthlyGoals {
  diamondsGoal: number;
  creatorsGoal: number;
}

const CREATORS_DATA_ID = '00000000-0000-0000-0000-000000000004';
const CHART_DATA_ID = '00000000-0000-0000-0000-000000000002';

export const CreatorsConversionMetrics: React.FC = () => {
  const [creatorsInAnalysis, setCreatorsInAnalysis] = useState(0);
  const [dailyEntryTotal, setDailyEntryTotal] = useState(0);
  const [monthlyEntryTotal, setMonthlyEntryTotal] = useState(0);
  const [avgDailyEntry, setAvgDailyEntry] = useState(0);
  const [analysisLastUpdated, setAnalysisLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysWithData, setDaysWithData] = useState(0);
  const [creatorsGoal, setCreatorsGoal] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load both data sources in parallel
        const [creatorsResult, chartResult] = await Promise.all([
          supabase
            .from('dashboard_data')
            .select('data')
            .eq('id', CREATORS_DATA_ID)
            .maybeSingle(),
          supabase
            .from('dashboard_data')
            .select('data')
            .eq('id', CHART_DATA_ID)
            .maybeSingle(),
        ]);

        // Process creators in analysis data
        if (creatorsResult.data?.data) {
          const parsed = creatorsResult.data.data as CreatorsAnalysisData;
          if (parsed.creatorsData && parsed.teamStructure) {
            const total = parsed.teamStructure.reduce((sum, exec) => {
              return sum + exec.members.reduce((memberSum, member) => {
                return memberSum + (parsed.creatorsData?.[member] || 0);
              }, 0);
            }, 0);
            setCreatorsInAnalysis(total);
            if (parsed.lastUpdated) {
              setAnalysisLastUpdated(parsed.lastUpdated);
            }
          }
        }

        // Process chart/daily entry data
        if (chartResult.data?.data) {
          const parsed = chartResult.data.data as { entries?: DailyEntry[]; monthlyGoals?: MonthlyGoals };
          
          // Get creators goal
          if (parsed.monthlyGoals?.creatorsGoal) {
            setCreatorsGoal(parsed.monthlyGoals.creatorsGoal);
          }
          
          if (parsed.entries && parsed.entries.length > 0) {
            const now = new Date();
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            
            const currentMonthEntries = parsed.entries.filter(e => {
              const entryDate = new Date(e.date + 'T12:00:00');
              return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
            });

            const monthCreators = currentMonthEntries.reduce((sum, e) => sum + e.creators, 0);
            setMonthlyEntryTotal(monthCreators);
            setDaysWithData(currentMonthEntries.length);

            // Average daily entry
            if (currentMonthEntries.length > 0) {
              setAvgDailyEntry(Math.round(monthCreators / currentMonthEntries.length * 10) / 10);
            }

            // Today's entry
            const todayStr = format(now, 'yyyy-MM-dd');
            const todayEntry = parsed.entries.find(e => e.date === todayStr);
            setDailyEntryTotal(todayEntry?.creators || 0);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados de conversão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate conversion rate
  const conversionRate = creatorsInAnalysis > 0 
    ? Math.round((monthlyEntryTotal / creatorsInAnalysis) * 100 * 10) / 10 
    : 0;

  // Calculate daily average for analysis (assuming it's updated daily)
  const analysisToEntryRatio = avgDailyEntry > 0 && creatorsInAnalysis > 0
    ? Math.round((avgDailyEntry / creatorsInAnalysis) * 100 * 10) / 10
    : 0;

  // Goal calculations
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const totalDaysInMonth = differenceInDays(monthEnd, monthStart) + 1;
  const daysElapsed = differenceInDays(now, monthStart) + 1;
  const remainingDays = differenceInDays(monthEnd, now);

  // Goal percentage
  const goalPercentage = creatorsGoal > 0 
    ? Math.round((monthlyEntryTotal / creatorsGoal) * 100 * 10) / 10 
    : 0;

  // Creators remaining to hit goal
  const creatorsRemaining = Math.max(0, creatorsGoal - monthlyEntryTotal);

  // Projection based on current average
  const projection = daysWithData > 0 
    ? Math.round((monthlyEntryTotal / daysWithData) * totalDaysInMonth) 
    : 0;

  // Projected goal percentage
  const projectedGoalPercentage = creatorsGoal > 0 
    ? Math.round((projection / creatorsGoal) * 100 * 10) / 10 
    : 0;

  // Creators needed per day to hit goal
  const creatorsNeededPerDay = remainingDays > 0 
    ? Math.round((creatorsRemaining / remainingDays) * 10) / 10 
    : 0;

  // Status based on projected goal achievement
  const getGoalStatus = (projectedPercent: number) => {
    if (projectedPercent >= 100) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'No Alvo', icon: TrendingUp };
    if (projectedPercent >= 80) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Atenção', icon: Minus };
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Risco', icon: AlertTriangle };
  };

  const goalStatus = getGoalStatus(projectedGoalPercentage);

  const getConversionStatus = (rate: number) => {
    if (rate >= 50) return { color: 'text-green-500', bg: 'bg-green-500/10', label: 'Excelente' };
    if (rate >= 30) return { color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Bom' };
    if (rate >= 15) return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Regular' };
    return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Baixo' };
  };

  const status = getConversionStatus(conversionRate);

  if (isLoading) {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-background">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Percent className="w-5 h-5 text-purple-500" />
          </div>
          Conversão: Análise → Entrada Diária
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main conversion flow */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/30">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-help">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Em Análise</span>
                </div>
                <p className="text-3xl font-bold text-purple-500">{creatorsInAnalysis}</p>
                {analysisLastUpdated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualizado: {format(new Date(analysisLastUpdated), 'dd/MM HH:mm', { locale: ptBR })}
                  </p>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de criadores em análise no painel de Criadores</p>
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.bg} ${status.color}`}>
              {conversionRate}%
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-help">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <UserCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Entradas (Mês)</span>
                </div>
                <p className="text-3xl font-bold text-green-500">{monthlyEntryTotal}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {daysWithData} dias com dados
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de criadores que entraram na agência este mês</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Goal Section */}
        {creatorsGoal > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Meta de Criadores</span>
              </div>
              <div className="flex items-center gap-2">
                <goalStatus.icon className={`w-4 h-4 ${goalStatus.color}`} />
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${goalStatus.bg} ${goalStatus.color}`}>
                  {goalStatus.label}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{monthlyEntryTotal} / {creatorsGoal} ({goalPercentage}%)</span>
              </div>
              <Progress value={Math.min(100, goalPercentage)} className="h-3" />
            </div>

            {/* Goal metrics grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50 cursor-help">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-blue-500" />
                      <p className="text-xs text-muted-foreground">Faltam</p>
                    </div>
                    <p className={`text-xl font-bold ${creatorsRemaining > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                      {creatorsRemaining}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Criadores restantes para bater a meta</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50 cursor-help">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3 h-3 text-purple-500" />
                      <p className="text-xs text-muted-foreground">Projeção</p>
                    </div>
                    <p className={`text-xl font-bold ${projection >= creatorsGoal ? 'text-green-500' : 'text-amber-500'}`}>
                      {projection}
                    </p>
                    <p className="text-xs text-muted-foreground">{projectedGoalPercentage}% da meta</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Projeção baseada na média atual ({avgDailyEntry}/dia)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-background/50 border border-border/50 cursor-help">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Dias Restantes</p>
                    </div>
                    <p className="text-xl font-bold text-foreground">{remainingDays}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dias restantes no mês para bater a meta</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`p-3 rounded-lg border cursor-help ${creatorsNeededPerDay > avgDailyEntry ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="w-3 h-3" />
                      <p className="text-xs text-muted-foreground">Necessário/Dia</p>
                    </div>
                    <p className={`text-xl font-bold ${creatorsNeededPerDay > avgDailyEntry ? 'text-red-500' : 'text-green-500'}`}>
                      {creatorsNeededPerDay}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {creatorsNeededPerDay > avgDailyEntry ? `+${(creatorsNeededPerDay - avgDailyEntry).toFixed(1)} vs média` : 'Abaixo da média'}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Criadores necessários por dia para bater a meta</p>
                  <p className="text-xs text-muted-foreground">Média atual: {avgDailyEntry}/dia</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {creatorsGoal === 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-600">Meta de criadores não definida</p>
            <p className="text-xs text-muted-foreground">Configure a meta no painel de Gráficos</p>
          </div>
        )}

        {/* Detailed metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Taxa de Conversão</p>
            <div className="flex items-center gap-2">
              <p className={`text-xl font-bold ${status.color}`}>{conversionRate}%</p>
              <span className={`text-xs px-1.5 py-0.5 rounded ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Média Diária (Entradas)</p>
            <p className="text-xl font-bold text-foreground">{avgDailyEntry}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Entrada Hoje</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-foreground">{dailyEntryTotal}</p>
              {dailyEntryTotal > avgDailyEntry ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : dailyEntryTotal < avgDailyEntry ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Conversão Diária Média</p>
            <p className="text-xl font-bold text-foreground">{analysisToEntryRatio}%</p>
          </div>
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          A taxa de conversão mostra quantos criadores em análise efetivamente entram na agência
        </p>
      </CardContent>
    </Card>
  );
};
