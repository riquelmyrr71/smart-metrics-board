import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, Calendar, Trophy, TrendingUp, Users, Gem, Swords, Radio, ChevronLeft, ChevronRight, Target, ArrowUpRight, Filter, GitCompare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, getDaysInMonth, eachDayOfInterval, differenceInDays, subDays, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import curliLogo from '@/assets/logo-curli.png';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Data IDs from other dashboards
const DASHBOARD_ID = '00000000-0000-0000-0000-000000000001';
const CHART_DATA_ID = '00000000-0000-0000-0000-000000000002';
const BATTLES_DATA_ID = '00000000-0000-0000-0000-000000000003';
const CREATORS_DATA_ID = '00000000-0000-0000-0000-000000000004';

type PeriodFilter = 'all' | '7d' | '15d' | 'custom';

interface MetricSummary {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  projection?: string;
  subtext?: string;
}

interface RankingItem {
  name: string;
  value: number;
  executive?: string;
}

interface DailyChartData {
  date: string;
  day: string;
  diamonds: number;
  creators: number;
  scheduling: number;
  battles: number;
  diamondsAccum: number;
  creatorsAccum: number;
}

interface MonthlyData {
  diamonds: { total: number; entries: number; projection: number };
  creators: { total: number; entries: number; projection: number };
  scheduling: { scheduled: number; total: number; rate: number; daysWithScheduling: number };
  battles: { total: number; entries: number; average: number; daysWithBattles: number; battleRate: number };
  creatorsAnalysis: { total: number; lastUpdated: string | null };
  dailyData: DailyChartData[];
  rankings: {
    diamonds: RankingItem[];
    creators: RankingItem[];
    scheduling: RankingItem[];
    battles: RankingItem[];
  };
}

interface ComparisonData {
  month: string;
  diamonds: number;
  diamondsChange?: number;
  creators: number;
  creatorsChange?: number;
  schedulingRate: number;
  schedulingChange?: number;
  battles: number;
  battlesChange?: number;
  creatorsAnalysis: number;
  creatorsAnalysisChange?: number;
}

