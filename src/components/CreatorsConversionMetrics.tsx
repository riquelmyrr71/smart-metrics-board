import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Users, UserCheck, Loader2, Target, Calendar, Trophy, Zap, ArrowUpRight, Star } from 'lucide-react';
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
  const [bestMember, setBestMember] = useState<{ name: string; count: number } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
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

        if (creatorsResult.data?.data) {
          const parsed = creatorsResult.data.data as CreatorsAnalysisData;
          if (parsed.creatorsData && parsed.teamStructure) {
            const total = parsed.teamStructure.reduce((sum, exec) => {
              return sum + exec.members.reduce((memberSum, member) => {
                return memberSum + (parsed.creatorsData?.[member] || 0);
              }, 0);
            }, 0);
            setCreatorsInAnalysis(total);
            
            // Find best member
            let topMember = { name: '', count: 0 };
            parsed.teamStructure.forEach(exec => {
              exec.members.forEach(member => {
                const count = parsed.creatorsData?.[member] || 0;
                if (count > topMember.count) {
                  topMember = { name: member, count };
                }
              });
            });
            if (topMember.name) {
              setBestMember(topMember);
            }
            
            if (parsed.lastUpdated) {
              setAnalysisLastUpdated(parsed.lastUpdated);
            }
          }
        }

        if (chartResult.data?.data) {
          const parsed = chartResult.data.data as { entries?: DailyEntry[]; monthlyGoals?: MonthlyGoals };
          
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

            if (currentMonthEntries.length > 0) {
              setAvgDailyEntry(Math.round(monthCreators / currentMonthEntries.length * 10) / 10);
            }

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

  const conversionRate = creatorsInAnalysis > 0 
    ? Math.round((monthlyEntryTotal / creatorsInAnalysis) * 100 * 10) / 10 
    : 0;

  const analysisToEntryRatio = avgDailyEntry > 0 && creatorsInAnalysis > 0
    ? Math.round((avgDailyEntry / creatorsInAnalysis) * 100 * 10) / 10
    : 0;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const totalDaysInMonth = differenceInDays(monthEnd, monthStart) + 1;
  const remainingDays = differenceInDays(monthEnd, now);

  const goalPercentage = creatorsGoal > 0 
    ? Math.round((monthlyEntryTotal / creatorsGoal) * 100 * 10) / 10 
    : 0;

  const creatorsRemaining = Math.max(0, creatorsGoal - monthlyEntryTotal);

  const projection = daysWithData > 0 
    ? Math.round((monthlyEntryTotal / daysWithData) * totalDaysInMonth) 
    : 0;

  const projectedGoalPercentage = creatorsGoal > 0 
    ? Math.round((projection / creatorsGoal) * 100 * 10) / 10 
    : 0;

  const creatorsNeededPerDay = remainingDays > 0 
    ? Math.round((creatorsRemaining / remainingDays) * 10) / 10 
    : 0;

  // Impact calculation - how much each creator in analysis contributes to entries
  const impactRate = creatorsInAnalysis > 0 && daysWithData > 0
    ? Math.round((monthlyEntryTotal / creatorsInAnalysis) * 100) / 100
    : 0;

  const getGoalStatus = (projectedPercent: number) => {
    if (projectedPercent >= 100) return { color: 'text-success', label: 'No Alvo', icon: TrendingUp };
    if (projectedPercent >= 80) return { color: 'text-warning', label: 'Atenção', icon: Minus };
    return { color: 'text-destructive', label: 'Risco', icon: TrendingDown };
  };

  const goalStatus = getGoalStatus(projectedGoalPercentage);

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-border">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2.5 rounded-xl bg-muted">
            <Zap className="w-6 h-6 text-foreground" />
          </div>
          <span className="font-bold text-foreground">
            Relatório de Conversão de Criadores
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        {/* Main Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Em Análise Card */}
          <div className="rounded-xl bg-card p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Análise</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{creatorsInAnalysis}</p>
            {analysisLastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(analysisLastUpdated), 'dd/MM HH:mm', { locale: ptBR })}
              </p>
            )}
          </div>

          {/* Entradas do Mês Card */}
          <div className="rounded-xl bg-card p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entradas Mês</span>
            </div>
            <p className="text-3xl font-bold text-success">{monthlyEntryTotal}</p>
            <p className="text-xs text-muted-foreground mt-1">{daysWithData} dias</p>
          </div>

          {/* Melhor Membro Card */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-xl bg-card p-4 border border-border cursor-help">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-warning" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Melhor Membro</span>
                </div>
                {bestMember ? (
                  <>
                    <p className="text-lg font-bold text-foreground truncate">{bestMember.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-warning fill-warning" />
                      <span className="text-sm font-semibold text-warning">{bestMember.count} criadores</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Membro com mais criadores em análise</p>
            </TooltipContent>
          </Tooltip>

          {/* Impacto da Taxa Card */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-xl bg-card p-4 border border-border cursor-help">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Impacto Taxa</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">{impactRate.toFixed(2)} entrada/análise</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Para cada criador em análise, {impactRate.toFixed(2)} entra na agência</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Goal Section */}
        {creatorsGoal > 0 && (
          <div className="rounded-xl bg-card p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-muted">
                  <Target className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <span className="font-bold text-foreground">Meta de Criadores</span>
                  <p className="text-xs text-muted-foreground">{format(now, 'MMMM yyyy', { locale: ptBR })}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                projectedGoalPercentage >= 100 ? 'bg-success/20 border-success/30' : 
                projectedGoalPercentage >= 80 ? 'bg-warning/20 border-warning/30' : 
                'bg-destructive/20 border-destructive/30'
              }`}>
                <goalStatus.icon className={`w-4 h-4 ${goalStatus.color}`} />
                <span className={`text-sm font-semibold ${goalStatus.color}`}>
                  {goalStatus.label}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-bold text-foreground">{monthlyEntryTotal} / {creatorsGoal} ({goalPercentage}%)</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-foreground rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, goalPercentage)}%` }}
                />
              </div>
            </div>

            {/* Goal metrics grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Faltam</p>
                <p className={`text-2xl font-bold ${creatorsRemaining > 0 ? 'text-foreground' : 'text-success'}`}>
                  {creatorsRemaining}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Projeção</p>
                <p className={`text-2xl font-bold ${projection >= creatorsGoal ? 'text-success' : 'text-warning'}`}>
                  {projection}
                </p>
                <p className="text-xs text-muted-foreground">{projectedGoalPercentage}% da meta</p>
              </div>

              <div className="p-3 rounded-xl bg-muted border border-border">
                <div className="flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Dias Restantes</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{remainingDays}</p>
              </div>

              <div className={`p-3 rounded-xl border ${
                creatorsNeededPerDay > avgDailyEntry 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : 'bg-success/10 border-success/30'
              }`}>
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Necessário/Dia</p>
                <p className={`text-2xl font-bold ${creatorsNeededPerDay > avgDailyEntry ? 'text-destructive' : 'text-success'}`}>
                  {creatorsNeededPerDay}
                </p>
                <p className="text-xs text-muted-foreground">
                  Média atual: {avgDailyEntry}/dia
                </p>
              </div>
            </div>
          </div>
        )}

        {creatorsGoal === 0 && (
          <div className="p-5 rounded-xl bg-muted border border-border text-center">
            <Target className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">Meta de criadores não definida</p>
            <p className="text-xs text-muted-foreground">Configure a meta no painel de Gráficos</p>
          </div>
        )}

        {/* Bottom metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Média Diária</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">{avgDailyEntry}</p>
              <span className="text-sm text-muted-foreground">criadores/dia</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Entrada Hoje</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{dailyEntryTotal}</p>
              {dailyEntryTotal > avgDailyEntry ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : dailyEntryTotal < avgDailyEntry ? (
                <TrendingDown className="w-5 h-5 text-destructive" />
              ) : (
                <Minus className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Conversão Média Diária</p>
            <p className="text-2xl font-bold text-foreground">{analysisToEntryRatio}%</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center pt-3 border-t border-border">
          A taxa mostra quantos criadores em análise efetivamente entram na agência
        </p>
      </CardContent>
    </Card>
  );
};
