import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, getDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, BarChart3, Target, TrendingUp, TrendingDown, Users, ChevronLeft, ChevronRight, Save, Home, CheckCircle2, XCircle, FileText, Plus, Trash2, AlertTriangle, Activity } from 'lucide-react';
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
  ComposedChart,
  Area,
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

interface DiamondEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

const CHART_DATA_ID = '00000000-0000-0000-0000-000000000002';

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
  const [activeCreators, setActiveCreators] = useState(0);
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
  const [diamondEntries, setDiamondEntries] = useState<DiamondEntry[]>([]);
  const [isExportingImpactPDF, setIsExportingImpactPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const impactReportRef = useRef<HTMLDivElement>(null);
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
        
        // Load schedules and diamond data in parallel
        const [schedulesResult, goalsResult, diamondsResult] = await Promise.all([
          supabase
            .from('live_schedules')
            .select('*')
            .gte('schedule_date', `${monthStr}-01`)
            .lte('schedule_date', `${monthStr}-31`),
          supabase
            .from('scheduling_goals')
            .select('*')
            .eq('month', currentMonth.getMonth() + 1)
            .eq('year', currentMonth.getFullYear())
            .maybeSingle(),
          supabase
            .from('dashboard_data')
            .select('*')
            .eq('id', CHART_DATA_ID)
            .maybeSingle()
        ]);

        if (schedulesResult.error) throw schedulesResult.error;

        const newScheduleData: ScheduleData = {};
        schedulesResult.data?.forEach((schedule) => {
          if (!newScheduleData[schedule.member_name]) {
            newScheduleData[schedule.member_name] = {};
          }
          newScheduleData[schedule.member_name][schedule.schedule_date] = schedule.is_scheduled;
        });
        setScheduleData(newScheduleData);

        // Load goals
        if (goalsResult.data) {
          setDaysGoal(goalsResult.data.days_goal);
          setActiveCreators((goalsResult.data as any).active_creators || 0);
        }

        // Load diamond entries
        if (diamondsResult.data?.data) {
          const parsed = diamondsResult.data.data as { entries?: DiamondEntry[] };
          if (parsed.entries) {
            setDiamondEntries(parsed.entries);
          }
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
            active_creators: activeCreators,
          } as any,
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

  // Impact Analysis - Correlate scheduling with diamond performance
  const impactAnalysis = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    const currentMonthDiamonds = diamondEntries.filter(e => e.date.startsWith(monthStr));
    
    // Create daily correlation data with more realistic impact calculation
    const correlationData: {
      date: string;
      dateLabel: string;
      schedulingRate: number;
      scheduledCount: number;
      notScheduledCount: number;
      totalMembers: number;
      diamonds: number;
      diamondChange: number;
      diamondChangePercent: number;
      impact: 'positive' | 'negative' | 'neutral';
      impactScore: number;
      estimatedLoss: number;
      notScheduledNames: string[];
    }[] = [];

    // Sort diamond entries by date
    const sortedDiamonds = [...currentMonthDiamonds].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedDiamonds.forEach((entry, index) => {
      const dateStr = entry.date;
      const dayStats = metrics.dayStats[dateStr];
      const scheduledCount = dayStats?.scheduled || 0;
      const totalMembers = dayStats?.total || allMembers.length;
      const notScheduledCount = totalMembers - scheduledCount;
      const schedulingRate = totalMembers > 0 ? (scheduledCount / totalMembers) * 100 : 0;
      
      // Get names of members who didn't schedule
      const notScheduledNames: string[] = [];
      allMembers.forEach(member => {
        const isScheduled = scheduleData[member.name]?.[dateStr];
        if (!isScheduled) {
          notScheduledNames.push(member.name);
        }
      });
      
      // Calculate diamond change from previous day
      const prevEntry = index > 0 ? sortedDiamonds[index - 1] : null;
      const diamondChange = prevEntry ? entry.diamonds - prevEntry.diamonds : 0;
      const diamondChangePercent = prevEntry && prevEntry.diamonds > 0 
        ? ((entry.diamonds - prevEntry.diamonds) / prevEntry.diamonds) * 100 
        : 0;
      
      // More realistic impact calculation:
      // If there was ANY diamond drop AND members didn't schedule, estimate the impact
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      let impactScore = 0;
      let estimatedLoss = 0;
      
      if (diamondChange < 0 && notScheduledCount > 0) {
        // Any drop with missing schedules is considered negative impact
        impact = 'negative';
        // Estimated loss = proportion of missing schedules × total drop
        const missingRate = notScheduledCount / totalMembers;
        estimatedLoss = Math.abs(diamondChange) * missingRate;
        impactScore = (missingRate * 100) * (Math.abs(diamondChange) / 1000000);
      } else if (diamondChange > 0 && schedulingRate >= 60) {
        impact = 'positive';
        impactScore = (schedulingRate / 100) * (diamondChange / 1000000);
      } else if (diamondChange < 0 && notScheduledCount === 0) {
        // Drop but everyone scheduled - external factors
        impact = 'neutral';
      }
      
      correlationData.push({
        date: dateStr,
        dateLabel: format(new Date(dateStr + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        schedulingRate,
        scheduledCount,
        notScheduledCount,
        totalMembers,
        diamonds: entry.diamonds,
        diamondChange,
        diamondChangePercent,
        impact,
        impactScore,
        estimatedLoss,
        notScheduledNames,
      });
    });

    // Calculate summary statistics
    const negativeDays = correlationData.filter(d => d.impact === 'negative');
    const positiveDays = correlationData.filter(d => d.impact === 'positive');
    const daysWithDropAndMissing = correlationData.filter(d => d.diamondChange < 0 && d.notScheduledCount > 0);
    
    const avgDiamondsHighScheduling = correlationData
      .filter(d => d.schedulingRate >= 70)
      .reduce((sum, d) => sum + d.diamonds, 0) / 
      (correlationData.filter(d => d.schedulingRate >= 70).length || 1);
    
    const avgDiamondsLowScheduling = correlationData
      .filter(d => d.schedulingRate < 70)
      .reduce((sum, d) => sum + d.diamonds, 0) / 
      (correlationData.filter(d => d.schedulingRate < 70).length || 1);

    // Total estimated loss from missing schedules
    const totalEstimatedLoss = correlationData.reduce((sum, d) => sum + d.estimatedLoss, 0);
    
    // Average loss per missing member
    const totalMissingInstances = correlationData.reduce((sum, d) => sum + d.notScheduledCount, 0);
    const avgLossPerMissing = totalMissingInstances > 0 
      ? totalEstimatedLoss / totalMissingInstances 
      : 0;
    
    // Most problematic days (any drop with missing schedules, sorted by estimated loss)
    const problematicDays = correlationData
      .filter(d => d.estimatedLoss > 0)
      .sort((a, b) => b.estimatedLoss - a.estimatedLoss)
      .slice(0, 5);

    // Members who appear most in problematic days
    const memberImpactCount: { [name: string]: { count: number; totalLoss: number } } = {};
    problematicDays.forEach(day => {
      day.notScheduledNames.forEach(name => {
        if (!memberImpactCount[name]) {
          memberImpactCount[name] = { count: 0, totalLoss: 0 };
        }
        memberImpactCount[name].count++;
        memberImpactCount[name].totalLoss += day.estimatedLoss / day.notScheduledCount;
      });
    });
    
    const frequentMissers = Object.entries(memberImpactCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalLoss - a.totalLoss)
      .slice(0, 5);

    return {
      correlationData,
      negativeDays: negativeDays.length,
      positiveDays: positiveDays.length,
      daysWithDropAndMissing: daysWithDropAndMissing.length,
      avgDiamondsHighScheduling,
      avgDiamondsLowScheduling,
      differencePercent: avgDiamondsHighScheduling > 0 && avgDiamondsLowScheduling > 0
        ? ((avgDiamondsHighScheduling - avgDiamondsLowScheduling) / avgDiamondsLowScheduling) * 100
        : 0,
      totalEstimatedLoss,
      avgLossPerMissing,
      problematicDays,
      frequentMissers,
      hasData: correlationData.length > 0,
    };
  }, [currentMonth, diamondEntries, metrics.dayStats, allMembers, scheduleData]);

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

  // Export Impact Analysis PDF
  const handleExportImpactPDF = async () => {
    if (!impactReportRef.current) return;
    setIsExportingImpactPDF(true);

    try {
      const canvas = await html2canvas(impactReportRef.current, {
        scale: 2,
        backgroundColor: '#fafafa',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

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

      pdf.save(`relatorio-impacto-agendamentos-${format(currentMonth, 'MM-yyyy')}.pdf`);
      toast({ title: 'Relatório de impacto exportado!' });
    } catch (error) {
      console.error('Error exporting Impact PDF:', error);
      toast({ title: 'Erro ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExportingImpactPDF(false);
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

        <Card className="bg-cyan-500/10 border-cyan-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Criadores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={activeCreators}
                onChange={(e) => setActiveCreators(parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-center"
              />
              <span className="text-sm text-muted-foreground">ativos</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total de criadores ativos no mês</p>
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

      {/* Impact Analysis Section */}
      {impactAnalysis.hasData && (
        <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Análise de Impacto: Agendamentos × Diamantes
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportImpactPDF}
              disabled={isExportingImpactPDF}
              className="text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isExportingImpactPDF ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Falta/Queda</span>
                </div>
                <div className="text-2xl font-bold text-red-500">{impactAnalysis.daysWithDropAndMissing}</div>
                <p className="text-xs text-muted-foreground">dias</p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Perda Total</span>
                </div>
                <div className="text-2xl font-bold text-orange-500">
                  {impactAnalysis.totalEstimatedLoss > 0 
                    ? (impactAnalysis.totalEstimatedLoss / 1000000).toFixed(2) + 'M'
                    : '-'}
                </div>
                <p className="text-xs text-muted-foreground">por faltas</p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Perda/Falta</span>
                </div>
                <div className="text-2xl font-bold text-yellow-500">
                  {impactAnalysis.avgLossPerMissing > 0 
                    ? (impactAnalysis.avgLossPerMissing / 1000).toFixed(0) + 'K'
                    : '-'}
                </div>
                <p className="text-xs text-muted-foreground">média</p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">💎 ≥70%</span>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {impactAnalysis.avgDiamondsHighScheduling > 0 
                    ? (impactAnalysis.avgDiamondsHighScheduling / 1000000).toFixed(2) + 'M'
                    : '-'}
                </div>
                <p className="text-xs text-muted-foreground">média/dia</p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">💎 &lt;70%</span>
                </div>
                <div className="text-2xl font-bold text-emerald-500">
                  {impactAnalysis.avgDiamondsLowScheduling > 0 
                    ? (impactAnalysis.avgDiamondsLowScheduling / 1000000).toFixed(2) + 'M'
                    : '-'}
                </div>
                <p className="text-xs text-muted-foreground">média/dia</p>
              </div>
            </div>

            {/* Correlation Chart */}
            <div className="mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-3">Taxa x Diamantes</h4>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={impactAnalysis.correlationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dateLabel" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                    label={{ value: 'Taxa %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    label={{ value: 'Diamantes', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'schedulingRate') return [`${value.toFixed(0)}%`, 'Taxa Agendamento'];
                      if (name === 'diamonds') return [(value / 1000000).toFixed(2) + 'M', 'Diamantes'];
                      return [value, name];
                    }}
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="schedulingRate" 
                    fill="hsl(var(--primary) / 0.2)" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="diamonds" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Problematic Days List */}
            {impactAnalysis.problematicDays.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Dias Problemáticos
                </h4>
                <div className="space-y-2">
                  {impactAnalysis.problematicDays.map((day) => (
                    <div 
                      key={day.date} 
                      className="bg-red-500/10 rounded-lg p-3 border border-red-500/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">{day.dateLabel}</div>
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                            {day.schedulingRate.toFixed(0)}%
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            {day.notScheduledCount} faltas
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-400 font-medium">
                            {(day.diamondChange / 1000000).toFixed(2)}M
                          </span>
                          <span className="text-xs text-orange-400 font-medium">
                            (~{(day.estimatedLoss / 1000000).toFixed(2)}M perda)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Faltas:</span>
                        {day.notScheduledNames.slice(0, 5).map((name, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-red-500/10 text-red-300 rounded text-xs">
                            {name}
                          </span>
                        ))}
                        {day.notScheduledNames.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{day.notScheduledNames.length - 5}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frequent Missers */}
            {impactAnalysis.frequentMissers.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-yellow-500" />
                  Maior Impacto
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {impactAnalysis.frequentMissers.map((member, idx) => (
                    <div key={member.name} className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20 text-center">
                      <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                      <div className="text-sm font-medium truncate">{member.name}</div>
                      <div className="text-xs text-yellow-400">{member.count}x</div>
                      <div className="text-xs text-orange-400">~{(member.totalLoss / 1000000).toFixed(2)}M</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Difference indicator */}
            {impactAnalysis.differencePercent !== 0 && (
              <div className="mt-4 p-4 bg-background rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1">Impacto</div>
                <div className="text-lg font-bold">
                  Taxa ≥70% = {' '}
                  <span className={impactAnalysis.differencePercent > 0 ? 'text-emerald-500' : 'text-red-500'}>
                    {impactAnalysis.differencePercent > 0 ? '+' : ''}{impactAnalysis.differencePercent.toFixed(1)}%
                  </span>{' '}
                  💎
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          {/* Monthly Summary - Styled Cards */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {/* Dias Agendados */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dias Agendados
              </div>
              <div className="text-2xl font-bold text-emerald-600">{metrics.scheduledRate.toFixed(1)}%</div>
              <div className="text-xs text-emerald-700 mt-1">{metrics.totalScheduled} agendamentos</div>
            </div>

            {/* Dias Sem Agendamento */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Dias Sem Agendamento
              </div>
              <div className="text-2xl font-bold text-red-500">{metrics.unscheduledRate.toFixed(1)}%</div>
              <div className="text-xs text-green-700 mt-1">{metrics.totalPossible - metrics.totalScheduled} vazios</div>
            </div>

            {/* Dia Mais Problemático */}
            <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
              <div className="flex items-center gap-1.5 text-cyan-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Dia Mais Problemático
              </div>
              <div className="text-2xl font-bold text-cyan-700">{metrics.worstDays[0]?.dayName || '-'}</div>
              <div className="text-xs text-cyan-600 mt-1">{metrics.worstDays[0]?.rate?.toFixed(1) || '0'}% de agendamentos</div>
            </div>

            {/* Melhor Membro */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Melhor Membro
              </div>
              <div className="text-lg font-bold text-amber-700 truncate">
                {metrics.ranking[0]?.name || '-'}
              </div>
              <div className="text-xs text-amber-600 mt-1">
                {metrics.ranking[0]?.scheduled || 0} dias agendados
              </div>
            </div>

            {/* Meta do Mês */}
            <div className="bg-fuchsia-50 rounded-xl p-4 border border-fuchsia-200">
              <div className="flex items-center gap-1.5 text-fuchsia-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Meta do Mês
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-fuchsia-700">{daysGoal}</span>
                <span className="text-sm text-fuchsia-600">dias</span>
              </div>
              <div className="mt-2 h-1.5 bg-fuchsia-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-fuchsia-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, metrics.goalProgress)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Impacto Card */}
          {impactAnalysis.hasData && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium mb-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Impacto Taxa ≥70%
                  </div>
                  <div className="text-lg font-bold">
                    <span className={impactAnalysis.differencePercent > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {impactAnalysis.differencePercent > 0 ? '+' : ''}{impactAnalysis.differencePercent.toFixed(1)}%
                    </span>
                    <span className="text-gray-600 ml-1">💎 diamantes</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500">💎 ≥70%</div>
                    <div className="text-sm font-bold text-emerald-600">
                      {(impactAnalysis.avgDiamondsHighScheduling / 1000000).toFixed(2)}M
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">💎 &lt;70%</div>
                    <div className="text-sm font-bold text-red-600">
                      {(impactAnalysis.avgDiamondsLowScheduling / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Period Totals */}
          <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-700">{reportTotals.totalScheduled}</span>
                <span className="text-gray-500 text-sm">✓</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-bold text-red-700">{reportTotals.totalNotScheduled}</span>
                <span className="text-gray-500 text-sm">✗</span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {reportRangeData.length} dia{reportRangeData.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="space-y-4">
            {reportRangeData.map((dayData) => {
              const totalMembers = dayData.scheduled.length + dayData.notScheduled.length;
              const dayRate = totalMembers > 0 
                ? (dayData.scheduled.length / totalMembers) * 100 
                : 0;
              // Get impact data for this day
              const dayImpact = impactAnalysis.correlationData.find(d => d.date === dayData.date);
              return (
                <div key={dayData.date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2">
                    <span className="font-medium text-sm">
                      {format(new Date(dayData.date + 'T12:00:00'), "EEEE, dd/MM", { locale: ptBR })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300">{dayData.scheduled.length}/{totalMembers}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{dayRate.toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  {/* Impact Info Banner */}
                  {dayImpact && dayImpact.diamondChange !== 0 && dayData.notScheduled.length > 0 && (
                    <div className={`px-4 py-2 text-xs ${dayImpact.diamondChange < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <div className="flex items-center justify-between">
                        <span>
                          💎 {(dayImpact.diamonds / 1000000).toFixed(2)}M 
                          ({dayImpact.diamondChange > 0 ? '+' : ''}{(dayImpact.diamondChange / 1000000).toFixed(2)}M)
                        </span>
                        {dayImpact.estimatedLoss > 0 && (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                            Perda: ~{(dayImpact.estimatedLoss / 1000000).toFixed(2)}M ({dayData.notScheduled.length} faltas)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 p-4">
                    <div>
                      <div className="text-xs text-emerald-600 font-medium mb-2 flex items-center justify-center gap-2">
                        ✓ Live ({dayData.scheduled.length})
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {dayData.scheduled.length === 0 ? (
                          <span className="text-gray-400 text-xs italic">-</span>
                        ) : (
                          dayData.scheduled.map((name, idx) => (
                            <span key={idx} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs border border-emerald-200">
                              {name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-red-600 font-medium mb-2 flex items-center justify-center gap-2">
                        ✗ Falta ({dayData.notScheduled.length})
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {dayData.notScheduled.length === 0 ? (
                          <span className="text-emerald-500 text-xs font-medium">100%</span>
                        ) : (
                          dayData.notScheduled.map((name, idx) => (
                            <span key={idx} className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs border border-red-200">
                              {name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Low Scheduling Members Section */}
          {(() => {
            const lowSchedulingMembers = metrics.ranking
              .filter(m => m.scheduled < (daysGoal * 0.5))
              .sort((a, b) => a.scheduled - b.scheduled)
              .slice(0, 10);
            
            if (lowSchedulingMembers.length === 0) return null;
            
            return (
              <div className="mt-6 bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 text-red-600 text-sm font-semibold mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Associados com Baixo Agendamento
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {lowSchedulingMembers.map((member, idx) => (
                    <div key={member.name} className="bg-white rounded-lg p-3 border border-red-100 text-center">
                      <div className="text-xs text-gray-400 mb-1">#{idx + 1}</div>
                      <div className="text-xs font-medium text-gray-900 truncate">{member.name}</div>
                      <div className="text-lg font-bold text-red-600">{member.scheduled}</div>
                      <div className="text-xs text-gray-500">dias</div>
                      <div className="mt-1.5 h-1 bg-red-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${Math.min(100, (member.scheduled / daysGoal) * 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-red-500 mt-1">
                        {((member.scheduled / daysGoal) * 100).toFixed(0)}% da meta
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs font-medium text-purple-600 mb-1">
              Relatório gerado pelo Sistema de Painel da Curli
            </p>
            <p className="text-xs text-gray-400">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Hidden Impact Analysis PDF Report */}
      <div
        ref={impactReportRef}
        className={cn("absolute left-[-9999px] top-0 w-[800px] bg-[#fafafa]", isExportingImpactPDF && "left-0")}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-6">
          <div className="flex items-center justify-between">
            <img src={curliLogo} alt="Curli Logo" className="h-14 object-contain brightness-0 invert" />
            <div className="text-right">
              <h1 className="text-xl font-bold tracking-wide">ANÁLISE DE IMPACTO</h1>
              <p className="text-orange-100 text-sm mt-1">
                Agendamentos × Diamantes - {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Summary Section - Styled Cards */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {/* Dias com Queda */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-1.5 text-red-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                Dias com Queda
              </div>
              <div className="text-2xl font-bold text-red-600">{impactAnalysis.daysWithDropAndMissing}</div>
              <div className="text-xs text-red-700 mt-1">falta + queda 💎</div>
            </div>

            {/* Perda Total */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-1.5 text-orange-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Perda Total
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {impactAnalysis.totalEstimatedLoss > 0 
                  ? (impactAnalysis.totalEstimatedLoss / 1000000).toFixed(2) + 'M'
                  : '-'}
              </div>
              <div className="text-xs text-orange-700 mt-1">estimativa</div>
            </div>

            {/* Perda por Falta */}
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center gap-1.5 text-yellow-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Perda/Falta
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {impactAnalysis.avgLossPerMissing > 0 
                  ? (impactAnalysis.avgLossPerMissing / 1000).toFixed(0) + 'K'
                  : '-'}
              </div>
              <div className="text-xs text-yellow-700 mt-1">média</div>
            </div>

            {/* Diamantes ≥70% */}
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                💎 Taxa ≥70%
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {impactAnalysis.avgDiamondsHighScheduling > 0 
                  ? (impactAnalysis.avgDiamondsHighScheduling / 1000000).toFixed(2) + 'M'
                  : '-'}
              </div>
              <div className="text-xs text-emerald-700 mt-1">média/dia</div>
            </div>

            {/* Diamantes <70% */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-1.5 text-gray-600 text-xs font-medium mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                💎 Taxa &lt;70%
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {impactAnalysis.avgDiamondsLowScheduling > 0 
                  ? (impactAnalysis.avgDiamondsLowScheduling / 1000000).toFixed(2) + 'M'
                  : '-'}
              </div>
              <div className="text-xs text-gray-500 mt-1">média/dia</div>
            </div>
          </div>

          {/* Impacto Card */}
          {impactAnalysis.differencePercent !== 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-6 border border-orange-200">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-orange-600 text-sm font-medium mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Impacto da Taxa de Agendamento
                </div>
                <div className="text-xl font-bold text-gray-900">
                  Taxa ≥70% = {' '}
                  <span className={impactAnalysis.differencePercent > 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {impactAnalysis.differencePercent > 0 ? '+' : ''}{impactAnalysis.differencePercent.toFixed(1)}%
                  </span>{' '}
                  💎 diamantes
                </div>
              </div>
            </div>
          )}

          {/* Daily Correlation Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gray-900 text-white px-4 py-2">
              <span className="font-medium text-sm">Taxa x Diamantes</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Taxa</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">💎</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">+/-</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {impactAnalysis.correlationData.map((day) => (
                  <tr key={day.date} className={day.impact === 'negative' ? 'bg-red-50' : day.impact === 'positive' ? 'bg-emerald-50' : ''}>
                    <td className="px-3 py-2 text-gray-900">{day.dateLabel}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        day.schedulingRate >= 70 ? 'bg-emerald-100 text-emerald-700' :
                        day.schedulingRate < 50 ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {day.schedulingRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-900">{(day.diamonds / 1000000).toFixed(2)}M</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-medium ${day.diamondChange > 0 ? 'text-emerald-600' : day.diamondChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {day.diamondChange > 0 ? '+' : ''}{(day.diamondChange / 1000000).toFixed(2)}M
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        day.impact === 'negative' ? 'bg-red-100 text-red-700' :
                        day.impact === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {day.impact === 'negative' ? 'NEGATIVO' : day.impact === 'positive' ? 'POSITIVO' : 'NEUTRO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Problematic Days Section */}
          {impactAnalysis.problematicDays.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden mb-6">
              <div className="bg-red-600 text-white px-4 py-2">
                <span className="font-medium text-sm">⚠ Dias Problemáticos</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-3">Queda de 💎 + faltas</p>
                <div className="space-y-2">
                  {impactAnalysis.problematicDays.map((day) => (
                    <div key={day.date} className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{day.dateLabel}</span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            {day.schedulingRate.toFixed(0)}%
                          </span>
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            {day.notScheduledCount} faltas
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 font-bold">{(day.diamondChange / 1000000).toFixed(2)}M</span>
                          <span className="text-orange-600 font-medium text-xs">~{(day.estimatedLoss / 1000000).toFixed(2)}M perda</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Faltas:</strong> {day.notScheduledNames.slice(0, 6).join(', ')}
                        {day.notScheduledNames.length > 6 && ` +${day.notScheduledNames.length - 6}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Frequent Missers Section */}
          {impactAnalysis.frequentMissers.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-yellow-200 overflow-hidden">
              <div className="bg-yellow-500 text-white px-4 py-2">
                <span className="font-medium text-sm">👥 Maior Impacto</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-3">Mais frequentes em dias de queda</p>
                <div className="grid grid-cols-5 gap-2">
                  {impactAnalysis.frequentMissers.map((member, idx) => (
                    <div key={member.name} className="bg-yellow-50 rounded-lg p-3 border border-yellow-100 text-center">
                      <div className="text-xs text-gray-400 mb-1">#{idx + 1}</div>
                      <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                      <div className="text-xs text-yellow-600">{member.count}x</div>
                      <div className="text-xs text-orange-600">~{(member.totalLoss / 1000000).toFixed(2)}M</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs font-medium text-purple-600 mb-1">
              Relatório gerado pelo Sistema de Painel da Curli
            </p>
            <p className="text-xs text-gray-400">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulingDashboard;