const OverviewDashboard: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const consolidatedReportRef = useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const totalDaysInMonth = getDaysInMonth(currentMonth);
  const today = new Date();
  const daysElapsed = Math.min(
    differenceInDays(today, monthStart) + 1,
    totalDaysInMonth
  );

  useEffect(() => {
    loadMonthlyData();
    loadComparisonData();
  }, [currentMonth]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel with correct UUIDs
      const [mainDashboardResult, chartsResult, schedulingResult, battlesResult, creatorsAnalysisResult] = await Promise.all([
        supabase.from('dashboard_data').select('data, updated_at').eq('id', DASHBOARD_ID).maybeSingle(),
        supabase.from('dashboard_data').select('data, updated_at').eq('id', CHART_DATA_ID).maybeSingle(),
        supabase.from('live_schedules').select('*').gte('schedule_date', format(monthStart, 'yyyy-MM-dd')).lte('schedule_date', format(monthEnd, 'yyyy-MM-dd')),
        supabase.from('dashboard_data').select('data, updated_at').eq('id', BATTLES_DATA_ID).maybeSingle(),
        supabase.from('dashboard_data').select('data, updated_at').eq('id', CREATORS_DATA_ID).maybeSingle()
      ]);

      const mainDashboardData = mainDashboardResult.data;
      const chartsData = chartsResult.data;
      const schedulingData = schedulingResult.data;
      const battlesData = battlesResult.data;
      const creatorsAnalysisData = creatorsAnalysisResult.data;

      // Initialize daily data map
      const dailyMap: Record<string, DailyChartData> = {};
      const monthKey = format(currentMonth, 'yyyy-MM');
      
      // Initialize all days of the month
      eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        dailyMap[dateStr] = {
          date: dateStr,
          day: format(day, 'dd'),
          diamonds: 0,
          creators: 0,
          scheduling: 0,
          battles: 0,
          diamondsAccum: 0,
          creatorsAccum: 0
        };
      });

      // Process charts data (diamonds and creators)
      let diamondsTotal = 0;
      let diamondsEntries = 0;
      let creatorsTotal = 0;
      let creatorsEntries = 0;

      if (chartsData?.data) {
        const data = chartsData.data as any;
        const entries = data.entries || [];
        
        entries.forEach((entry: any) => {
          if (entry.date?.startsWith(monthKey) && dailyMap[entry.date]) {
            dailyMap[entry.date].diamonds = entry.diamonds || 0;
            dailyMap[entry.date].creators = entry.creators || 0;
            diamondsTotal += entry.diamonds || 0;
            creatorsTotal += entry.creators || 0;
            if (entry.diamonds > 0) diamondsEntries++;
            if (entry.creators > 0) creatorsEntries++;
          }
        });
      }

      // Calculate accumulated values
      let diamondsAccum = 0;
      let creatorsAccum = 0;
      Object.keys(dailyMap).sort().forEach(date => {
        diamondsAccum += dailyMap[date].diamonds;
        creatorsAccum += dailyMap[date].creators;
        dailyMap[date].diamondsAccum = diamondsAccum;
        dailyMap[date].creatorsAccum = creatorsAccum;
      });

      // Process scheduling data
      let scheduledCount = 0;
      let totalSchedules = 0;
      const schedulingByMember: Record<string, { scheduled: number; total: number; executive: string }> = {};
      const daysWithScheduling = new Set<string>();

      if (schedulingData) {
        schedulingData.forEach((schedule: any) => {
          const member = schedule.member_name;
          const date = schedule.schedule_date;
          
          if (!schedulingByMember[member]) {
            schedulingByMember[member] = { scheduled: 0, total: 0, executive: schedule.executive_name };
          }
          schedulingByMember[member].total++;
          totalSchedules++;
          
          if (schedule.is_scheduled) {
            schedulingByMember[member].scheduled++;
            scheduledCount++;
            daysWithScheduling.add(date);
          }
          
          if (dailyMap[date]) {
            const totalForDay = schedulingData.filter((s: any) => s.schedule_date === date).length;
            const scheduledForDay = schedulingData.filter((s: any) => s.schedule_date === date && s.is_scheduled).length;
            dailyMap[date].scheduling = totalForDay > 0 ? Math.round((scheduledForDay / totalForDay) * 100) : 0;
          }
        });
      }

      // Process battles data - NEW CORRECT FORMAT
      let battlesTotal = 0;
      let battlesEntries = 0;
      const battlesByMember: Record<string, { total: number; executive: string }> = {};
      const daysWithBattles = new Set<string>();

      if (battlesData?.data) {
        const data = battlesData.data as any;
        const battleData = data.battleData || {};
        const teamStructure = data.teamStructure || [];
        
        // Create member to executive mapping
        const memberToExecutive: Record<string, string> = {};
        teamStructure.forEach((team: any) => {
          team.members?.forEach((member: string) => {
            memberToExecutive[member] = team.executive;
          });
        });
        
        // Process battle data
        Object.entries(battleData).forEach(([member, dates]: [string, any]) => {
          if (!battlesByMember[member]) {
            battlesByMember[member] = { total: 0, executive: memberToExecutive[member] || '' };
          }
          
          Object.entries(dates).forEach(([dateStr, count]: [string, any]) => {
            if (dateStr.startsWith(monthKey)) {
              const battleCount = Number(count) || 0;
              battlesByMember[member].total += battleCount;
              battlesTotal += battleCount;
              if (battleCount > 0) {
                battlesEntries++;
                daysWithBattles.add(dateStr);
              }
              
              if (dailyMap[dateStr]) {
                dailyMap[dateStr].battles += battleCount;
              }
            }
          });
        });
      }

      // Calculate battle rate (% of days with battles up to today)
      const battleRate = daysElapsed > 0 ? Math.round((daysWithBattles.size / daysElapsed) * 100) : 0;

      // Process creators analysis
      let creatorsAnalysisTotal = 0;
      let creatorsLastUpdated: string | null = null;
      
      if (creatorsAnalysisData?.data) {
        const data = creatorsAnalysisData.data as any;
        if (data.creatorsData) {
          Object.values(data.creatorsData).forEach((count: any) => {
            creatorsAnalysisTotal += Number(count) || 0;
          });
        }
        creatorsLastUpdated = creatorsAnalysisData.updated_at || null;
      }

      // Calculate projections based on days with data
      const diamondsProjection = diamondsEntries > 0 
        ? Math.round((diamondsTotal / diamondsEntries) * totalDaysInMonth) 
        : 0;
      const creatorsProjection = creatorsEntries > 0 
        ? Math.round((creatorsTotal / creatorsEntries) * totalDaysInMonth) 
        : 0;
      const battlesAverage = daysWithBattles.size > 0 
        ? Math.round(battlesTotal / daysWithBattles.size) 
        : 0;

      // Build rankings
      const schedulingRanking: RankingItem[] = Object.entries(schedulingByMember)
        .map(([name, data]) => ({
          name,
          value: data.total > 0 ? Math.round((data.scheduled / data.total) * 100) : 0,
          executive: data.executive
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const battlesRanking: RankingItem[] = Object.entries(battlesByMember)
        .map(([name, data]) => ({
          name,
          value: data.total,
          executive: data.executive
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Build diamonds ranking from main dashboard
      const diamondsRanking: RankingItem[] = [];
      if (mainDashboardData?.data) {
        const dashData = mainDashboardData.data as any;
        const rows = dashData.rows || [];
        
        // Parse Brazilian number format
        const parseNumber = (value: any): number => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            // Remove dots (thousand separators) and replace comma with dot (decimal separator)
            return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
          }
          return 0;
        };
        
        rows.forEach((row: any) => {
          if (row.type === 'data' && row.cells?.diamantes_atuais?.value?.raw !== undefined) {
            const name = String(row.cells?.team?.value?.raw || '');
            const diamonds = parseNumber(row.cells?.diamantes_atuais?.value?.raw);
            
            // Find executive from section header
            let executive = '';
            const sectionId = row.sectionId;
            if (sectionId) {
              const sectionHeader = rows.find((r: any) => 
                r.type === 'section-header' && r.sectionId === sectionId
              );
              if (sectionHeader?.cells?.team?.value?.raw) {
                executive = String(sectionHeader.cells.team.value.raw);
              }
            }
            
            if (name && diamonds > 0) {
              diamondsRanking.push({ name, value: diamonds, executive });
            }
          }
        });
        
        // Sort by diamonds descending and take top 5
        diamondsRanking.sort((a, b) => b.value - a.value);
        diamondsRanking.splice(5);
      }

      // Convert daily map to sorted array
      const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

      setMonthlyData({
        diamonds: { total: diamondsTotal, entries: diamondsEntries, projection: diamondsProjection },
        creators: { total: creatorsTotal, entries: creatorsEntries, projection: creatorsProjection },
        scheduling: { 
          scheduled: scheduledCount, 
          total: totalSchedules, 
          rate: totalSchedules > 0 ? Math.round((scheduledCount / totalSchedules) * 100) : 0,
          daysWithScheduling: daysWithScheduling.size
        },
        battles: { 
          total: battlesTotal, 
          entries: battlesEntries, 
          average: battlesAverage,
          daysWithBattles: daysWithBattles.size,
          battleRate
        },
        creatorsAnalysis: { total: creatorsAnalysisTotal, lastUpdated: creatorsLastUpdated },
        dailyData,
        rankings: {
          diamonds: diamondsRanking,
          creators: [],
          scheduling: schedulingRanking,
          battles: battlesRanking
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load comparison data for last 6 months
  const loadComparisonData = async () => {
    const months: ComparisonData[] = [];
    
    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(currentMonth, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthStartDate = startOfMonth(monthDate);
      const monthEndDate = endOfMonth(monthDate);
      
      try {
        const [chartsResult, schedulingResult, battlesResult, creatorsAnalysisResult] = await Promise.all([
          supabase.from('dashboard_data').select('data').eq('id', CHART_DATA_ID).maybeSingle(),
          supabase.from('live_schedules').select('*').gte('schedule_date', format(monthStartDate, 'yyyy-MM-dd')).lte('schedule_date', format(monthEndDate, 'yyyy-MM-dd')),
          supabase.from('dashboard_data').select('data').eq('id', BATTLES_DATA_ID).maybeSingle(),
          supabase.from('dashboard_data').select('data').eq('id', CREATORS_DATA_ID).maybeSingle()
        ]);

        // Process charts data
        let diamondsTotal = 0;
        let creatorsTotal = 0;
        if (chartsResult.data?.data) {
          const data = chartsResult.data.data as any;
          (data.entries || []).forEach((entry: any) => {
            if (entry.date?.startsWith(monthKey)) {
              diamondsTotal += entry.diamonds || 0;
              creatorsTotal += entry.creators || 0;
            }
          });
        }

        // Process scheduling
        let scheduled = 0;
        let total = 0;
        if (schedulingResult.data) {
          schedulingResult.data.forEach((s: any) => {
            total++;
            if (s.is_scheduled) scheduled++;
          });
        }
        const schedulingRate = total > 0 ? Math.round((scheduled / total) * 100) : 0;

        // Process battles
        let battlesTotal = 0;
        if (battlesResult.data?.data) {
          const data = battlesResult.data.data as any;
          const battleData = data.battleData || {};
          Object.entries(battleData).forEach(([_, dates]: [string, any]) => {
            Object.entries(dates).forEach(([dateStr, count]: [string, any]) => {
              if (dateStr.startsWith(monthKey)) {
                battlesTotal += Number(count) || 0;
              }
            });
          });
        }

        // Process creators analysis (only for current month)
        let creatorsAnalysisTotal = 0;
        if (i === 0 && creatorsAnalysisResult.data?.data) {
          const data = creatorsAnalysisResult.data.data as any;
          if (data.creatorsData) {
            Object.values(data.creatorsData).forEach((count: any) => {
              creatorsAnalysisTotal += Number(count) || 0;
            });
          }
        }

        months.push({
          month: format(monthDate, 'MMM yyyy', { locale: ptBR }),
          diamonds: diamondsTotal,
          creators: creatorsTotal,
          schedulingRate,
          battles: battlesTotal,
          creatorsAnalysis: creatorsAnalysisTotal
        });
      } catch (error) {
        console.error(`Error loading data for ${monthKey}:`, error);
      }
    }

    // Calculate changes (compare to previous month)
    for (let i = 0; i < months.length - 1; i++) {
      const current = months[i];
      const previous = months[i + 1];
      
      if (previous.diamonds > 0) {
        current.diamondsChange = Math.round(((current.diamonds - previous.diamonds) / previous.diamonds) * 100);
      }
      if (previous.creators > 0) {
        current.creatorsChange = Math.round(((current.creators - previous.creators) / previous.creators) * 100);
      }
      if (previous.schedulingRate > 0) {
        current.schedulingChange = current.schedulingRate - previous.schedulingRate;
      }
      if (previous.battles > 0) {
        current.battlesChange = Math.round(((current.battles - previous.battles) / previous.battles) * 100);
      }
    }

    setComparisonData(months);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`overview-${format(currentMonth, 'MM-yyyy')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportConsolidatedPDF = async () => {
    if (!consolidatedReportRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(consolidatedReportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Check if content fits on one page
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight > pageHeight) {
        // Add multiple pages if needed
        let yPosition = 0;
        while (yPosition < pdfHeight) {
          if (yPosition > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yPosition, pdfWidth, pdfHeight);
          yPosition += pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`relatorio-consolidado-${format(currentMonth, 'MM-yyyy')}.pdf`);
    } catch (error) {
      console.error('Error exporting consolidated PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  const formatCompact = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // Filter data based on period selection
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const filteredDailyData = useMemo(() => {
    if (!monthlyData?.dailyData) return [];
    
    let startDate: string;
    let endDate = todayStr;
    
    switch (periodFilter) {
      case '7d':
        startDate = format(subDays(today, 6), 'yyyy-MM-dd');
        break;
      case '15d':
        startDate = format(subDays(today, 14), 'yyyy-MM-dd');
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          startDate = format(customDateRange.from, 'yyyy-MM-dd');
          endDate = format(customDateRange.to, 'yyyy-MM-dd');
        } else {
          startDate = format(monthStart, 'yyyy-MM-dd');
        }
        break;
      default: // 'all'
        startDate = format(monthStart, 'yyyy-MM-dd');
    }
    
    return monthlyData.dailyData.filter(d => d.date >= startDate && d.date <= endDate);
  }, [monthlyData?.dailyData, periodFilter, customDateRange, todayStr, monthStart]);

  // Recalculate accumulated values for filtered data with projection
  const chartDataWithProjection = useMemo(() => {
    if (!monthlyData?.dailyData) return { actual: [], withProjection: [] };
    
    // Find the last day with actual data
    let lastDataIndex = -1;
    for (let i = filteredDailyData.length - 1; i >= 0; i--) {
      if (filteredDailyData[i].diamonds > 0 || filteredDailyData[i].creators > 0) {
        lastDataIndex = i;
        break;
      }
    }
    
    let diamondsAccum = 0;
    let creatorsAccum = 0;
    const actualData = filteredDailyData.map((d, index) => {
      diamondsAccum += d.diamonds;
      creatorsAccum += d.creators;
      
      // Only show accumulated values up to the last day with data
      const showAccum = index <= lastDataIndex;
      
      return {
        ...d,
        diamondsAccum: showAccum ? diamondsAccum : null as number | null,
        creatorsAccum: showAccum ? creatorsAccum : null as number | null
      };
    });
    
    // Only show projection when filter is 'all' (full month view)
    if (periodFilter !== 'all' || !monthlyData) {
      return { actual: actualData, withProjection: actualData };
    }
    
    // Calculate daily averages based on days with data
    const diamondsDailyAvg = monthlyData.diamonds.entries > 0 
      ? monthlyData.diamonds.total / monthlyData.diamonds.entries 
      : 0;
    const creatorsDailyAvg = monthlyData.creators.entries > 0 
      ? monthlyData.creators.total / monthlyData.creators.entries 
      : 0;
    
    // Get the last day with data
    const lastDataDay = lastDataIndex >= 0 ? parseInt(filteredDailyData[lastDataIndex].day) : 0;
    
    // Get remaining days after last data day
    const remainingDays = monthlyData.dailyData.filter(d => {
      const dayNum = parseInt(d.day);
      return dayNum > lastDataDay;
    });
    
    // Get last accumulated values
    const lastDiamondsAccum = monthlyData.diamonds.total;
    const lastCreatorsAccum = monthlyData.creators.total;
    
    if (remainingDays.length === 0) {
      return { actual: actualData, withProjection: actualData.map(d => ({
        ...d,
        diamondsProjection: null as number | null,
        creatorsProjection: null as number | null
      })) };
    }
    
    let projDiamonds = lastDiamondsAccum;
    let projCreators = lastCreatorsAccum;
    
    const projectionData = remainingDays.map(d => {
      projDiamonds += diamondsDailyAvg;
      projCreators += creatorsDailyAvg;
      return {
        ...d,
        diamondsAccum: null as number | null,
        creatorsAccum: null as number | null,
        diamondsProjection: Math.round(projDiamonds),
        creatorsProjection: Math.round(projCreators)
      };
    });
    
    // Combine actual with projection - add transition point
    const transitionPoint = lastDataIndex >= 0 ? {
      ...filteredDailyData[lastDataIndex],
      diamondsAccum: lastDiamondsAccum,
      creatorsAccum: lastCreatorsAccum,
      diamondsProjection: lastDiamondsAccum,
      creatorsProjection: lastCreatorsAccum
    } : null;
    
    const withProjection = [
      ...actualData.slice(0, lastDataIndex).map(d => ({
        ...d,
        diamondsProjection: null as number | null,
        creatorsProjection: null as number | null
      })),
      ...(transitionPoint ? [transitionPoint] : []),
      ...projectionData
    ];
    
    return { actual: actualData, withProjection };
  }, [filteredDailyData, monthlyData, periodFilter]);

  const chartData = chartDataWithProjection.actual;
  const chartDataFull = chartDataWithProjection.withProjection;

  const metrics: MetricSummary[] = monthlyData ? [
    { 
      label: 'Diamantes', 
      value: formatNumber(monthlyData.diamonds.total), 
      icon: <Gem className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-700',
      projection: `Proj: ${formatCompact(monthlyData.diamonds.projection)}`,
      subtext: `${monthlyData.diamonds.entries} dias com dados`
    },
    { 
      label: 'Criadores Entrada', 
      value: formatNumber(monthlyData.creators.total), 
      icon: <Users className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-700',
      projection: `Proj: ${formatNumber(monthlyData.creators.projection)}`,
      subtext: `${monthlyData.creators.entries} dias com dados`
    },
    { 
      label: 'Taxa Agendamento', 
      value: `${monthlyData.scheduling.rate}%`, 
      icon: <Radio className="h-5 w-5" />,
      color: 'bg-green-100 text-green-700',
      subtext: `${monthlyData.scheduling.daysWithScheduling}/${daysElapsed} dias`
    },
    { 
      label: 'Batalhas', 
      value: formatNumber(monthlyData.battles.total), 
      icon: <Swords className="h-5 w-5" />,
      color: 'bg-red-100 text-red-700',
      projection: `Taxa: ${monthlyData.battles.battleRate}%`,
      subtext: `Média: ${monthlyData.battles.average}/dia | ${monthlyData.battles.daysWithBattles} dias`
    },
    { 
      label: 'Criadores Análise', 
      value: formatNumber(monthlyData.creatorsAnalysis.total), 
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-700',
      subtext: monthlyData.creatorsAnalysis.lastUpdated 
        ? `Atualizado: ${format(new Date(monthlyData.creatorsAnalysis.lastUpdated), 'dd/MM HH:mm')}`
        : 'Hoje'
    }
  ] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={curliLogo} alt="Curli" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-foreground">Overview Geral</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[140px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={() => setShowComparison(!showComparison)} className="gap-2">
              <GitCompare className="h-4 w-4" />
              Comparativo
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button disabled={exporting} className="gap-2">
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exportando...' : 'Exportar PDF'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleExportPDF}>
                    <FileText className="h-4 w-4" />
                    PDF Simples
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleExportConsolidatedPDF}>
                    <Download className="h-4 w-4" />
                    Relatório Consolidado
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {metrics.map((metric, index) => (
            <Card key={index} className="border-border">
              <CardContent className="p-4">
                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${metric.color} mb-2`}>
                  {metric.icon}
                  <span className="text-xs font-medium">{metric.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                {metric.projection && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {metric.projection}
                  </p>
                )}
                {metric.subtext && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {metric.subtext}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Evolution Charts */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução Mensal
          </h2>
          
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex bg-muted rounded-lg p-1">
              <Button 
                variant={periodFilter === 'all' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setPeriodFilter('all')}
              >
                Mês
              </Button>
              <Button 
                variant={periodFilter === '15d' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setPeriodFilter('15d')}
              >
                15 dias
              </Button>
              <Button 
                variant={periodFilter === '7d' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setPeriodFilter('7d')}
              >
                7 dias
              </Button>
            </div>
            
            {/* Custom Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={periodFilter === 'custom' ? 'default' : 'outline'} 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                >
                  <Calendar className="h-3 w-3" />
                  {periodFilter === 'custom' && customDateRange.from && customDateRange.to
                    ? `${format(customDateRange.from, 'dd/MM')} - ${format(customDateRange.to, 'dd/MM')}`
                    : 'Personalizado'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="end">
                <CalendarComponent
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => {
                    setCustomDateRange({ from: range?.from, to: range?.to });
                    if (range?.from && range?.to) {
                      setPeriodFilter('custom');
                    }
                  }}
                  numberOfMonths={1}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Diamonds Evolution Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gem className="h-4 w-4 text-purple-600" />
                Diamantes Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartDataFull}>
                  <defs>
                    <linearGradient id="diamondsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="diamondsProjectionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" tickFormatter={formatCompact} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatNumber(value), 
                      name === 'diamondsProjection' ? 'Projeção' : 'Diamantes'
                    ]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="diamondsAccum" 
                    stroke="#9333ea" 
                    fill="url(#diamondsGradient)"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="diamondsProjection" 
                    stroke="#9333ea" 
                    strokeDasharray="5 5"
                    fill="url(#diamondsProjectionGradient)"
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Creators Evolution Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Criadores Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartDataFull}>
                  <defs>
                    <linearGradient id="creatorsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="creatorsProjectionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatNumber(value), 
                      name === 'creatorsProjection' ? 'Projeção' : 'Criadores'
                    ]}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="creatorsAccum" 
                    stroke="#2563eb" 
                    fill="url(#creatorsGradient)"
                    strokeWidth={2}
                    connectNulls={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="creatorsProjection" 
                    stroke="#2563eb" 
                    strokeDasharray="5 5"
                    fill="url(#creatorsProjectionGradient)"
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Metrics Combined Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="h-4 w-4 text-green-600" />
                Taxa de Agendamento Diária (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Taxa']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="scheduling" 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Battles Daily Chart */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-600" />
                Batalhas por Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={monthlyData?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value: number) => [formatNumber(value), 'Batalhas']}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Bar dataKey="battles" fill="#dc2626" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Projections Section */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Projeções do Mês
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-muted-foreground">Projeção Diamantes</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {formatNumber(monthlyData?.diamonds.projection || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {monthlyData?.diamonds.entries || 0} dias com dados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-muted-foreground">Projeção Criadores</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatNumber(monthlyData?.creators.projection || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {monthlyData?.creators.entries || 0} dias com dados
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-muted-foreground">Média Batalhas/Dia</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {monthlyData?.battles.average || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatNumber(monthlyData?.battles.total || 0)} batalhas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rankings Section */}
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Rankings do Mês
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Diamonds Ranking */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gem className="h-4 w-4 text-purple-600" />
                Top Diamantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData?.rankings.diamonds.length ? (
                <div className="space-y-2">
                  {monthlyData.rankings.diamonds.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground text-sm">{item.name}</span>
                      </div>
                      <span className="font-bold text-purple-600 text-sm">{formatCompact(item.value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Scheduling Ranking */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-green-600" />
                Top Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData?.rankings.scheduling.length ? (
                <div className="space-y-2">
                  {monthlyData.rankings.scheduling.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground text-sm">{item.name}</span>
                      </div>
                      <span className="font-bold text-green-600">{item.value}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>

          {/* Battles Ranking */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="h-4 w-4 text-red-600" />
                Top Batalhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData?.rankings.battles.length ? (
                <div className="space-y-2">
                  {monthlyData.rankings.battles.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-foreground text-sm">{item.name}</span>
                      </div>
                      <span className="font-bold text-red-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Month Comparison Table */}
        {showComparison && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-primary" />
              Comparativo Mensal (Últimos 6 Meses)
            </h2>
            <Card className="border-border overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">Mês</TableHead>
                      <TableHead className="text-center font-bold">Diamantes</TableHead>
                      <TableHead className="text-center font-bold">Criadores</TableHead>
                      <TableHead className="text-center font-bold">Taxa Agend.</TableHead>
                      <TableHead className="text-center font-bold">Batalhas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.map((data, index) => (
                      <TableRow key={data.month} className={index === 0 ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium capitalize">{data.month}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold">{formatCompact(data.diamonds)}</span>
                            {data.diamondsChange !== undefined && (
                              <span className={`text-xs ${data.diamondsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.diamondsChange >= 0 ? '+' : ''}{data.diamondsChange}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold">{formatNumber(data.creators)}</span>
                            {data.creatorsChange !== undefined && (
                              <span className={`text-xs ${data.creatorsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.creatorsChange >= 0 ? '+' : ''}{data.creatorsChange}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold">{data.schedulingRate}%</span>
                            {data.schedulingChange !== undefined && (
                              <span className={`text-xs ${data.schedulingChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.schedulingChange >= 0 ? '+' : ''}{data.schedulingChange}pp
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold">{formatNumber(data.battles)}</span>
                            {data.battlesChange !== undefined && (
                              <span className={`text-xs ${data.battlesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data.battlesChange >= 0 ? '+' : ''}{data.battlesChange}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Links */}
        <h2 className="text-lg font-bold text-foreground mb-4">Acessar Dashboards</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Link to="/painel">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="font-medium text-sm">Performance</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/graficos">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Gem className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="font-medium text-sm">Gráficos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/agendamentos">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Radio className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="font-medium text-sm">Agendamentos</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/batalhas">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Swords className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="font-medium text-sm">Batalhas</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/criadores-analise">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="font-medium text-sm">Criadores</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/anotacoes">
            <Card className="border-border hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="font-medium text-sm">Anotações</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Hidden Report for PDF */}
        <div className="fixed -left-[9999px] top-0">
          <div ref={reportRef} className="bg-white p-8 w-[800px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* PDF Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
              <img src={curliLogo} alt="Curli" className="h-10 w-auto" />
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900">OVERVIEW MENSAL</h1>
                <p className="text-sm text-gray-600 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {metrics.map((metric, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-lg font-bold text-gray-900">{metric.value}</p>
                  {metric.projection && (
                    <p className="text-xs text-gray-500">{metric.projection}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Projections */}
            <h2 className="text-base font-bold text-gray-900 mb-3">Projeções</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-700 mb-1">Projeção Diamantes</p>
                <p className="text-xl font-bold text-purple-900">{formatNumber(monthlyData?.diamonds.projection || 0)}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700 mb-1">Projeção Criadores</p>
                <p className="text-xl font-bold text-blue-900">{formatNumber(monthlyData?.creators.projection || 0)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-700 mb-1">Média Batalhas/Dia</p>
                <p className="text-xl font-bold text-red-900">{monthlyData?.battles.average || 0}</p>
              </div>
            </div>

            {/* Rankings */}
            <h2 className="text-base font-bold text-gray-900 mb-3">Rankings do Mês</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Scheduling Ranking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Top Agendamento</h3>
                {monthlyData?.rankings.scheduling.map((item, index) => (
                  <div key={item.name} className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
                    <span className="text-sm">
                      <span className="font-bold mr-2">{index + 1}.</span>
                      {item.name}
                    </span>
                    <span className="font-bold text-green-700">{item.value}%</span>
                  </div>
                ))}
              </div>

              {/* Battles Ranking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">Top Batalhas</h3>
                {monthlyData?.rankings.battles.map((item, index) => (
                  <div key={item.name} className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
                    <span className="text-sm">
                      <span className="font-bold mr-2">{index + 1}.</span>
                      {item.name}
                    </span>
                    <span className="font-bold text-red-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
              Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>

          {/* Consolidated PDF Report */}
          <div ref={consolidatedReportRef} className="bg-white p-8 w-[800px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* PDF Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-red-600">
              <img src={curliLogo} alt="Curli" className="h-12 w-auto" />
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-900">RELATÓRIO CONSOLIDADO</h1>
                <p className="text-sm text-gray-600 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
                <p className="text-xs text-gray-500">Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Summary Section */}
            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                📊 Resumo do Mês
              </h2>
              <div className="grid grid-cols-5 gap-3">
                {metrics.map((metric, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 text-center shadow-sm">
                    <p className="text-xs text-gray-600 mb-1 font-medium">{metric.label}</p>
                    <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                    {metric.projection && (
                      <p className="text-xs text-blue-600 mt-1">{metric.projection}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Projections */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                🎯 Projeções
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-xs text-purple-700 mb-1 font-medium">Projeção Diamantes</p>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(monthlyData?.diamonds.projection || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Baseado em {monthlyData?.diamonds.entries || 0} dias</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-700 mb-1 font-medium">Projeção Criadores</p>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(monthlyData?.creators.projection || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Baseado em {monthlyData?.creators.entries || 0} dias</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs text-red-700 mb-1 font-medium">Média Batalhas/Dia</p>
                  <p className="text-2xl font-bold text-red-900">{monthlyData?.battles.average || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total: {formatNumber(monthlyData?.battles.total || 0)}</p>
                </div>
              </div>
            </div>

            {/* Month Comparison */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                📈 Comparativo Mensal
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2 font-bold text-gray-700">Mês</th>
                      <th className="text-center p-2 font-bold text-gray-700">Diamantes</th>
                      <th className="text-center p-2 font-bold text-gray-700">Criadores</th>
                      <th className="text-center p-2 font-bold text-gray-700">Agendamento</th>
                      <th className="text-center p-2 font-bold text-gray-700">Batalhas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.slice(0, 4).map((data, index) => (
                      <tr key={data.month} className={index === 0 ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-2 font-medium capitalize">{data.month}</td>
                        <td className="p-2 text-center">
                          <span className="font-bold">{formatCompact(data.diamonds)}</span>
                          {data.diamondsChange !== undefined && (
                            <span className={`ml-1 text-xs ${data.diamondsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({data.diamondsChange >= 0 ? '+' : ''}{data.diamondsChange}%)
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-bold">{formatNumber(data.creators)}</span>
                          {data.creatorsChange !== undefined && (
                            <span className={`ml-1 text-xs ${data.creatorsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({data.creatorsChange >= 0 ? '+' : ''}{data.creatorsChange}%)
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-bold">{data.schedulingRate}%</span>
                          {data.schedulingChange !== undefined && (
                            <span className={`ml-1 text-xs ${data.schedulingChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({data.schedulingChange >= 0 ? '+' : ''}{data.schedulingChange}pp)
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="font-bold">{formatNumber(data.battles)}</span>
                          {data.battlesChange !== undefined && (
                            <span className={`ml-1 text-xs ${data.battlesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({data.battlesChange >= 0 ? '+' : ''}{data.battlesChange}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rankings */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                🏆 Rankings do Mês
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {/* Diamonds Ranking */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <h3 className="font-bold text-purple-800 mb-2 text-sm flex items-center gap-1">
                    💎 Top Diamantes
                  </h3>
                  {monthlyData?.rankings.diamonds.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="flex justify-between py-1 text-xs border-b border-purple-200 last:border-0">
                      <span className="truncate">
                        <span className="font-bold mr-1">{index + 1}.</span>
                        {item.name}
                      </span>
                      <span className="font-bold text-purple-700 ml-1">{formatCompact(item.value)}</span>
                    </div>
                  ))}
                </div>

                {/* Scheduling Ranking */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h3 className="font-bold text-green-800 mb-2 text-sm flex items-center gap-1">
                    📅 Top Agendamento
                  </h3>
                  {monthlyData?.rankings.scheduling.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="flex justify-between py-1 text-xs border-b border-green-200 last:border-0">
                      <span className="truncate">
                        <span className="font-bold mr-1">{index + 1}.</span>
                        {item.name}
                      </span>
                      <span className="font-bold text-green-700 ml-1">{item.value}%</span>
                    </div>
                  ))}
                </div>

                {/* Battles Ranking */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h3 className="font-bold text-red-800 mb-2 text-sm flex items-center gap-1">
                    ⚔️ Top Batalhas
                  </h3>
                  {monthlyData?.rankings.battles.slice(0, 5).map((item, index) => (
                    <div key={item.name} className="flex justify-between py-1 text-xs border-b border-red-200 last:border-0">
                      <span className="truncate">
                        <span className="font-bold mr-1">{index + 1}.</span>
                        {item.name}
                      </span>
                      <span className="font-bold text-red-700 ml-1">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scheduling Details */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                📋 Detalhes de Agendamento
              </h2>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Agendados</p>
                  <p className="text-lg font-bold text-green-700">{formatNumber(monthlyData?.scheduling.scheduled || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Registros</p>
                  <p className="text-lg font-bold text-gray-900">{formatNumber(monthlyData?.scheduling.total || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Taxa Geral</p>
                  <p className="text-lg font-bold text-blue-700">{monthlyData?.scheduling.rate || 0}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Dias com Agend.</p>
                  <p className="text-lg font-bold text-purple-700">{monthlyData?.scheduling.daysWithScheduling || 0}</p>
                </div>
              </div>
            </div>

            {/* Battles Details */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                ⚔️ Detalhes de Batalhas
              </h2>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Batalhas</p>
                  <p className="text-lg font-bold text-red-700">{formatNumber(monthlyData?.battles.total || 0)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Média/Dia</p>
                  <p className="text-lg font-bold text-gray-900">{monthlyData?.battles.average || 0}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Taxa de Batalha</p>
                  <p className="text-lg font-bold text-blue-700">{monthlyData?.battles.battleRate || 0}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Dias com Batalhas</p>
                  <p className="text-lg font-bold text-purple-700">{monthlyData?.battles.daysWithBattles || 0}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t-2 border-red-600 text-center">
              <p className="text-xs text-gray-500">
                Curli Agência - Relatório Consolidado Mensal
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Este relatório foi gerado automaticamente pelo sistema de gestão.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OverviewDashboard;
