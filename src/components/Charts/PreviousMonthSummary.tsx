import React, { useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Diamond, Users, TrendingUp, Calendar, Award, ChevronDown, ChevronUp, Minus, FileDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    try {
      toast.info('Gerando relatório...');
      
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      if (!reportRef.current) return;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1a1a2e',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`resumo-${previousMonthData.monthName.replace(/ /g, '-')}.pdf`);

      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erro ao exportar relatório');
    }
  }, [previousMonthData.monthName]);

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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Resumo do Mês Anterior
          </CardTitle>
          <CardDescription className="capitalize">
            {previousMonthData.monthName}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div ref={reportRef} className="space-y-6 p-6 rounded-xl bg-[#0f172a]">
          {/* Report Header */}
          <div className="text-center pb-4 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white capitalize">
              Relatório - {previousMonthData.monthName}
            </h2>
          </div>

          {/* Main KPIs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Total Diamonds */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border-2 border-red-500/40">
              <div className="flex items-center gap-2 mb-3">
                <Diamond className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-300">Total Diamantes</span>
              </div>
              <p className="text-4xl font-bold text-red-400">
                {formatNumber(previousMonthData.totalDiamonds)}
              </p>
              {previousMonthData.diamondsChange !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendIcon value={previousMonthData.diamondsChange} />
                  <span className={`text-sm font-medium ${previousMonthData.diamondsChange > 0 ? 'text-green-400' : previousMonthData.diamondsChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {Math.abs(previousMonthData.diamondsChange).toFixed(1)}% vs mês atual
                  </span>
                </div>
              )}
            </div>

            {/* Total Creators */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/40">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300">Total Criadores</span>
              </div>
              <p className="text-4xl font-bold text-blue-400">
                {previousMonthData.totalCreators.toLocaleString('pt-BR')}
              </p>
              {previousMonthData.creatorsChange !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendIcon value={previousMonthData.creatorsChange} />
                  <span className={`text-sm font-medium ${previousMonthData.creatorsChange > 0 ? 'text-green-400' : previousMonthData.creatorsChange < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {Math.abs(previousMonthData.creatorsChange).toFixed(1)}% vs mês atual
                  </span>
                </div>
              )}
            </div>

            {/* Average Diamonds */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/40">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Média Diária (Diamantes)</span>
              </div>
              <p className="text-4xl font-bold text-amber-400">
                {formatNumber(previousMonthData.avgDiamonds)}
              </p>
            </div>

            {/* Level Achieved */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-2 border-purple-500/40">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">Nível Alcançado</span>
              </div>
              <p className="text-4xl font-bold text-purple-400">
                {previousMonthData.achievedLevel ? `${previousMonthData.achievedLevel.percentage}%` : '0%'}
              </p>
              <span className="text-sm text-purple-300/70">
                Meta: {formatNumber(previousMonthData.achievedLevel?.diamondsValue || 0)}
              </span>
            </div>
          </div>

          {/* Goal Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diamonds Goal */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Diamond className="w-5 h-5 text-red-400" />
                  <span className="text-base font-semibold text-white">Meta de Diamantes</span>
                </div>
                <span className={`text-lg font-bold ${previousMonthData.diamondsGoalProgress >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                  {previousMonthData.diamondsGoalProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${previousMonthData.diamondsGoalProgress >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, previousMonthData.diamondsGoalProgress)}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 text-sm text-gray-300">
                <span>Alcançado: {formatNumber(previousMonthData.totalDiamonds)}</span>
                <span>Meta: {formatNumber(diamondsGoal)}</span>
              </div>
            </div>

            {/* Creators Goal */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-semibold text-white">Meta de Criadores</span>
                </div>
                <span className={`text-lg font-bold ${previousMonthData.creatorsGoalProgress >= 100 ? 'text-green-400' : 'text-blue-400'}`}>
                  {previousMonthData.creatorsGoalProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${previousMonthData.creatorsGoalProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, previousMonthData.creatorsGoalProgress)}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 text-sm text-gray-300">
                <span>Alcançado: {previousMonthData.totalCreators.toLocaleString('pt-BR')}</span>
                <span>Meta: {creatorsGoal.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Best Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {previousMonthData.bestDayDiamonds && (
              <div className="p-5 rounded-xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Diamond className="w-5 h-5 text-red-400" />
                  <span className="text-base font-semibold text-red-300">Melhor Dia (Diamantes)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-red-400">
                    {formatNumber(previousMonthData.bestDayDiamonds.diamonds)}
                  </span>
                  <span className="text-base text-gray-300">
                    em {format(new Date(previousMonthData.bestDayDiamonds.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}

            {previousMonthData.bestDayCreators && (
              <div className="p-5 rounded-xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-base font-semibold text-blue-300">Melhor Dia (Criadores)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-blue-400">
                    {previousMonthData.bestDayCreators.creators.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-base text-gray-300">
                    em {format(new Date(previousMonthData.bestDayCreators.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="pt-5 border-t border-white/10">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-3xl font-bold text-white">{previousMonthData.totalDays}</p>
                <p className="text-sm text-gray-400 mt-1">Dias no Mês</p>
              </div>
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-3xl font-bold text-white">{formatNumber(previousMonthData.avgCreators)}</p>
                <p className="text-sm text-gray-400 mt-1">Média Criadores/Dia</p>
              </div>
              <div className="p-4 rounded-lg bg-white/5">
                <p className="text-3xl font-bold text-white">
                  {((previousMonthData.daysWithData / previousMonthData.totalDays) * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-400 mt-1">Cobertura de Dados</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
