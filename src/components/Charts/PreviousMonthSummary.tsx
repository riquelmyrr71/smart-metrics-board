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
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
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
        <div ref={reportRef} className="space-y-6 p-8 rounded-xl bg-white border border-gray-200">
          {/* Report Header */}
          <div className="text-center pb-6 border-b-2 border-gray-200">
            <h2 className="text-3xl font-bold text-gray-800 capitalize">
              📊 Relatório Mensal
            </h2>
            <p className="text-xl text-gray-600 mt-2 capitalize font-medium">
              {previousMonthData.monthName}
            </p>
          </div>

          {/* Main KPIs */}
          <div className="grid grid-cols-2 gap-5">
            {/* Total Diamonds */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-300 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-rose-500 rounded-lg">
                  <Diamond className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-rose-700">Total Diamantes</span>
              </div>
              <p className="text-5xl font-extrabold text-rose-600">
                {formatNumber(previousMonthData.totalDiamonds)}
              </p>
              {previousMonthData.diamondsChange !== 0 && (
                <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-white/60 rounded-lg w-fit">
                  <TrendIcon value={previousMonthData.diamondsChange} />
                  <span className={`text-sm font-semibold ${previousMonthData.diamondsChange > 0 ? 'text-green-600' : previousMonthData.diamondsChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {Math.abs(previousMonthData.diamondsChange).toFixed(1)}% vs mês atual
                  </span>
                </div>
              )}
            </div>

            {/* Total Creators */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-blue-700">Total Criadores</span>
              </div>
              <p className="text-5xl font-extrabold text-blue-600">
                {previousMonthData.totalCreators.toLocaleString('pt-BR')}
              </p>
              {previousMonthData.creatorsChange !== 0 && (
                <div className="flex items-center gap-2 mt-3 px-3 py-1.5 bg-white/60 rounded-lg w-fit">
                  <TrendIcon value={previousMonthData.creatorsChange} />
                  <span className={`text-sm font-semibold ${previousMonthData.creatorsChange > 0 ? 'text-green-600' : previousMonthData.creatorsChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {Math.abs(previousMonthData.creatorsChange).toFixed(1)}% vs mês atual
                  </span>
                </div>
              )}
            </div>

            {/* Average Diamonds */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-amber-700">Média Diária (Diamantes)</span>
              </div>
              <p className="text-5xl font-extrabold text-amber-600">
                {formatNumber(previousMonthData.avgDiamonds)}
              </p>
            </div>

            {/* Level Achieved */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 border-2 border-violet-300 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-violet-500 rounded-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-bold text-violet-700">Nível Alcançado</span>
              </div>
              <p className="text-5xl font-extrabold text-violet-600">
                {previousMonthData.achievedLevel ? `${previousMonthData.achievedLevel.percentage}%` : '0%'}
              </p>
              <p className="text-base text-violet-600 mt-2 font-medium">
                Meta: {formatNumber(previousMonthData.achievedLevel?.diamondsValue || 0)}
              </p>
            </div>
          </div>

          {/* Goal Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Diamonds Goal */}
            <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 rounded-lg">
                    <Diamond className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-800">Meta de Diamantes</span>
                </div>
                <span className={`text-2xl font-extrabold ${previousMonthData.diamondsGoalProgress >= 100 ? 'text-green-600' : 'text-rose-600'}`}>
                  {previousMonthData.diamondsGoalProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${previousMonthData.diamondsGoalProgress >= 100 ? 'bg-green-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, previousMonthData.diamondsGoalProgress)}%` }}
                />
              </div>
              <div className="flex justify-between mt-4 text-base font-medium text-gray-600">
                <span>Alcançado: <strong className="text-gray-800">{formatNumber(previousMonthData.totalDiamonds)}</strong></span>
                <span>Meta: <strong className="text-gray-800">{formatNumber(diamondsGoal)}</strong></span>
              </div>
            </div>

            {/* Creators Goal */}
            <div className="p-6 rounded-2xl bg-gray-50 border-2 border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-800">Meta de Criadores</span>
                </div>
                <span className={`text-2xl font-extrabold ${previousMonthData.creatorsGoalProgress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                  {previousMonthData.creatorsGoalProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${previousMonthData.creatorsGoalProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, previousMonthData.creatorsGoalProgress)}%` }}
                />
              </div>
              <div className="flex justify-between mt-4 text-base font-medium text-gray-600">
                <span>Alcançado: <strong className="text-gray-800">{previousMonthData.totalCreators.toLocaleString('pt-BR')}</strong></span>
                <span>Meta: <strong className="text-gray-800">{creatorsGoal.toLocaleString('pt-BR')}</strong></span>
              </div>
            </div>
          </div>

          {/* Best Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {previousMonthData.bestDayDiamonds && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-50 to-white border-2 border-rose-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-rose-500 rounded-lg">
                    <Diamond className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-rose-700">🏆 Melhor Dia (Diamantes)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-rose-600">
                    {formatNumber(previousMonthData.bestDayDiamonds.diamonds)}
                  </span>
                  <span className="text-lg text-gray-600 font-medium">
                    em {format(new Date(previousMonthData.bestDayDiamonds.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}

            {previousMonthData.bestDayCreators && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-blue-700">🏆 Melhor Dia (Criadores)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-blue-600">
                    {previousMonthData.bestDayCreators.creators.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-lg text-gray-600 font-medium">
                    em {format(new Date(previousMonthData.bestDayCreators.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="pt-6 border-t-2 border-gray-200">
            <div className="grid grid-cols-3 gap-5 text-center">
              <div className="p-5 rounded-2xl bg-gray-100 border border-gray-200">
                <p className="text-4xl font-extrabold text-gray-800">{previousMonthData.totalDays}</p>
                <p className="text-base text-gray-600 mt-2 font-medium">Dias no Mês</p>
              </div>
              <div className="p-5 rounded-2xl bg-gray-100 border border-gray-200">
                <p className="text-4xl font-extrabold text-gray-800">{formatNumber(previousMonthData.avgCreators)}</p>
                <p className="text-base text-gray-600 mt-2 font-medium">Média Criadores/Dia</p>
              </div>
              <div className="p-5 rounded-2xl bg-gray-100 border border-gray-200">
                <p className="text-4xl font-extrabold text-gray-800">
                  {((previousMonthData.daysWithData / previousMonthData.totalDays) * 100).toFixed(0)}%
                </p>
                <p className="text-base text-gray-600 mt-2 font-medium">Cobertura de Dados</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
