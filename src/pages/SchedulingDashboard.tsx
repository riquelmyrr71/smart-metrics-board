import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, getDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, BarChart3, Target, TrendingUp, Users, ChevronLeft, ChevronRight, Save, Home, CheckCircle2, XCircle, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface TeamStructure {
  executive: string;
  members: string[];
}

const DEFAULT_TEAM_STRUCTURE: TeamStructure[] = [
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
  const [teamStructure, setTeamStructure] = useState<TeamStructure[]>(DEFAULT_TEAM_STRUCTURE);
  const [newExecutiveName, setNewExecutiveName] = useState('');
  const [newAssociateName, setNewAssociateName] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [showExecutiveDialog, setShowExecutiveDialog] = useState(false);
  const [showAssociateDialog, setShowAssociateDialog] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
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
    teamStructure.forEach((team) => {
      team.members.forEach((member) => {
        members.push({ name: member, executive: team.executive });
      });
    });
    return members;
  }, [teamStructure]);

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

  // Handle single click - mark as scheduled
  const handleSingleClick = (memberName: string, date: Date) => {
    setSchedule(memberName, date, true);
  };

  // Handle double click - mark as not scheduled
  const handleDoubleClick = (memberName: string, date: Date) => {
    setSchedule(memberName, date, false);
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

  // Add new executive
  const addExecutive = () => {
    if (!newExecutiveName.trim()) return;
    setTeamStructure((prev) => [
      ...prev,
      { executive: newExecutiveName.toUpperCase(), members: [] },
    ]);
    setNewExecutiveName('');
    setShowExecutiveDialog(false);
    toast({ title: 'Executivo adicionado!' });
  };

  // Add new associate
  const addAssociate = () => {
    if (!newAssociateName.trim() || !selectedExecutive) return;
    setTeamStructure((prev) =>
      prev.map((team) =>
        team.executive === selectedExecutive
          ? { ...team, members: [...team.members, newAssociateName.toUpperCase()] }
          : team
      )
    );
    setNewAssociateName('');
    setSelectedExecutive('');
    setShowAssociateDialog(false);
    toast({ title: 'Associado adicionado!' });
  };

  // Remove executive
  const removeExecutive = (executiveName: string) => {
    setTeamStructure((prev) => prev.filter((team) => team.executive !== executiveName));
    toast({ title: 'Executivo removido!' });
  };

  // Remove associate
  const removeAssociate = (executiveName: string, memberName: string) => {
    setTeamStructure((prev) =>
      prev.map((team) =>
        team.executive === executiveName
          ? { ...team, members: team.members.filter((m) => m !== memberName) }
          : team
      )
    );
    toast({ title: 'Associado removido!' });
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

  // Get report data for date range
  const getReportDataRange = (startDate: Date, endDate: Date) => {
    const dailyData: { date: string; scheduled: string[]; notScheduled: string[] }[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const scheduled: string[] = [];
      const notScheduled: string[] = [];

      teamStructure.forEach((team) => {
        team.members.forEach((member) => {
          const isScheduled = scheduleData[member]?.[dateStr] || false;
          if (isScheduled) {
            scheduled.push(member);
          } else {
            notScheduled.push(member);
          }
        });
      });

      dailyData.push({ date: dateStr, scheduled, notScheduled });
      currentDate = addDays(currentDate, 1);
    }

    return dailyData;
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

      // Handle multi-page PDFs
      if (imgHeight > 297) {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= 297;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`relatorio agendamento live ${format(reportDate, 'dd-MM-yyyy')}.pdf`);

      toast({ title: 'PDF exportado com sucesso!' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Get date range based on report type
  const getReportDateRange = () => {
    if (reportType === 'daily') {
      return { start: reportDate, end: reportDate };
    } else if (reportType === 'weekly') {
      return { start: subDays(reportDate, 6), end: reportDate };
    } else {
      return { start: startOfMonth(reportDate), end: reportDate };
    }
  };

  const reportDateRange = getReportDateRange();
  const reportRangeData = getReportDataRange(reportDateRange.start, reportDateRange.end);

  // Calculate totals for report
  const reportTotals = useMemo(() => {
    let totalScheduled = 0;
    let totalNotScheduled = 0;
    reportRangeData.forEach((day) => {
      totalScheduled += day.scheduled.length;
      totalNotScheduled += day.notScheduled.length;
    });
    return { totalScheduled, totalNotScheduled, rate: totalScheduled + totalNotScheduled > 0 ? (totalScheduled / (totalScheduled + totalNotScheduled)) * 100 : 0 };
  }, [reportRangeData]);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <Home className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
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

      {/* Management Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <Dialog open={showExecutiveDialog} onOpenChange={setShowExecutiveDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Executivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Executivo</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Nome do executivo"
              value={newExecutiveName}
              onChange={(e) => setNewExecutiveName(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={addExecutive}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssociateDialog} onOpenChange={setShowAssociateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Associado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Associado</DialogTitle>
            </DialogHeader>
            <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o executivo" />
              </SelectTrigger>
              <SelectContent>
                {teamStructure.map((team) => (
                  <SelectItem key={team.executive} value={team.executive}>
                    {team.executive}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Nome do associado"
              value={newAssociateName}
              onChange={(e) => setNewAssociateName(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={addAssociate}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* PDF Report Export Section */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Relatório de Agendamentos</span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={reportType} onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setReportType(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Últimos 7 dias</SelectItem>
                  <SelectItem value="monthly">Mês completo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={format(reportDate, 'yyyy-MM-dd')}
                onChange={(e) => e.target.value && setReportDate(new Date(e.target.value + 'T12:00:00'))}
                className="w-[180px]"
              />
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
            <CalendarIcon className="h-4 w-4" />
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
                  <th className="sticky left-0 bg-background z-10 text-left p-2 min-w-[180px]">Membro</th>
                  {days.map((day) => (
                    <th key={day.toISOString()} className="p-1 text-center min-w-[28px]">
                      {format(day, 'dd')}
                    </th>
                  ))}
                  <th className="p-2 text-center min-w-[60px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {teamStructure.map((team) => (
                  <React.Fragment key={team.executive}>
                    {/* Executive Header */}
                    <tr className="bg-foreground/90 group">
                      <td colSpan={days.length + 1} className="p-2 font-bold text-background text-center">
                        {team.executive}
                      </td>
                      <td className="p-1 bg-foreground/90">
                        <button
                          onClick={() => removeExecutive(team.executive)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/30 text-red-400 transition-opacity"
                          title="Remover executivo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
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
                                  title="Marcar todos como agendado"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => markAllNotScheduled(member)}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-500"
                                  title="Marcar todos como não agendado"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => removeAssociate(team.executive, member)}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                  title="Remover associado"
                                >
                                  <Trash2 className="h-3 w-3" />
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
                                  onClick={() => handleSingleClick(member, day)}
                                  onDoubleClick={() => handleDoubleClick(member, day)}
                                  className={`w-full h-6 rounded-sm transition-all ${
                                    isScheduled
                                      ? 'bg-emerald-500 hover:bg-emerald-600'
                                      : 'bg-red-500 hover:bg-red-600'
                                  }`}
                                  title="1 clique: SIM (verde) | 2 cliques: NÃO (vermelho)"
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
            <span className="text-sm text-muted-foreground">SIM - Agendou</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-red-500" />
            <span className="text-sm text-muted-foreground">NÃO - Não Agendou</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
          <span><strong>1 clique</strong> = SIM (verde)</span>
          <span><strong>2 cliques</strong> = NÃO (vermelho)</span>
          <span>Ícones na linha = Ações rápidas</span>
        </div>
      </div>

      {/* Hidden PDF Report */}
      <div
        ref={reportRef}
        className={cn("absolute left-[-9999px] top-0 w-[800px] bg-[#fafafa]", isExportingPDF && "left-0")}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
          <div className="flex items-center justify-between">
            <img src={curliLogo} alt="Curli Logo" className="h-14 object-contain brightness-0 invert" />
            <div className="text-right">
              <h1 className="text-xl font-bold tracking-wide">AGENDAMENTO LIVE</h1>
              <p className="text-gray-300 text-sm mt-1">
                {reportType === 'daily' 
                  ? format(reportDate, "dd/MM/yyyy", { locale: ptBR })
                  : `${format(reportDateRange.start, "dd/MM")} - ${format(reportDateRange.end, "dd/MM/yyyy")}`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Summary Bar */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600 text-sm">Agendados:</span>
                <span className="font-bold text-gray-900">{reportTotals.totalScheduled}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600 text-sm">Não Agendados:</span>
                <span className="font-bold text-gray-900">{reportTotals.totalNotScheduled}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
              <span className="text-gray-600 text-sm">Taxa:</span>
              <span className="font-bold text-gray-900 text-lg">{reportTotals.rate.toFixed(0)}%</span>
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="space-y-4">
            {reportRangeData.map((dayData) => {
              const dayRate = dayData.scheduled.length + dayData.notScheduled.length > 0 
                ? (dayData.scheduled.length / (dayData.scheduled.length + dayData.notScheduled.length)) * 100 
                : 0;
              return (
                <div key={dayData.date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2">
                    <span className="font-medium text-sm">
                      {format(new Date(dayData.date + 'T12:00:00'), "EEEE, dd/MM", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-emerald-400">{dayData.scheduled.length} ✓</span>
                      <span className="text-red-400">{dayData.notScheduled.length} ✗</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">{dayRate.toFixed(0)}%</span>
                    </div>
                  </div>
                  {dayData.notScheduled.length > 0 && (
                    <div className="px-4 py-3">
                      <div className="text-xs text-red-600 font-medium mb-2">Não agendaram:</div>
                      <div className="flex flex-wrap gap-2">
                        {dayData.notScheduled.map((name, idx) => (
                          <span key={idx} className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs border border-red-200">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dayData.notScheduled.length === 0 && (
                    <div className="px-4 py-3 text-center">
                      <span className="text-emerald-600 text-sm font-medium">✓ Todos agendaram</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 text-center text-xs text-gray-500 border-t border-gray-200">
          Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </div>
    </div>
  );
};

export default SchedulingDashboard;
