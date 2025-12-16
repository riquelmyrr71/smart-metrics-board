import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, BarChart3, Target, TrendingUp, Users, ChevronLeft, ChevronRight, Save, Home, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import curliLogo from '@/assets/logo-curli.png';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface TeamMember {
  name: string;
  executive: string;
}

interface ScheduleData {
  [memberName: string]: {
    [date: string]: boolean;
  };
}

const TEAM_STRUCTURE: { executive: string; members: string[] }[] = [
  {
    executive: 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)',
    members: ['BIANCA FOSCHINI', 'IAGO PATRICIO', 'BKARO', 'GABRIELLE SOUSA'],
  },
  {
    executive: 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)',
    members: ['CAIO PEDRO', 'KAIZA PINHEIRO', 'LORRANY COSTA', 'STELLA RODRIGUES'],
  },
  {
    executive: 'LUCAS BECCARO (EXECUTIVO DE PARCERIAS)',
    members: ['MATHEUS ARAUJO'],
  },
  {
    executive: 'GABRIELLE SOUSA (EXECUTIVO DE PARCERIAS)',
    members: ['MARCO'],
  },
  {
    executive: 'LEONARDO & BIANCA (EXECUTIVOS DE PARCERIAS)',
    members: ['GUILHERME TEIXEIRA'],
  },
  {
    executive: 'DANILO GARCIA (EXECUTIVO INTERNO)',
    members: ['LETICIA ISHIKAWA', 'BARBARA STEPHAN', 'GIOVANA CARMO'],
  },
];

