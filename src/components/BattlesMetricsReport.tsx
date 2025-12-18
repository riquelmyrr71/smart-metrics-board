import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays, startOfWeek, endOfWeek, eachWeekOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Calendar,
  Trophy,
  AlertTriangle,
  Zap,
  BarChart3,
  Clock,
  Flame,
  Award,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DiamondEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

interface TeamStructure {
  executive: string;
  members: string[];
}

interface BattleData {
  [memberName: string]: {
    [date: string]: number;
  };
}

interface BattlesMetricsReportProps {
  battleData: BattleData;
  teamStructure: TeamStructure[];
  diamondEntries: DiamondEntry[];
  currentMonth: Date;
}

export const BattlesMetricsReport: React.FC<BattlesMetricsReportProps> = ({
  battleData,
  teamStructure,
  diamondEntries,
  currentMonth,
}) => {
  const metrics = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    const allMembers = teamStructure.flatMap(exec => exec.members);
    
    // Filter entries for current month
    const currentMonthDiamonds = diamondEntries.filter(e => e.date.startsWith(monthStr));
    
    // Get all battle dates for current month
    const battleDates: { [date: string]: number } = {};
    allMembers.forEach(member => {
      if (battleData[member]) {
        Object.entries(battleData[member]).forEach(([date, count]) => {
          if (date.startsWith(monthStr)) {
            battleDates[date] = (battleDates[date] || 0) + count;
          }
        });
      }
    });

    // Total battles
    const totalBattles = Object.values(battleDates).reduce((sum, count) => sum + count, 0);
    const daysWithBattles = Object.keys(battleDates).length;
    const avgBattlesPerDay = daysWithBattles > 0 ? totalBattles / daysWithBattles : 0;

    // Total diamonds
    const totalDiamonds = currentMonthDiamonds.reduce((sum, e) => sum + e.diamonds, 0);
    const totalCreators = currentMonthDiamonds.reduce((sum, e) => sum + e.creators, 0);

    // Member performance analysis
    const memberPerformance = allMembers.map(member => {
      const memberBattles: { [date: string]: number } = {};
      if (battleData[member]) {
        Object.entries(battleData[member]).forEach(([date, count]) => {
          if (date.startsWith(monthStr)) {
            memberBattles[date] = count;
          }
        });
      }
      const total = Object.values(memberBattles).reduce((sum, c) => sum + c, 0);
      const activeDays = Object.keys(memberBattles).filter(d => memberBattles[d] > 0).length;
      const avgPerDay = activeDays > 0 ? total / activeDays : 0;
      const maxDay = Math.max(...Object.values(memberBattles), 0);
      const consistency = daysWithBattles > 0 ? (activeDays / daysWithBattles) * 100 : 0;
      
      return {
        name: member,
        total,
        activeDays,
        avgPerDay,
        maxDay,
        consistency,
        executive: teamStructure.find(e => e.members.includes(member))?.executive || '',
      };
    }).sort((a, b) => b.total - a.total);

    // Executive performance
    const executivePerformance = teamStructure.map(exec => {
      const members = memberPerformance.filter(m => exec.members.includes(m.name));
      const totalBattles = members.reduce((sum, m) => sum + m.total, 0);
      const avgPerMember = members.length > 0 ? totalBattles / members.length : 0;
      const topPerformer = members.sort((a, b) => b.total - a.total)[0];
      
      return {
        executive: exec.executive,
        memberCount: exec.members.length,
        totalBattles,
        avgPerMember,
        topPerformer: topPerformer?.name || '-',
        topPerformerBattles: topPerformer?.total || 0,
      };
    }).sort((a, b) => b.totalBattles - a.totalBattles);

    // Weekly analysis
    const sortedDates = Object.keys(battleDates).sort();
    const weeklyData: { week: string; battles: number; diamonds: number; avgBattles: number }[] = [];
    
    if (sortedDates.length > 0) {
      const firstDate = parseISO(sortedDates[0]);
      const lastDate = parseISO(sortedDates[sortedDates.length - 1]);
      const weeks = eachWeekOfInterval({ start: firstDate, end: lastDate }, { weekStartsOn: 1 });
      
      weeks.forEach(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekLabel = `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM')}`;
        
        let weekBattles = 0;
        let weekDiamonds = 0;
        let daysInWeek = 0;
        
        Object.entries(battleDates).forEach(([date, count]) => {
          const d = parseISO(date);
          if (d >= weekStart && d <= weekEnd) {
            weekBattles += count;
            daysInWeek++;
          }
        });
        
        currentMonthDiamonds.forEach(entry => {
          const d = parseISO(entry.date);
          if (d >= weekStart && d <= weekEnd) {
            weekDiamonds += entry.diamonds;
          }
        });
        
        if (weekBattles > 0 || weekDiamonds > 0) {
          weeklyData.push({
            week: weekLabel,
            battles: weekBattles,
            diamonds: weekDiamonds,
            avgBattles: daysInWeek > 0 ? weekBattles / daysInWeek : 0,
          });
        }
      });
    }

    // Day of week analysis
    const dayOfWeekStats: { day: number; dayName: string; total: number; count: number; avg: number }[] = [];
    for (let i = 0; i < 7; i++) {
      dayOfWeekStats.push({ day: i, dayName: '', total: 0, count: 0, avg: 0 });
    }
    
    Object.entries(battleDates).forEach(([date, count]) => {
      const dayIndex = getDay(parseISO(date));
      dayOfWeekStats[dayIndex].total += count;
      dayOfWeekStats[dayIndex].count++;
    });
    
    dayOfWeekStats.forEach((stat, i) => {
      stat.avg = stat.count > 0 ? stat.total / stat.count : 0;
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      stat.dayName = dayNames[i];
    });

    const bestDay = [...dayOfWeekStats].sort((a, b) => b.avg - a.avg)[0];
    const worstDay = [...dayOfWeekStats].filter(d => d.count > 0).sort((a, b) => a.avg - b.avg)[0];

    // Correlation: battles vs diamonds
    const correlationData = currentMonthDiamonds.map(entry => {
      const battles = battleDates[entry.date] || 0;
      return { date: entry.date, battles, diamonds: entry.diamonds, creators: entry.creators };
    }).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate correlation coefficient
    let correlation = 0;
    if (correlationData.length > 1) {
      const n = correlationData.length;
      const sumX = correlationData.reduce((s, d) => s + d.battles, 0);
      const sumY = correlationData.reduce((s, d) => s + d.diamonds, 0);
      const sumXY = correlationData.reduce((s, d) => s + d.battles * d.diamonds, 0);
      const sumX2 = correlationData.reduce((s, d) => s + d.battles * d.battles, 0);
      const sumY2 = correlationData.reduce((s, d) => s + d.diamonds * d.diamonds, 0);
      
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      
      correlation = denominator !== 0 ? numerator / denominator : 0;
    }

    // Productivity zones
    const highBattleDays = correlationData.filter(d => d.battles >= 20);
    const mediumBattleDays = correlationData.filter(d => d.battles >= 10 && d.battles < 20);
    const lowBattleDays = correlationData.filter(d => d.battles < 10);

    const avgDiamondsHigh = highBattleDays.length > 0 
      ? highBattleDays.reduce((s, d) => s + d.diamonds, 0) / highBattleDays.length : 0;
    const avgDiamondsMedium = mediumBattleDays.length > 0 
      ? mediumBattleDays.reduce((s, d) => s + d.diamonds, 0) / mediumBattleDays.length : 0;
    const avgDiamondsLow = lowBattleDays.length > 0 
      ? lowBattleDays.reduce((s, d) => s + d.diamonds, 0) / lowBattleDays.length : 0;

    // Streaks analysis
    const memberStreaks = allMembers.map(member => {
      const dates = Object.entries(battleData[member] || {})
        .filter(([date, count]) => date.startsWith(monthStr) && count > 0)
        .map(([date]) => date)
        .sort();
      
      let maxStreak = 0;
      let currentStreak = 0;
      let prevDate: Date | null = null;
      
      dates.forEach(dateStr => {
        const date = parseISO(dateStr);
        if (prevDate && differenceInDays(date, prevDate) === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        maxStreak = Math.max(maxStreak, currentStreak);
        prevDate = date;
      });
      
      return { name: member, maxStreak };
    }).sort((a, b) => b.maxStreak - a.maxStreak);

    // Performance trends (comparing weeks)
    const weeklyTrend = weeklyData.length >= 2 
      ? ((weeklyData[weeklyData.length - 1].battles - weeklyData[0].battles) / Math.max(weeklyData[0].battles, 1)) * 100
      : 0;

    // Potential vs actual (estimate based on consistency)
    const potentialBattles = memberPerformance.reduce((sum, m) => {
      const potential = m.avgPerDay * daysWithBattles;
      return sum + potential;
    }, 0);
    const realizationRate = potentialBattles > 0 ? (totalBattles / potentialBattles) * 100 : 0;

    // Diamond efficiency (diamonds per battle)
    const diamondsPerBattle = totalBattles > 0 ? totalDiamonds / totalBattles : 0;

    return {
      totalBattles,
      totalDiamonds,
      totalCreators,
      avgBattlesPerDay,
      daysWithBattles,
      memberPerformance,
      executivePerformance,
      weeklyData,
      dayOfWeekStats,
      bestDay,
      worstDay,
      correlation,
      highBattleDays: highBattleDays.length,
      mediumBattleDays: mediumBattleDays.length,
      lowBattleDays: lowBattleDays.length,
      avgDiamondsHigh,
      avgDiamondsMedium,
      avgDiamondsLow,
      memberStreaks: memberStreaks.slice(0, 5),
      weeklyTrend,
      realizationRate,
      diamondsPerBattle,
      topPerformers: memberPerformance.slice(0, 5),
      lowPerformers: memberPerformance.filter(m => m.total < 10),
    };
  }, [battleData, teamStructure, diamondEntries, currentMonth]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 5) return <ArrowUp className="h-4 w-4 text-emerald-500" />;
    if (value < -5) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Relatório de Métricas - {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">Análise completa de performance do painel de batalhas</p>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Total Batalhas</span>
            </div>
            <div className="text-2xl font-bold">{metrics.totalBattles}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">💎 Total</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalDiamonds)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Média/Dia</span>
            </div>
            <div className="text-2xl font-bold">{metrics.avgBattlesPerDay.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Creators</span>
            </div>
            <div className="text-2xl font-bold">{metrics.totalCreators}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">💎/Batalha</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(metrics.diamondsPerBattle)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-cyan-500" />
              <span className="text-xs text-muted-foreground">Dias Ativos</span>
            </div>
            <div className="text-2xl font-bold">{metrics.daysWithBattles}</div>
          </CardContent>
        </Card>
      </div>

      {/* Correlation Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Correlação Batalhas × Diamantes
          </CardTitle>
          <CardDescription>Análise estatística da relação entre batalhas realizadas e diamantes ganhos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">Coeficiente de Correlação</div>
              <div className={cn(
                "text-3xl font-bold",
                metrics.correlation > 0.5 ? "text-emerald-500" : 
                metrics.correlation > 0 ? "text-amber-500" : "text-red-500"
              )}>
                {metrics.correlation.toFixed(3)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.correlation > 0.7 ? "Forte positiva" :
                 metrics.correlation > 0.4 ? "Moderada positiva" :
                 metrics.correlation > 0 ? "Fraca positiva" :
                 metrics.correlation > -0.4 ? "Fraca negativa" : "Negativa"}
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-2">Tendência Semanal</div>
              <div className="flex items-center gap-2">
                <TrendIcon value={metrics.weeklyTrend} />
                <span className={cn(
                  "text-xl font-bold",
                  metrics.weeklyTrend > 0 ? "text-emerald-500" : 
                  metrics.weeklyTrend < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {metrics.weeklyTrend > 0 ? '+' : ''}{metrics.weeklyTrend.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Variação da primeira para última semana
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-2">Taxa de Realização</div>
              <div className="text-xl font-bold text-primary">
                {metrics.realizationRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Do potencial calculado
              </p>
            </div>
          </div>

          {/* Productivity Zones */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Alta (≥20 batalhas)</div>
              <div className="text-lg font-bold text-emerald-500">{metrics.highBattleDays} dias</div>
              <div className="text-xs text-muted-foreground">
                Média: {formatNumber(metrics.avgDiamondsHigh)} 💎
              </div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Média (10-19 batalhas)</div>
              <div className="text-lg font-bold text-amber-500">{metrics.mediumBattleDays} dias</div>
              <div className="text-xs text-muted-foreground">
                Média: {formatNumber(metrics.avgDiamondsMedium)} 💎
              </div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20 text-center">
              <div className="text-xs text-muted-foreground mb-1">Baixa (&lt;10 batalhas)</div>
              <div className="text-lg font-bold text-red-500">{metrics.lowBattleDays} dias</div>
              <div className="text-xs text-muted-foreground">
                Média: {formatNumber(metrics.avgDiamondsLow)} 💎
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day of Week & Weekly Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Day of Week */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-blue-500" />
              Desempenho por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.dayOfWeekStats.filter(d => d.count > 0).map(stat => (
                <div key={stat.day} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20">{stat.dayName}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        stat.day === metrics.bestDay?.day ? "bg-emerald-500" :
                        stat.day === metrics.worstDay?.day ? "bg-red-400" : "bg-primary/60"
                      )}
                      style={{ 
                        width: `${Math.min((stat.avg / Math.max(...metrics.dayOfWeekStats.map(s => s.avg), 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-12 text-right">{stat.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
              <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                <div className="text-xs text-muted-foreground">Melhor Dia</div>
                <div className="font-bold text-emerald-500">{metrics.bestDay?.dayName || '-'}</div>
                <div className="text-xs">{metrics.bestDay?.avg.toFixed(1) || 0} média</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-2 text-center">
                <div className="text-xs text-muted-foreground">Pior Dia</div>
                <div className="font-bold text-red-500">{metrics.worstDay?.dayName || '-'}</div>
                <div className="text-xs">{metrics.worstDay?.avg.toFixed(1) || 0} média</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Evolution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Evolução Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.weeklyData.length > 0 ? (
              <div className="space-y-3">
                {metrics.weeklyData.map((week, idx) => {
                  const prevWeek = metrics.weeklyData[idx - 1];
                  const change = prevWeek 
                    ? ((week.battles - prevWeek.battles) / Math.max(prevWeek.battles, 1)) * 100 
                    : 0;
                  
                  return (
                    <div key={week.week} className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{week.week}</span>
                        {idx > 0 && (
                          <span className={cn(
                            "text-xs font-bold",
                            change > 0 ? "text-emerald-500" : change < 0 ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {change > 0 ? '+' : ''}{change.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">Batalhas</div>
                          <div className="font-bold">{week.battles}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">💎</div>
                          <div className="font-bold">{formatNumber(week.diamonds)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Média/Dia</div>
                          <div className="font-bold">{week.avgBattles.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Sem dados semanais disponíveis</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Performers */}
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top 5 Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topPerformers.map((member, idx) => (
                <div key={member.name} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    idx === 0 ? "bg-amber-500 text-white" :
                    idx === 1 ? "bg-gray-400 text-white" :
                    idx === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {idx + 1}º
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{member.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {member.activeDays} dias ativos • {member.consistency.toFixed(0)}% consistência
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{member.total}</div>
                    <div className="text-xs text-muted-foreground">{member.avgPerDay.toFixed(1)}/dia</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Streaks */}
        <Card className="border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-orange-500" />
              Maiores Sequências de Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.memberStreaks.filter(m => m.maxStreak > 0).map((member, idx) => (
                <div key={member.name} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(member.maxStreak, 5) }).map((_, i) => (
                      <Flame key={i} className={cn(
                        "h-4 w-4",
                        idx === 0 ? "text-orange-500" : "text-orange-400/60"
                      )} />
                    ))}
                    {member.maxStreak > 5 && <span className="text-xs text-muted-foreground">+{member.maxStreak - 5}</span>}
                  </div>
                  <div className="flex-1 font-medium text-sm">{member.name}</div>
                  <div className="font-bold text-orange-500">{member.maxStreak} dias</div>
                </div>
              ))}
              {metrics.memberStreaks.filter(m => m.maxStreak > 0).length === 0 && (
                <p className="text-muted-foreground text-center py-4">Sem sequências registradas</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-purple-500" />
            Ranking por Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">#</th>
                  <th className="text-left py-2 px-3 font-medium">Executivo</th>
                  <th className="text-center py-2 px-3 font-medium">Membros</th>
                  <th className="text-center py-2 px-3 font-medium">Total Batalhas</th>
                  <th className="text-center py-2 px-3 font-medium">Média/Membro</th>
                  <th className="text-left py-2 px-3 font-medium">Top Performer</th>
                </tr>
              </thead>
              <tbody>
                {metrics.executivePerformance.map((exec, idx) => (
                  <tr key={exec.executive} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <span className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                        idx === 0 ? "bg-amber-500 text-white" :
                        idx === 1 ? "bg-gray-400 text-white" :
                        idx === 2 ? "bg-amber-700 text-white" : "bg-muted"
                      )}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium">{exec.executive.split('(')[0].trim()}</td>
                    <td className="py-2 px-3 text-center">{exec.memberCount}</td>
                    <td className="py-2 px-3 text-center font-bold">{exec.totalBattles}</td>
                    <td className="py-2 px-3 text-center">{exec.avgPerMember.toFixed(1)}</td>
                    <td className="py-2 px-3">
                      <span className="text-emerald-500">{exec.topPerformer}</span>
                      <span className="text-xs text-muted-foreground ml-1">({exec.topPerformerBattles})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Low Performers Warning */}
      {metrics.lowPerformers.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Atenção: Baixo Desempenho (&lt;10 batalhas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {metrics.lowPerformers.map(member => (
                <div key={member.name} className="bg-yellow-500/10 rounded-lg p-2 text-center border border-yellow-500/20">
                  <div className="text-xs font-medium truncate">{member.name}</div>
                  <div className="text-lg font-bold text-yellow-600">{member.total}</div>
                  <div className="text-xs text-muted-foreground">{member.activeDays} dias</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BattlesMetricsReport;
