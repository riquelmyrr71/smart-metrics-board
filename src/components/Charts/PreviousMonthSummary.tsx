import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Diamond, Users, TrendingUp, Calendar, Award, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

interface PercentageTarget {
  percentage: number;
  diamondsValue: number;
}

interface PreviousMonthSummaryProps {
  entries: DailyEntry[];
  percentageTargets: PercentageTarget[];
  diamondsGoal: number;
  creatorsGoal: number;
}

export const PreviousMonthSummary: React.FC<PreviousMonthSummaryProps> = ({
  entries,
  percentageTargets,
  diamondsGoal,
  creatorsGoal,
}) => {
  const previousMonthData = useMemo(() => {
    const now = new Date();
    const prevMonth = subMonths(now, 1);
    const prevMonthStart = startOfMonth(prevMonth);
    const prevMonthEnd = endOfMonth(prevMonth);
    const totalDaysInPrevMonth = getDaysInMonth(prevMonth);

    // Current month data for comparison
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    // Filter entries for previous month
    const prevMonthEntries = entries.filter(e => {
      const entryDate = new Date(e.date + 'T12:00:00');
      return isWithinInterval(entryDate, { start: prevMonthStart, end: prevMonthEnd });
    });

    // Filter entries for current month
    const currentMonthEntries = entries.filter(e => {
      const entryDate = new Date(e.date + 'T12:00:00');
      return isWithinInterval(entryDate, { start: currentMonthStart, end: currentMonthEnd });
    });

    // Previous month totals
    const prevDiamonds = prevMonthEntries.reduce((sum, e) => sum + e.diamonds, 0);
    const prevCreators = prevMonthEntries.reduce((sum, e) => sum + e.creators, 0);
    const prevDaysWithData = prevMonthEntries.length;

    // Current month totals (for comparison)
    const currentDiamonds = currentMonthEntries.reduce((sum, e) => sum + e.diamonds, 0);
    const currentCreators = currentMonthEntries.reduce((sum, e) => sum + e.creators, 0);

    // Averages
    const prevAvgDiamonds = prevDaysWithData > 0 ? prevDiamonds / prevDaysWithData : 0;
    const prevAvgCreators = prevDaysWithData > 0 ? prevCreators / prevDaysWithData : 0;

    // Best day
    const bestDayDiamonds = prevMonthEntries.reduce((best, e) => 
      e.diamonds > (best?.diamonds || 0) ? e : best, prevMonthEntries[0]);
    const bestDayCreators = prevMonthEntries.reduce((best, e) => 
      e.creators > (best?.creators || 0) ? e : best, prevMonthEntries[0]);

    // Percentage level achieved
    const sortedTargets = [...percentageTargets].sort((a, b) => a.diamondsValue - b.diamondsValue);
    const achievedLevel = sortedTargets.filter(t => prevDiamonds >= t.diamondsValue).pop();

    // Goal progress
    const diamondsGoalProgress = diamondsGoal > 0 ? (prevDiamonds / diamondsGoal) * 100 : 0;
    const creatorsGoalProgress = creatorsGoal > 0 ? (prevCreators / creatorsGoal) * 100 : 0;

    // Comparison with current month (only if we have data in both)
    const diamondsChange = currentDiamonds > 0 && prevDiamonds > 0 
      ? ((currentDiamonds - prevDiamonds) / prevDiamonds) * 100 
      : 0;
    const creatorsChange = currentCreators > 0 && prevCreators > 0 
      ? ((currentCreators - prevCreators) / prevCreators) * 100 
      : 0;

    return {
      monthName: format(prevMonth, "MMMM 'de' yyyy", { locale: ptBR }),
      totalDiamonds: prevDiamonds,
      totalCreators: prevCreators,
      daysWithData: prevDaysWithData,
      totalDays: totalDaysInPrevMonth,
      avgDiamonds: prevAvgDiamonds,
      avgCreators: prevAvgCreators,
      bestDayDiamonds,
      bestDayCreators,
      achievedLevel,
      diamondsGoalProgress,
      creatorsGoalProgress,
      diamondsChange,
      creatorsChange,
      hasData: prevMonthEntries.length > 0,
    };
  }, [entries, percentageTargets, diamondsGoal, creatorsGoal]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2).replace('.', ',') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.', ',') + 'K';
    }
    return num.toLocaleString('pt-BR');
  };

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <ChevronUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ChevronDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  if (!previousMonthData.hasData) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Resumo do Mês Anterior
          </CardTitle>
          <CardDescription>
            {previousMonthData.monthName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Sem dados registrados para o mês anterior</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Resumo do Mês Anterior
        </CardTitle>
        <CardDescription className="capitalize">
          {previousMonthData.monthName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Diamonds */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <Diamond className="w-4 h-4 text-destructive" />
              <span className="text-xs font-medium text-muted-foreground">Total Diamantes</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {formatNumber(previousMonthData.totalDiamonds)}
            </p>
            {previousMonthData.diamondsChange !== 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon value={previousMonthData.diamondsChange} />
                <span className={`text-xs ${previousMonthData.diamondsChange > 0 ? 'text-green-500' : previousMonthData.diamondsChange < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {Math.abs(previousMonthData.diamondsChange).toFixed(1)}% vs atual
                </span>
              </div>
            )}
          </div>

          {/* Total Creators */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Total Criadores</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">
              {previousMonthData.totalCreators.toLocaleString('pt-BR')}
            </p>
            {previousMonthData.creatorsChange !== 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon value={previousMonthData.creatorsChange} />
                <span className={`text-xs ${previousMonthData.creatorsChange > 0 ? 'text-green-500' : previousMonthData.creatorsChange < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {Math.abs(previousMonthData.creatorsChange).toFixed(1)}% vs atual
                </span>
              </div>
            )}
          </div>

          {/* Average Diamonds */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-muted-foreground">Média/Dia Diamantes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {formatNumber(previousMonthData.avgDiamonds)}
            </p>
            <span className="text-xs text-muted-foreground">
              {previousMonthData.daysWithData} dias com dados
            </span>
          </div>

          {/* Level Achieved */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">Nível Alcançado</span>
            </div>
            <p className="text-2xl font-bold text-purple-500">
              {previousMonthData.achievedLevel ? `${previousMonthData.achievedLevel.percentage}%` : '0%'}
            </p>
            <span className="text-xs text-muted-foreground">
              Meta: {formatNumber(previousMonthData.achievedLevel?.diamondsValue || 0)}
            </span>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Diamonds Goal */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Diamond className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">Meta de Diamantes</span>
              </div>
              <span className={`text-sm font-bold ${previousMonthData.diamondsGoalProgress >= 100 ? 'text-green-500' : 'text-destructive'}`}>
                {previousMonthData.diamondsGoalProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${previousMonthData.diamondsGoalProgress >= 100 ? 'bg-green-500' : 'bg-destructive'}`}
                style={{ width: `${Math.min(100, previousMonthData.diamondsGoalProgress)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{formatNumber(previousMonthData.totalDiamonds)}</span>
              <span>Meta: {formatNumber(diamondsGoal)}</span>
            </div>
          </div>

          {/* Creators Goal */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Meta de Criadores</span>
              </div>
              <span className={`text-sm font-bold ${previousMonthData.creatorsGoalProgress >= 100 ? 'text-green-500' : 'text-blue-500'}`}>
                {previousMonthData.creatorsGoalProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${previousMonthData.creatorsGoalProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, previousMonthData.creatorsGoalProgress)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{previousMonthData.totalCreators.toLocaleString('pt-BR')}</span>
              <span>Meta: {creatorsGoal.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* Best Days */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {previousMonthData.bestDayDiamonds && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-destructive/5 to-transparent border border-destructive/10">
              <div className="flex items-center gap-2 mb-2">
                <Diamond className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-muted-foreground">Melhor Dia (Diamantes)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-destructive">
                  {formatNumber(previousMonthData.bestDayDiamonds.diamonds)}
                </span>
                <span className="text-sm text-muted-foreground">
                  em {format(new Date(previousMonthData.bestDayDiamonds.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </div>
          )}

          {previousMonthData.bestDayCreators && (
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">Melhor Dia (Criadores)</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-blue-500">
                  {previousMonthData.bestDayCreators.creators.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm text-muted-foreground">
                  em {format(new Date(previousMonthData.bestDayCreators.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{previousMonthData.daysWithData}</p>
              <p className="text-xs text-muted-foreground">Dias com dados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{previousMonthData.totalDays}</p>
              <p className="text-xs text-muted-foreground">Total de dias</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{formatNumber(previousMonthData.avgCreators)}</p>
              <p className="text-xs text-muted-foreground">Média criadores/dia</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {((previousMonthData.daysWithData / previousMonthData.totalDays) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">Cobertura de dados</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