const SchedulingDashboard = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const [daysGoal, setDaysGoal] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStart = startOfMonth(currentMonth);

  // Generate all days of the month
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  }, [daysInMonth, monthStart]);

  // Get all members flattened
  const allMembers = useMemo(() => {
    const members: TeamMember[] = [];
    TEAM_STRUCTURE.forEach((team) => {
      team.members.forEach((member) => {
        members.push({ name: member, executive: team.executive });
      });
    });
    return members;
  }, []);

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const monthStr = format(currentMonth, 'yyyy-MM');
        const { data: schedules, error } = await supabase
          .from('live_schedules')
          .select('*')
          .gte('schedule_date', `${monthStr}-01`)
          .lte('schedule_date', `${monthStr}-31`);

        if (error) throw error;

        const newScheduleData: ScheduleData = {};
        schedules?.forEach((schedule) => {
          if (!newScheduleData[schedule.member_name]) {
            newScheduleData[schedule.member_name] = {};
          }
          newScheduleData[schedule.member_name][schedule.schedule_date] = schedule.is_scheduled;
        });
        setScheduleData(newScheduleData);

        // Load goals
        const { data: goals } = await supabase
          .from('scheduling_goals')
          .select('*')
          .eq('month', currentMonth.getMonth() + 1)
          .eq('year', currentMonth.getFullYear())
          .maybeSingle();

        if (goals) {
          setDaysGoal(goals.days_goal);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Erro ao carregar dados',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentMonth, toast]);

  // Toggle schedule
  const toggleSchedule = (memberName: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setScheduleData((prev) => {
      const memberData = prev[memberName] || {};
      return {
        ...prev,
        [memberName]: {
          ...memberData,
          [dateStr]: !memberData[dateStr],
        },
      };
    });
  };

  // Mark all days for a member as scheduled
  const markAllScheduled = (memberName: string) => {
    setScheduleData((prev) => {
      const newDates: { [date: string]: boolean } = {};
      days.forEach((day) => {
        newDates[format(day, 'yyyy-MM-dd')] = true;
      });
      return {
        ...prev,
        [memberName]: newDates,
      };
    });
  };

  // Mark all days for a member as not scheduled
  const markAllNotScheduled = (memberName: string) => {
    setScheduleData((prev) => {
      const newDates: { [date: string]: boolean } = {};
      days.forEach((day) => {
        newDates[format(day, 'yyyy-MM-dd')] = false;
      });
      return {
        ...prev,
        [memberName]: newDates,
      };
    });
  };

  // Set schedule directly
  const setSchedule = (memberName: string, date: Date, value: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setScheduleData((prev) => {
      const memberData = prev[memberName] || {};
      return {
        ...prev,
        [memberName]: {
          ...memberData,
          [dateStr]: value,
        },
      };
    });
  };

  // Save data
  const saveData = async () => {
    setIsSaving(true);
    try {
      // Save schedules
      const upserts: any[] = [];
      Object.entries(scheduleData).forEach(([memberName, dates]) => {
        const member = allMembers.find((m) => m.name === memberName);
        Object.entries(dates).forEach(([date, isScheduled]) => {
          upserts.push({
            member_name: memberName,
            executive_name: member?.executive || '',
            schedule_date: date,
            is_scheduled: isScheduled,
          });
        });
      });

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('live_schedules')
          .upsert(upserts, { onConflict: 'member_name,schedule_date' });
        if (error) throw error;
      }

      // Save goals
      const { error: goalError } = await supabase
        .from('scheduling_goals')
        .upsert(
          {
            month: currentMonth.getMonth() + 1,
            year: currentMonth.getFullYear(),
            days_goal: daysGoal,
          },
          { onConflict: 'month,year' }
        );
      if (goalError) throw goalError;

      toast({
        title: 'Dados salvos com sucesso!',
      });
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: 'Erro ao salvar dados',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    let totalScheduled = 0;
    let totalPossible = 0;
    const memberStats: { [name: string]: { scheduled: number; total: number; rate: number } } = {};
    const dayStats: { [day: string]: { scheduled: number; total: number } } = {};
    const dailyTrend: { date: string; scheduled: number; percentage: number }[] = [];

    // Count per day of week
    const dayOfWeekStats: { [day: number]: { scheduled: number; total: number } } = {};
    for (let i = 0; i < 7; i++) {
      dayOfWeekStats[i] = { scheduled: 0, total: 0 };
    }

    allMembers.forEach((member) => {
      memberStats[member.name] = { scheduled: 0, total: daysInMonth, rate: 0 };
      totalPossible += daysInMonth;
    });

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = getDay(day);
      let dayScheduled = 0;

      allMembers.forEach((member) => {
        const isScheduled = scheduleData[member.name]?.[dateStr] || false;
        if (isScheduled) {
          totalScheduled++;
          memberStats[member.name].scheduled++;
          dayScheduled++;
          dayOfWeekStats[dayOfWeek].scheduled++;
        }
        dayOfWeekStats[dayOfWeek].total++;
      });

      dayStats[dateStr] = { scheduled: dayScheduled, total: allMembers.length };
      dailyTrend.push({
        date: format(day, 'dd/MM'),
        scheduled: dayScheduled,
        percentage: (dayScheduled / allMembers.length) * 100,
      });
    });

    // Calculate rates
    Object.keys(memberStats).forEach((name) => {
      memberStats[name].rate = (memberStats[name].scheduled / memberStats[name].total) * 100;
    });

    // Get ranking
    const ranking = Object.entries(memberStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.scheduled - a.scheduled);

    // Get worst days (days of week with lowest scheduling)
    const worstDays = Object.entries(dayOfWeekStats)
      .map(([day, stats]) => ({
        day: parseInt(day),
        dayName: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][parseInt(day)],
        rate: stats.total > 0 ? (stats.scheduled / stats.total) * 100 : 0,
        ...stats,
      }))
      .sort((a, b) => a.rate - b.rate);

    return {
      totalScheduled,
      totalPossible,
      scheduledRate: totalPossible > 0 ? (totalScheduled / totalPossible) * 100 : 0,
      unscheduledRate: totalPossible > 0 ? ((totalPossible - totalScheduled) / totalPossible) * 100 : 0,
      memberStats,
      dayStats,
      ranking,
      dailyTrend,
      worstDays,
      goalProgress: daysGoal > 0 ? Math.min(100, (totalScheduled / allMembers.length / daysGoal) * 100) : 0,
    };
  }, [scheduleData, allMembers, days, daysInMonth, daysGoal]);

  const prevMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // Get report data for specific date
  const getReportData = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const scheduled: { name: string; executive: string }[] = [];
    const notScheduled: { name: string; executive: string }[] = [];

    TEAM_STRUCTURE.forEach((team) => {
      team.members.forEach((member) => {
        const isScheduled = scheduleData[member]?.[dateStr] || false;
        if (isScheduled) {
          scheduled.push({ name: member, executive: team.executive });
        } else {
          notScheduled.push({ name: member, executive: team.executive });
        }
      });
    });

    return { scheduled, notScheduled, date: dateStr };
  };

  // Export PDF report
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPDF(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#fafafa',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`relatorio-agendamentos-${format(reportDate, 'dd-MM-yyyy')}.pdf`);

      toast({ title: 'PDF exportado com sucesso!' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const reportData = getReportData(reportDate);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <Home className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Agendamento de Lives</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium min-w-[150px] text-center capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={saveData} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* PDF Report Export Section */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Relatório Diário de Agendamentos</span>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(reportDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={reportDate}
                    onSelect={(date) => date && setReportDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleExportPDF} disabled={isExportingPDF}>
                <FileText className="h-4 w-4 mr-2" />
                {isExportingPDF ? 'Gerando...' : 'Exportar PDF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dias Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{metrics.scheduledRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{metrics.totalScheduled} agendamentos</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dias Sem Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{metrics.unscheduledRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{metrics.totalPossible - metrics.totalScheduled} vazios</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Dia Mais Problemático
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{metrics.worstDays[0]?.dayName || '-'}</div>
            <p className="text-xs text-muted-foreground">{metrics.worstDays[0]?.rate.toFixed(1)}% de agendamentos</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Melhor Membro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-400 truncate">{metrics.ranking[0]?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">{metrics.ranking[0]?.scheduled || 0} dias agendados</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={daysGoal}
                onChange={(e) => setDaysGoal(parseInt(e.target.value) || 0)}
                className="w-16 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${metrics.goalProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="percentage" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ranking Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ranking de Membros</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.ranking.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="scheduled" radius={[0, 4, 4, 0]}>
                  {metrics.ranking.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={index === 0 ? 'hsl(var(--primary))' : index < 3 ? 'hsl(142 76% 36%)' : 'hsl(var(--muted-foreground))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Mapa de Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background z-10 text-left p-2 min-w-[180px]">
                    <div className="flex items-center gap-1">
                      <span>Membro</span>
                      <span className="text-[10px] text-muted-foreground ml-1">(atalhos)</span>
                    </div>
                  </th>
                  {days.map((day) => (
                    <th key={day.toISOString()} className="p-1 text-center min-w-[28px]">
                      {format(day, 'dd')}
                    </th>
                  ))}
                  <th className="p-2 text-center min-w-[60px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {TEAM_STRUCTURE.map((team) => (
                  <React.Fragment key={team.executive}>
                    {/* Executive Header */}
                    <tr className="bg-foreground/90">
                      <td colSpan={days.length + 2} className="p-2 font-bold text-background text-center">
                        {team.executive}
                      </td>
                    </tr>
                    {/* Team Members */}
                    {team.members.map((member) => {
                      const memberScheduled = Object.values(scheduleData[member] || {}).filter(Boolean).length;
                      return (
                        <tr key={member} className="hover:bg-muted/50 transition-colors group">
                          <td className="sticky left-0 bg-background z-10 p-1 font-medium border-b border-border">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate text-xs">{member}</span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => markAllScheduled(member)}
                                  className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500"
                                  title="Marcar todos como agendado (G)"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => markAllNotScheduled(member)}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-500"
                                  title="Marcar todos como não agendado (R)"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>
                          {days.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isScheduled = scheduleData[member]?.[dateStr] || false;
                            return (
                              <td
                                key={dateStr}
                                className="p-0.5 border-b border-border"
                              >
                                <button
                                  onClick={(e) => {
                                    if (e.shiftKey) {
                                      // Shift+click = mark as scheduled (green)
                                      setSchedule(member, day, true);
                                    } else if (e.ctrlKey || e.metaKey) {
                                      // Ctrl+click = mark as not scheduled (red)
                                      setSchedule(member, day, false);
                                    } else {
                                      toggleSchedule(member, day);
                                    }
                                  }}
                                  className={`w-full h-6 rounded-sm transition-all ${
                                    isScheduled
                                      ? 'bg-emerald-500 hover:bg-emerald-600'
                                      : 'bg-red-500/30 hover:bg-red-500/50'
                                  }`}
                                  title="Clique: alternar | Shift+clique: agendar | Ctrl+clique: remover"
                                />
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-bold border-b border-border">
                            {memberScheduled}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Legend and Shortcuts */}
      <div className="flex flex-col items-center gap-3 mt-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-emerald-500" />
            <span className="text-sm text-muted-foreground">Agendado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-red-500/30" />
            <span className="text-sm text-muted-foreground">Não Agendado</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <span><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Shift</kbd> + Clique = Agendar</span>
          <span><kbd className="px-1.5 py-0.5 bg-background rounded border text-[10px]">Ctrl</kbd> + Clique = Remover</span>
          <span>Ícones na linha = Marcar toda linha</span>
        </div>
      </div>

      {/* Hidden PDF Report */}
      <div
        ref={reportRef}
        className={cn("absolute left-[-9999px] top-0 w-[800px] bg-[#fafafa] p-8", isExportingPDF && "left-0")}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
          <img src={curliLogo} alt="Curli Logo" className="h-16 object-contain" />
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-800">Relatório de Agendamentos</h1>
            <p className="text-lg text-gray-600">{format(reportDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-emerald-700">{reportData.scheduled.length}</div>
            <div className="text-sm text-emerald-600">Agendados</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-red-700">{reportData.notScheduled.length}</div>
            <div className="text-sm text-red-600">Não Agendados</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-700">{allMembers.length}</div>
            <div className="text-sm text-blue-600">Total Membros</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-purple-700">
              {allMembers.length > 0 ? ((reportData.scheduled.length / allMembers.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-purple-600">Taxa do Dia</div>
          </div>
        </div>

        {/* Monthly Metrics */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="font-bold text-gray-800 mb-3">Métricas do Mês</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Taxa Mensal:</span>
              <span className="font-bold ml-2">{metrics.scheduledRate.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-600">Meta:</span>
              <span className="font-bold ml-2">{daysGoal} dias</span>
            </div>
            <div>
              <span className="text-gray-600">Melhor Membro:</span>
              <span className="font-bold ml-2">{metrics.ranking[0]?.name || '-'}</span>
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-2 gap-6">
          {/* Scheduled */}
          <div>
            <h3 className="font-bold text-emerald-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Agendaram Live ({reportData.scheduled.length})
            </h3>
            <div className="space-y-1">
              {reportData.scheduled.length === 0 ? (
                <p className="text-gray-500 italic">Nenhum agendamento</p>
              ) : (
                reportData.scheduled.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm py-1 border-b border-gray-200">
                    <span className="font-medium text-gray-800">{member.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Not Scheduled */}
          <div>
            <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Não Agendaram ({reportData.notScheduled.length})
            </h3>
            <div className="space-y-1">
              {reportData.notScheduled.length === 0 ? (
                <p className="text-gray-500 italic">Todos agendaram!</p>
              ) : (
                reportData.notScheduled.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm py-1 border-b border-gray-200">
                    <span className="font-medium text-gray-800">{member.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          Relatório gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    </div>
  );
};

export default SchedulingDashboard;
