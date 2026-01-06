import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Swords, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Home, 
  FileText, 
  Plus, 
  Trash2, 
  AlertTriangle,
  Loader2,
  Settings2,
  Eye,
  EyeOff,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BrandLogo } from '@/components/BrandLogo';
import { branding, getReportFooter } from '@/config/branding';
import { BattlesMetricsReport } from '@/components/BattlesMetricsReport';

interface BattleData {
  [memberName: string]: {
    [date: string]: number;
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

interface ReportConfig {
  startDate: string;
  endDate: string;
  selectedMembers: string[];
  metrics: {
    totalBattles: boolean;
    dailyBreakdown: boolean;
    memberTotals: boolean;
    impactAnalysis: boolean;
    topPerformers: boolean;
    lowPerformers: boolean;
  };
}

// Battle Categories
type BattleCategory = 'curliChallenge' | 'rise' | 'oficial';

interface BattleCategoryData {
  [memberName: string]: {
    curliChallenge: number;
    rise: number;
    oficial: number;
  };
}

const CATEGORY_CONFIG: { key: BattleCategory; label: string; color: string; bgColor: string; textColor: string }[] = [
  { key: 'curliChallenge', label: 'Challenge', color: '#dc2626', bgColor: 'bg-red-500', textColor: 'text-white' },
  { key: 'rise', label: 'Rise', color: '#ffffff', bgColor: 'bg-white border border-gray-300', textColor: 'text-black' },
  { key: 'oficial', label: 'OFICIAL', color: '#2563eb', bgColor: 'bg-blue-500', textColor: 'text-white' },
];

const BATTLES_DATA_ID = '00000000-0000-0000-0000-000000000005'; // Changed from 003 to avoid conflict with TEAM_STRUCTURE_ID
const CHART_DATA_ID = '00000000-0000-0000-0000-000000000002';

const DEFAULT_TEAM_STRUCTURE: TeamStructure[] = [
  {
    executive: 'LUCAS ZAMPOLI (DIRETOR EXECUTIVO)',
    members: ['BIANCA FOSCHINI', 'IAGO PATRICIO', 'BKARO', 'GABRIELLE SOUSA'],
  },
  {
    executive: 'LUCAS BECCARO (EXECUTIVO DE PARCERIAS)',
    members: ['MATHEUS ARAUJO'],
  },
  {
    executive: 'IAGO ANDRADE (EXECUTIVO DE PARCERIAS)',
    members: ['CAIO PEDRO', 'LORRANY COSTA', 'STELLA RODRIGUES'],
  },
  {
    executive: 'GABRIELLE SOUSA (EXECUTIVA DE PARCERIAS)',
    members: ['MARCO'],
  },
  {
    executive: 'DANILO GARCIA (EXECUTIVO INTERNO)',
    members: ['LETICIA', 'BARBARA', 'GIOVANA'],
  },
];

const BattlesDashboard = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [battleData, setBattleData] = useState<BattleData>({});
  const [categoryData, setCategoryData] = useState<BattleCategoryData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamStructure, setTeamStructure] = useState<TeamStructure[]>(DEFAULT_TEAM_STRUCTURE);
  const [newExecutiveName, setNewExecutiveName] = useState('');
  const [newAssociateName, setNewAssociateName] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [showExecutiveDialog, setShowExecutiveDialog] = useState(false);
  const [showAssociateDialog, setShowAssociateDialog] = useState(false);
  const [editingCell, setEditingCell] = useState<{ member: string; date: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [diamondEntries, setDiamondEntries] = useState<DiamondEntry[]>([]);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [hidePastDays, setHidePastDays] = useState(false);
  const [showMetricsReport, setShowMetricsReport] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState(false);
  const [selectedCalendarDays, setSelectedCalendarDays] = useState<Date[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>(() => {
    const now = new Date();
    return {
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd'),
      selectedMembers: [],
      metrics: {
        totalBattles: true,
        dailyBreakdown: true,
        memberTotals: true,
        impactAnalysis: true,
        topPerformers: true,
        lowPerformers: false,
      },
    };
  });
  
  const reportRef = useRef<HTMLDivElement>(null);
  const customReportRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStart = startOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
  
  // Filter days to show based on view mode
  const displayDays = useMemo(() => {
    // If calendar view mode is active and days are selected, use those
    if (calendarViewMode && selectedCalendarDays.length > 0) {
      return selectedCalendarDays
        .filter(day => {
          const dayMonth = format(day, 'yyyy-MM');
          const currentMonthStr = format(currentMonth, 'yyyy-MM');
          return dayMonth === currentMonthStr;
        })
        .sort((a, b) => a.getTime() - b.getTime());
    }
    
    // Otherwise use normal filtering
    if (!hidePastDays) return days;
    const today = format(new Date(), 'yyyy-MM-dd');
    return days.filter(day => format(day, 'yyyy-MM-dd') >= today);
  }, [days, hidePastDays, calendarViewMode, selectedCalendarDays, currentMonth]);

  // Handle calendar day selection toggle
  const handleCalendarDayToggle = (day: Date | undefined) => {
    if (!day) return;
    
    setSelectedCalendarDays(prev => {
      const exists = prev.some(d => isSameDay(d, day));
      if (exists) {
        return prev.filter(d => !isSameDay(d, day));
      } else {
        return [...prev, day];
      }
    });
  };

  // Clear all selected days
  const clearSelectedDays = () => {
    setSelectedCalendarDays([]);
  };

  // Select all days in month
  const selectAllDaysInMonth = () => {
    setSelectedCalendarDays(days);
  };

  // Get all members
  const allMembers = useMemo(() => {
    return teamStructure.flatMap(exec => exec.members);
  }, [teamStructure]);

  // Initialize selected members when team structure changes
  useEffect(() => {
    if (reportConfig.selectedMembers.length === 0 && allMembers.length > 0) {
      setReportConfig(prev => ({ ...prev, selectedMembers: [...allMembers] }));
    }
  }, [allMembers, reportConfig.selectedMembers.length]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [battlesResult, chartResult] = await Promise.all([
          supabase.from('dashboard_data').select('*').eq('id', BATTLES_DATA_ID).maybeSingle(),
          supabase.from('dashboard_data').select('*').eq('id', CHART_DATA_ID).maybeSingle(),
        ]);

        if (battlesResult.error) throw battlesResult.error;
        if (chartResult.error) throw chartResult.error;

        if (battlesResult.data?.data) {
          const parsed = battlesResult.data.data as { battleData?: BattleData; teamStructure?: TeamStructure[]; categoryData?: BattleCategoryData };
          if (parsed.battleData) setBattleData(parsed.battleData);
          if (parsed.teamStructure) setTeamStructure(parsed.teamStructure);
          if (parsed.categoryData) setCategoryData(parsed.categoryData);
        }

        if (chartResult.data?.data) {
          const parsed = chartResult.data.data as { entries?: DiamondEntry[] };
          if (parsed.entries) setDiamondEntries(parsed.entries);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Save data
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: BATTLES_DATA_ID,
        data: { battleData, teamStructure, categoryData } as unknown as import('@/integrations/supabase/types').Json,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('dashboard_data').upsert(payload);
      if (error) throw error;
      toast({ title: 'Salvo!', description: 'Dados salvos com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar dados', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Get battle count for a member on a specific date
  const getBattleCount = (member: string, date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return battleData[member]?.[dateStr] || 0;
  };

  // Set battle count
  const setBattleCount = (member: string, date: Date, count: number) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setBattleData(prev => ({
      ...prev,
      [member]: { ...(prev[member] || {}), [dateStr]: count },
    }));
  };

  // Calculate member total for the month
  const getMemberTotal = (member: string): number => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    if (!battleData[member]) return 0;
    return Object.entries(battleData[member])
      .filter(([date]) => date.startsWith(monthStr))
      .reduce((sum, [, count]) => sum + count, 0);
  };

  // Calculate member total for date range
  const getMemberTotalForRange = (member: string, startDate: string, endDate: string): number => {
    if (!battleData[member]) return 0;
    return Object.entries(battleData[member])
      .filter(([date]) => date >= startDate && date <= endDate)
      .reduce((sum, [, count]) => sum + count, 0);
  };

  // Calculate executive total
  const getExecutiveTotal = (members: string[]): number => {
    return members.reduce((sum, member) => sum + getMemberTotal(member), 0);
  };

  // Calculate grand total
  const getGrandTotal = (): number => {
    return teamStructure.reduce((sum, exec) => sum + getExecutiveTotal(exec.members), 0);
  };

  // Impact Analysis
  const impactAnalysis = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM');
    const currentMonthDiamonds = diamondEntries.filter(e => e.date.startsWith(monthStr));
    
    if (currentMonthDiamonds.length === 0) {
      return { hasData: false, correlationData: [], problematicDays: [], daysWithLowBattles: 0, avgDiamondsHighBattles: 0, avgDiamondsLowBattles: 0, differencePercent: 0 };
    }

    const sortedDiamonds = [...currentMonthDiamonds].sort((a, b) => a.date.localeCompare(b.date));
    
    const dailyBattleTotals: { [date: string]: number } = {};
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let total = 0;
      teamStructure.forEach(exec => {
        exec.members.forEach(member => {
          total += battleData[member]?.[dateStr] || 0;
        });
      });
      dailyBattleTotals[dateStr] = total;
    });

    const correlationData = sortedDiamonds.map((entry, idx) => {
      const prevEntry = sortedDiamonds[idx - 1];
      const diamondChange = prevEntry ? entry.diamonds - prevEntry.diamonds : 0;
      const battles = dailyBattleTotals[entry.date] || 0;
      
      return {
        date: entry.date,
        dateLabel: format(new Date(entry.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
        diamonds: entry.diamonds,
        diamondChange,
        battles,
        impact: battles < 10 && diamondChange < 0 ? 'negative' : 
                battles >= 20 && diamondChange > 0 ? 'positive' : 'neutral',
      };
    });

    const problematicDays = correlationData.filter(d => d.battles < 10 && d.diamondChange < 0);
    const daysWithLowBattles = correlationData.filter(d => d.battles < 10).length;

    const highBattleDays = correlationData.filter(d => d.battles >= 20);
    const lowBattleDays = correlationData.filter(d => d.battles < 10);
    
    const avgDiamondsHighBattles = highBattleDays.length > 0
      ? highBattleDays.reduce((sum, d) => sum + d.diamonds, 0) / highBattleDays.length
      : 0;
    const avgDiamondsLowBattles = lowBattleDays.length > 0
      ? lowBattleDays.reduce((sum, d) => sum + d.diamonds, 0) / lowBattleDays.length
      : 0;

    const differencePercent = avgDiamondsLowBattles > 0 
      ? ((avgDiamondsHighBattles - avgDiamondsLowBattles) / avgDiamondsLowBattles) * 100 
      : 0;

    return { hasData: true, correlationData, problematicDays, daysWithLowBattles, avgDiamondsHighBattles, avgDiamondsLowBattles, differencePercent };
  }, [battleData, diamondEntries, currentMonth, days, teamStructure]);

  // Metrics
  const metrics = useMemo(() => {
    const totalBattles = getGrandTotal();
    const totalMembers = teamStructure.reduce((sum, exec) => sum + exec.members.length, 0);
    const avgPerMember = totalMembers > 0 ? totalBattles / totalMembers : 0;
    
    const memberTotals = teamStructure.flatMap(exec => 
      exec.members.map(member => ({ name: member, total: getMemberTotal(member) }))
    ).sort((a, b) => b.total - a.total);

    return {
      totalBattles,
      avgPerMember,
      topPerformers: memberTotals.slice(0, 5),
      lowPerformers: memberTotals.filter(m => m.total < 10),
    };
  }, [battleData, teamStructure, currentMonth]);

  // Category calculations
  const categoryTotals = useMemo(() => {
    // Get totals per member
    const getMemberCategoryTotal = (member: string, category: BattleCategory) => {
      return categoryData[member]?.[category] || 0;
    };

    // Get totals per executive
    const getExecutiveCategoryTotals = (members: string[]) => {
      return CATEGORY_CONFIG.reduce((acc, cat) => {
        acc[cat.key] = members.reduce((sum, member) => sum + getMemberCategoryTotal(member, cat.key), 0);
        return acc;
      }, {} as Record<BattleCategory, number>);
    };

    // Grand totals
    const grandTotals = CATEGORY_CONFIG.reduce((acc, cat) => {
      acc[cat.key] = teamStructure.flatMap(e => e.members).reduce((sum, member) => sum + getMemberCategoryTotal(member, cat.key), 0);
      return acc;
    }, {} as Record<BattleCategory, number>);

    return { getMemberCategoryTotal, getExecutiveCategoryTotals, grandTotals };
  }, [categoryData, teamStructure]);

  // Update category value for a member
  const updateMemberCategory = (member: string, category: BattleCategory, value: number) => {
    setCategoryData(prev => ({
      ...prev,
      [member]: {
        ...(prev[member] || { curliChallenge: 0, rise: 0, oficial: 0 }),
        [category]: Math.max(0, value),
      },
    }));
  };

  // Get member total battles from calendar
  const getMemberBattleTotal = (member: string) => {
    return getMemberTotal(member);
  };

  // Get sum of all categories for a member
  const getMemberCategorySum = (member: string) => {
    const data = categoryData[member];
    if (!data) return 0;
    return data.curliChallenge + data.rise + data.oficial;
  };

  // Add executive
  const handleAddExecutive = () => {
    if (!newExecutiveName.trim()) return;
    setTeamStructure(prev => [...prev, { executive: newExecutiveName.trim(), members: [] }]);
    setNewExecutiveName('');
    setShowExecutiveDialog(false);
  };

  // Add associate
  const handleAddAssociate = () => {
    if (!newAssociateName.trim() || !selectedExecutive) return;
    setTeamStructure(prev => prev.map(exec => 
      exec.executive === selectedExecutive 
        ? { ...exec, members: [...exec.members, newAssociateName.trim()] }
        : exec
    ));
    setNewAssociateName('');
    setShowAssociateDialog(false);
  };

  // Remove associate
  const handleRemoveAssociate = (executive: string, member: string) => {
    setTeamStructure(prev => prev.map(exec =>
      exec.executive === executive
        ? { ...exec, members: exec.members.filter(m => m !== member) }
        : exec
    ));
  };

  // Remove executive
  const handleRemoveExecutive = (executive: string) => {
    setTeamStructure(prev => prev.filter(exec => exec.executive !== executive));
  };

  // Cell editing
  const handleCellClick = (member: string, date: string) => {
    setEditingCell({ member, date });
    const dateObj = new Date(date + 'T12:00:00');
    setEditValue(String(getBattleCount(member, dateObj)));
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const count = parseInt(editValue) || 0;
      const dateObj = new Date(editingCell.date + 'T12:00:00');
      setBattleCount(editingCell.member, dateObj, Math.max(0, count));
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCellBlur();
    else if (e.key === 'Escape') { setEditingCell(null); setEditValue(''); }
  };

  // Toggle member selection
  const toggleMemberSelection = (member: string) => {
    setReportConfig(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(member)
        ? prev.selectedMembers.filter(m => m !== member)
        : [...prev.selectedMembers, member],
    }));
  };

  // Select all members
  const selectAllMembers = () => {
    setReportConfig(prev => ({ ...prev, selectedMembers: [...allMembers] }));
  };

  // Deselect all members
  const deselectAllMembers = () => {
    setReportConfig(prev => ({ ...prev, selectedMembers: [] }));
  };

  // Toggle metric
  const toggleMetric = (metric: keyof ReportConfig['metrics']) => {
    setReportConfig(prev => ({
      ...prev,
      metrics: { ...prev.metrics, [metric]: !prev.metrics[metric] },
    }));
  };

  // Export Custom PDF
  const handleExportCustomPDF = async () => {
    if (!customReportRef.current) return;
    setIsExportingPDF(true);
    try {
      toast({ title: 'Gerando relatório...', description: 'Aguarde' });
      
      // Calculate if landscape is needed based on number of days
      const numDays = reportData.dailyTotals.length;
      const isLandscape = numDays > 10;
      
      const canvas = await html2canvas(customReportRef.current, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ 
        orientation: isLandscape ? 'landscape' : 'portrait', 
        unit: 'mm', 
        format: 'a4' 
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 10) / imgWidth, (pdfHeight - 10) / imgHeight);
      
      const x = (pdfWidth - imgWidth * ratio) / 2;
      const totalHeight = imgHeight * ratio;
      
      if (totalHeight <= pdfHeight - 10) {
        pdf.addImage(imgData, 'PNG', x, 5, imgWidth * ratio, imgHeight * ratio);
      } else {
        const pageContentHeight = pdfHeight - 10;
        let remainingHeight = totalHeight;
        let sourceY = 0;
        let page = 0;
        
        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage();
          
          const sliceHeight = Math.min(pageContentHeight, remainingHeight);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = (sliceHeight / ratio);
          
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY / ratio, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            const sliceImg = sliceCanvas.toDataURL('image/png');
            pdf.addImage(sliceImg, 'PNG', x, 5, imgWidth * ratio, sliceHeight);
          }
          
          sourceY += sliceHeight;
          remainingHeight -= sliceHeight;
          page++;
        }
      }
      
      pdf.save(`relatorio-batalhas-${reportConfig.startDate}-${reportConfig.endDate}.pdf`);
      toast({ title: 'Relatório exportado!' });
      setShowReportDialog(false);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Get executive name for a member
  const getExecutiveForMember = (memberName: string): string => {
    const exec = teamStructure.find(e => e.members.includes(memberName));
    return exec ? exec.executive.split('(')[0].trim() : '-';
  };

  // Get report data based on config - grouped by executive
  const reportData = useMemo(() => {
    const { startDate, endDate, selectedMembers } = reportConfig;
    
    let reportDays: Date[] = [];
    try {
      reportDays = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });
    } catch {
      reportDays = [];
    }

    // Group selected members by executive
    const groupedByExecutive = teamStructure
      .map(exec => ({
        executive: exec.executive,
        members: exec.members.filter(m => selectedMembers.includes(m)).map(member => {
          const dailyData = reportDays.map(day => ({
            date: format(day, 'yyyy-MM-dd'),
            dateLabel: format(day, 'dd/MM'),
            count: battleData[member]?.[format(day, 'yyyy-MM-dd')] || 0,
          }));
          const total = getMemberTotalForRange(member, startDate, endDate);
          return { name: member, dailyData, total };
        })
      }))
      .filter(exec => exec.members.length > 0);

    const memberData = selectedMembers.map(member => {
      const dailyData = reportDays.map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        dateLabel: format(day, 'dd/MM'),
        count: battleData[member]?.[format(day, 'yyyy-MM-dd')] || 0,
      }));
      const total = getMemberTotalForRange(member, startDate, endDate);
      const executive = getExecutiveForMember(member);
      
      return { name: member, executive, dailyData, total };
    }).sort((a, b) => b.total - a.total);

    const grandTotal = memberData.reduce((sum, m) => sum + m.total, 0);
    const avgPerMember = memberData.length > 0 ? grandTotal / memberData.length : 0;
    const topPerformers = memberData.slice(0, 5);
    const lowPerformers = memberData.filter(m => m.total < 10);

    // Daily totals and averages
    const dailyTotals = reportDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const total = selectedMembers.reduce((sum, member) => sum + (battleData[member]?.[dateStr] || 0), 0);
      return { 
        date: dateStr, 
        dateLabel: format(day, 'dd/MM'),
        total 
      };
    });

    // Average battles per day
    const avgBattlesPerDay = dailyTotals.length > 0 
      ? dailyTotals.reduce((sum, d) => sum + d.total, 0) / dailyTotals.length 
      : 0;

    return { memberData, groupedByExecutive, grandTotal, avgPerMember, topPerformers, lowPerformers, dailyTotals, reportDays, avgBattlesPerDay };
  }, [reportConfig, battleData, teamStructure]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
            <Swords className="h-6 w-6 text-red-500" />
            <h1 className="text-xl font-bold">Painel de Batalhas</h1>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Navigation */}
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1 bg-background">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar View Mode */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={calendarViewMode ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  {calendarViewMode ? `${selectedCalendarDays.length} dias` : 'Calendário'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-medium">Selecionar Dias</span>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        id="calendarViewMode"
                        checked={calendarViewMode}
                        onCheckedChange={(checked) => {
                          setCalendarViewMode(!!checked);
                          if (!checked) setSelectedCalendarDays([]);
                        }}
                      />
                      <Label htmlFor="calendarViewMode" className="text-xs cursor-pointer">Ativar</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllDaysInMonth}>
                      Todos
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={clearSelectedDays}>
                      Limpar
                    </Button>
                  </div>
                </div>
                <Calendar
                  mode="multiple"
                  selected={selectedCalendarDays}
                  onSelect={(days) => setSelectedCalendarDays(days || [])}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={ptBR}
                  className="pointer-events-auto"
                  modifiers={{
                    hasBattles: (day) => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      let total = 0;
                      teamStructure.forEach(exec => exec.members.forEach(m => { total += battleData[m]?.[dateStr] || 0; }));
                      return total > 0;
                    }
                  }}
                  modifiersStyles={{
                    hasBattles: { backgroundColor: 'hsl(var(--primary) / 0.2)' }
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* Hide Past Days Toggle */}
            <Button 
              variant={hidePastDays ? "default" : "outline"} 
              size="sm" 
              onClick={() => setHidePastDays(!hidePastDays)}
              className="gap-2"
              disabled={calendarViewMode}
            >
              {hidePastDays ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {hidePastDays ? 'Mostrar Todos' : 'Ocultar Passados'}
            </Button>

            <Button 
              variant={showMetricsReport ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowMetricsReport(!showMetricsReport)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              {showMetricsReport ? 'Ocultar Métricas' : 'Ver Métricas'}
            </Button>

            <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configurar Relatório Personalizado</DialogTitle>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  {/* Period Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Período
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Data Início</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={reportConfig.startDate}
                          onChange={(e) => setReportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">Data Fim</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={reportConfig.endDate}
                          onChange={(e) => setReportConfig(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Metrics Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Métricas
                    </h3>
                    <div className="space-y-2">
                      {[
                        { key: 'totalBattles', label: 'Total de Batalhas' },
                        { key: 'dailyBreakdown', label: 'Detalhamento Diário' },
                        { key: 'memberTotals', label: 'Totais por Membro' },
                        { key: 'impactAnalysis', label: 'Análise de Impacto' },
                        { key: 'topPerformers', label: 'Top Performers' },
                        { key: 'lowPerformers', label: 'Baixo Desempenho' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox
                            id={key}
                            checked={reportConfig.metrics[key as keyof ReportConfig['metrics']]}
                            onCheckedChange={() => toggleMetric(key as keyof ReportConfig['metrics'])}
                          />
                          <Label htmlFor={key} className="text-sm cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Associates Selection */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Associados ({reportConfig.selectedMembers.length}/{allMembers.length})
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllMembers}>Todos</Button>
                      <Button variant="outline" size="sm" onClick={deselectAllMembers}>Nenhum</Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg bg-muted/30">
                    {allMembers.map(member => (
                      <div key={member} className="flex items-center gap-2">
                        <Checkbox
                          id={`member-${member}`}
                          checked={reportConfig.selectedMembers.includes(member)}
                          onCheckedChange={() => toggleMemberSelection(member)}
                        />
                        <Label htmlFor={`member-${member}`} className="text-xs cursor-pointer truncate">{member}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancelar</Button>
                  <Button onClick={handleExportCustomPDF} disabled={isExportingPDF || reportConfig.selectedMembers.length === 0}>
                    {isExportingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Gerar PDF
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4">
        {/* Metrics Report */}
        {showMetricsReport && (
          <div className="mb-6">
            <BattlesMetricsReport
              battleData={battleData}
              teamStructure={teamStructure}
              diamondEntries={diamondEntries}
              currentMonth={currentMonth}
            />
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Total Batalhas</span>
              </div>
              <div className="text-2xl font-bold">{metrics.totalBattles}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Média/Membro</span>
              </div>
              <div className="text-2xl font-bold">{metrics.avgPerMember.toFixed(1)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Baixa/Queda</span>
              </div>
              <div className="text-2xl font-bold text-orange-500">{impactAnalysis.daysWithLowBattles || 0}</div>
              <p className="text-xs text-muted-foreground">dias</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Top Performer</span>
              </div>
              <div className="text-lg font-bold truncate">{metrics.topPerformers[0]?.name || '-'}</div>
              <p className="text-xs text-muted-foreground">{metrics.topPerformers[0]?.total || 0} batalhas</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Dialog open={showExecutiveDialog} onOpenChange={setShowExecutiveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Executivo
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Adicionar Executivo</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Nome do executivo"
                value={newExecutiveName}
                onChange={(e) => setNewExecutiveName(e.target.value)}
              />
              <DialogFooter>
                <Button onClick={handleAddExecutive}>Adicionar</Button>
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
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Adicionar Associado</DialogTitle>
              </DialogHeader>
              <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o executivo" />
                </SelectTrigger>
                <SelectContent className="bg-card border z-50">
                  {teamStructure.map(exec => (
                    <SelectItem key={exec.executive} value={exec.executive}>
                      {exec.executive}
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
                <Button onClick={handleAddAssociate}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories Panel */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Categorias de Batalhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-3 py-2 font-medium min-w-[150px]">ASSOCIADO</th>
                    <th className="text-center px-3 py-2 font-medium min-w-[80px]">TOTAL BATALHAS</th>
                    {CATEGORY_CONFIG.map(cat => (
                      <th key={cat.key} className="text-center px-3 py-2 font-medium min-w-[120px]">
                        <span className={cn("px-2 py-1 rounded text-xs", cat.bgColor, cat.textColor)}>
                          {cat.label}
                        </span>
                      </th>
                    ))}
                    <th className="text-center px-3 py-2 font-medium min-w-[100px]">SOMA CATEGORIAS</th>
                    <th className="text-center px-3 py-2 font-medium min-w-[80px]">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStructure.map((exec) => {
                    const execTotals = categoryTotals.getExecutiveCategoryTotals(exec.members);
                    const execBattleTotal = exec.members.reduce((sum, m) => sum + getMemberBattleTotal(m), 0);
                    const execCategorySum = exec.members.reduce((sum, m) => sum + getMemberCategorySum(m), 0);
                    
                    return (
                      <React.Fragment key={exec.executive}>
                        {/* Executive Header */}
                        <tr className="bg-gray-900 text-white group">
                          <td className="px-3 py-2 font-bold">
                            <div className="flex items-center justify-between">
                              <span>{exec.executive.split('(')[0].trim()}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={() => handleRemoveExecutive(exec.executive)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="text-center font-bold">{execBattleTotal}</td>
                          {CATEGORY_CONFIG.map(cat => (
                            <td key={cat.key} className="text-center font-bold">
                              <span className={cn("px-2 py-1 rounded", cat.bgColor, cat.textColor)}>
                                {execTotals[cat.key]}
                              </span>
                            </td>
                          ))}
                          <td className="text-center font-bold">{execCategorySum}</td>
                          <td className="text-center">
                            {execBattleTotal === execCategorySum ? (
                              <span className="text-emerald-400">✓</span>
                            ) : (
                              <span className="text-red-400">✗</span>
                            )}
                          </td>
                        </tr>
                        
                        {/* Members */}
                        {exec.members.map(member => {
                          const memberBattleTotal = getMemberBattleTotal(member);
                          const memberCategorySum = getMemberCategorySum(member);
                          const isValid = memberBattleTotal === memberCategorySum;
                          
                          return (
                            <tr key={member} className="border-b border-border/50 hover:bg-muted/30 group">
                              <td className="px-3 py-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>{member}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                    onClick={() => handleRemoveAssociate(exec.executive, member)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="text-center font-bold">{memberBattleTotal}</td>
                              {CATEGORY_CONFIG.map(cat => {
                                const catValue = categoryData[member]?.[cat.key];
                                return (
                                  <td key={cat.key} className="text-center px-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      value={catValue !== undefined ? catValue : 0}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateMemberCategory(member, cat.key, val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                                      }}
                                      className={cn(
                                        "h-8 w-16 mx-auto text-center text-sm",
                                        cat.key === 'curliChallenge' && "border-red-500 focus:ring-red-500",
                                        cat.key === 'rise' && "border-gray-400",
                                        cat.key === 'oficial' && "border-blue-500 focus:ring-blue-500"
                                      )}
                                    />
                                  </td>
                                );
                              })}
                              <td className="text-center font-medium">{memberCategorySum}</td>
                              <td className="text-center">
                                {isValid ? (
                                  <span className="text-emerald-500 font-bold">✓</span>
                                ) : (
                                  <span className="text-red-500 font-bold">✗ ({memberBattleTotal - memberCategorySum})</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Grand Total */}
                  <tr className="bg-muted font-bold border-t-2">
                    <td className="px-3 py-3">TOTAL GERAL</td>
                    <td className="text-center">{getGrandTotal()}</td>
                    {CATEGORY_CONFIG.map(cat => (
                      <td key={cat.key} className="text-center">
                        <span className={cn("px-3 py-1 rounded font-bold text-sm", cat.bgColor, cat.textColor)}>
                          {categoryTotals.grandTotals[cat.key]}
                        </span>
                      </td>
                    ))}
                    <td className="text-center">{
                      Object.values(categoryTotals.grandTotals).reduce((a, b) => a + b, 0)
                    }</td>
                    <td className="text-center">
                      {getGrandTotal() === Object.values(categoryTotals.grandTotals).reduce((a, b) => a + b, 0) ? (
                        <span className="text-emerald-500">✓</span>
                      ) : (
                        <span className="text-red-500">✗</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <div ref={reportRef} className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 bg-muted/50 px-3 py-1 text-left font-medium min-w-[150px] z-10">TIME</th>
                {displayDays.map(day => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const dayOfWeek = format(day, 'EEE', { locale: ptBR });
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <th 
                      key={day.toISOString()} 
                      className={cn(
                        "px-1 py-1 text-center min-w-[44px] transition-colors",
                        isToday && "bg-primary/20 ring-2 ring-primary ring-inset",
                        isWeekend && !isToday && "bg-muted/80"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-lg font-bold leading-tight",
                          isToday && "text-primary"
                        )}>
                          {format(day, 'd')}
                        </span>
                        <span className={cn(
                          "text-[10px] text-muted-foreground uppercase leading-tight",
                          isToday && "text-primary font-medium"
                        )}>
                          {dayOfWeek.replace('.', '')}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-2 text-center font-bold bg-muted min-w-[60px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {teamStructure.map((exec) => (
                <React.Fragment key={exec.executive}>
                  <tr className="bg-gray-900 text-white">
                    <td colSpan={displayDays.length + 2} className="px-3 py-2 font-bold text-center">
                      {exec.executive}
                    </td>
                  </tr>
                  
                  {exec.members.map(member => (
                    <tr key={member} className="hover:bg-muted/30 border-b border-border/50">
                      <td className="sticky left-0 bg-card px-3 py-1 font-medium z-10">
                        <div className="flex items-center justify-between group">
                          <span className="text-xs">{member}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => handleRemoveAssociate(exec.executive, member)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      {displayDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const count = getBattleCount(member, day);
                        const isEditing = editingCell?.member === member && editingCell?.date === dateStr;
                        
                        return (
                          <td 
                            key={dateStr} 
                            className={cn(
                              "px-1 py-1 text-center cursor-pointer transition-colors",
                              count === 0 ? "bg-red-500/20 text-red-400" : 
                              count >= 3 ? "bg-emerald-500/20 text-emerald-400" :
                              "bg-background text-foreground"
                            )}
                            onClick={() => handleCellClick(member, dateStr)}
                          >
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleKeyDown}
                                className="h-6 w-10 text-center p-0 text-xs"
                                autoFocus
                                min={0}
                              />
                            ) : (
                              <span className="text-xs font-medium">{count}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-1 text-center font-bold bg-muted/50">
                        {getMemberTotal(member)}
                      </td>
                    </tr>
                  ))}
                  
                  <tr className="bg-muted/30 border-b-2 border-border">
                    <td className="sticky left-0 bg-muted/30 px-3 py-1 font-bold text-xs z-10">SUBTOTAL</td>
                    {displayDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayTotal = exec.members.reduce((sum, m) => sum + (battleData[m]?.[dateStr] || 0), 0);
                      return (
                        <td key={dateStr} className="px-1 py-1 text-center font-bold text-xs">{dayTotal}</td>
                      );
                    })}
                    <td className="px-3 py-1 text-center font-bold bg-muted">{getExecutiveTotal(exec.members)}</td>
                  </tr>
                </React.Fragment>
              ))}
              
              <tr className="bg-gray-900 text-white font-bold">
                <td className="sticky left-0 bg-gray-900 px-3 py-2 z-10">TOTAL GERAL</td>
                {displayDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  let dayTotal = 0;
                  teamStructure.forEach(exec => exec.members.forEach(m => { dayTotal += battleData[m]?.[dateStr] || 0; }));
                  return <td key={dateStr} className="px-1 py-2 text-center text-xs">{dayTotal}</td>;
                })}
                <td className="px-3 py-2 text-center text-lg">{getGrandTotal()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Impact Analysis */}
        {impactAnalysis.hasData && (
          <Card className="mt-6 border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Análise de Impacto: Batalhas x Diamantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-background rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">Dias Baixa Batalha</div>
                  <div className="text-xl font-bold text-red-500">{impactAnalysis.daysWithLowBattles}</div>
                  <p className="text-xs text-muted-foreground">&lt;10 batalhas</p>
                </div>
                
                <div className="bg-background rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">💎 Alta (&gt;20)</div>
                  <div className="text-xl font-bold text-blue-500">
                    {impactAnalysis.avgDiamondsHighBattles ? (impactAnalysis.avgDiamondsHighBattles / 1000000).toFixed(2) + 'M' : '-'}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">💎 Baixa (&lt;10)</div>
                  <div className="text-xl font-bold text-gray-500">
                    {impactAnalysis.avgDiamondsLowBattles ? (impactAnalysis.avgDiamondsLowBattles / 1000000).toFixed(2) + 'M' : '-'}
                  </div>
                </div>
              </div>

              {impactAnalysis.differencePercent !== 0 && (
                <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                  <div className="text-sm">
                    Dias com alta batalha (&gt;20) = {' '}
                    <span className={impactAnalysis.differencePercent > 0 ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                      {impactAnalysis.differencePercent > 0 ? '+' : ''}{impactAnalysis.differencePercent.toFixed(1)}%
                    </span>{' '} 💎
                  </div>
                </div>
              )}

              {impactAnalysis.problematicDays.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Dias Problemáticos</h4>
                  <div className="space-y-1">
                    {impactAnalysis.problematicDays.slice(0, 5).map(day => (
                      <div key={day.date} className="flex items-center justify-between bg-red-500/10 rounded px-3 py-1 text-xs">
                        <span>{day.dateLabel}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-yellow-500">{day.battles} batalhas</span>
                          <span className="text-red-500">{(day.diamondChange / 1000000).toFixed(2)}M 💎</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Low Performers */}
        {metrics.lowPerformers.length > 0 && (
          <Card className="mt-6 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-5 w-5 text-yellow-500" />
                Baixo Desempenho (&lt;10 batalhas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {metrics.lowPerformers.map(member => (
                  <div key={member.name} className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20 text-center">
                    <div className="text-sm font-medium truncate">{member.name}</div>
                    <div className="text-lg font-bold text-yellow-500">{member.total}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Hidden Custom Report for PDF Export */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={customReportRef} className="p-4" style={{ backgroundColor: '#fff', width: `${Math.max(800, 140 + reportData.dailyTotals.length * 40)}px` }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-2" style={{ borderBottom: '2px solid #dc2626' }}>
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>Relatório de Batalhas</h1>
              <p className="text-xs" style={{ color: '#555' }}>
                {reportConfig.startDate && reportConfig.endDate ? 
                  `${format(parseISO(reportConfig.startDate), "dd/MM/yyyy")} - ${format(parseISO(reportConfig.endDate), "dd/MM/yyyy")}` : 
                  'Período não definido'}
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: '#666' }}>
              Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
            </div>
          </div>

          {/* Main Spreadsheet Table - Grouped by Executive */}
          {reportConfig.metrics.dailyBreakdown && (
            <div className="mb-4 overflow-hidden" style={{ border: '1px solid #000' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fff' }}>
                    <th className="px-2 py-1 text-left font-bold text-xs" style={{ color: '#000', minWidth: '120px', borderRight: '1px solid #000', borderBottom: '1px solid #000' }}>
                      TIME
                    </th>
                    {reportData.dailyTotals.map(day => (
                      <th key={day.date} className="px-1 py-1 text-center font-bold text-xs" style={{ color: '#dc2626', minWidth: '36px', borderRight: '1px solid #ccc', borderBottom: '1px solid #000' }}>
                        {day.dateLabel}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center font-bold text-xs" style={{ color: '#fff', backgroundColor: '#dc2626', minWidth: '45px', borderBottom: '1px solid #000' }}>
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.groupedByExecutive.map((exec) => (
                    <React.Fragment key={exec.executive}>
                      {/* TIME label row */}
                      <tr style={{ backgroundColor: '#fff' }}>
                        <td className="px-2 py-0.5 font-bold text-[10px]" style={{ color: '#000', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>
                          TIME
                        </td>
                        <td 
                          colSpan={reportData.dailyTotals.length + 1}
                          className="px-2 py-0.5 font-bold text-[10px] text-center"
                          style={{ color: '#fff', backgroundColor: '#1a1a1a', borderBottom: '1px solid #000' }}
                        >
                          {exec.executive}
                        </td>
                      </tr>
                      {/* Member Rows */}
                      {exec.members.map((member) => (
                        <tr key={member.name} style={{ backgroundColor: '#fff' }}>
                          <td className="px-2 py-0.5 font-medium text-[10px]" style={{ color: '#000', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>
                            {member.name}
                          </td>
                          {member.dailyData.map(day => {
                            let bgColor = '#fff';
                            let textColor = '#000';
                            
                            if (day.count === 0) {
                              bgColor = '#dc2626';
                              textColor = '#fff';
                            } else if (day.count >= 3) {
                              bgColor = '#16a34a';
                              textColor = '#fff';
                            }
                            
                            return (
                              <td 
                                key={day.date} 
                                className="px-1 py-0.5 text-center font-bold text-xs"
                                style={{ 
                                  backgroundColor: bgColor, 
                                  color: textColor,
                                  borderRight: '1px solid #ccc',
                                  borderBottom: '1px solid #ccc'
                                }}
                              >
                                {day.count}
                              </td>
                            );
                          })}
                          <td className="px-1 py-0.5 text-center font-bold text-xs" style={{ backgroundColor: '#fecaca', color: '#991b1b', borderBottom: '1px solid #ccc' }}>
                            {member.total}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Metrics */}
          {reportConfig.metrics.totalBattles && (
            <div className="mb-4 p-3" style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
              <h2 className="text-xs font-bold mb-2" style={{ color: '#333' }}>Resumo</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2" style={{ backgroundColor: '#fff', border: '1px solid #ddd' }}>
                  <div className="text-lg font-black" style={{ color: '#dc2626' }}>{reportData.grandTotal}</div>
                  <div className="text-[10px]" style={{ color: '#666' }}>Total</div>
                </div>
                <div className="text-center p-2" style={{ backgroundColor: '#fff', border: '1px solid #ddd' }}>
                  <div className="text-lg font-black" style={{ color: '#333' }}>{reportData.avgBattlesPerDay.toFixed(1)}</div>
                  <div className="text-[10px]" style={{ color: '#666' }}>Média/Dia</div>
                </div>
                <div className="text-center p-2" style={{ backgroundColor: '#fff', border: '1px solid #ddd' }}>
                  <div className="text-lg font-black" style={{ color: '#333' }}>{reportData.avgPerMember.toFixed(1)}</div>
                  <div className="text-[10px]" style={{ color: '#666' }}>Média/Associado</div>
                </div>
              </div>
            </div>
          )}

          {/* Top Performers */}
          {reportConfig.metrics.topPerformers && (
            <div className="mb-5 rounded p-4" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac' }}>
              <h2 className="text-sm font-bold mb-3" style={{ color: '#166534', borderBottom: '1px solid #bbf7d0', paddingBottom: '8px' }}>🏆 Top Performers</h2>
              <div className="space-y-2">
                {reportData.topPerformers.map((member, idx) => (
                  <div key={member.name} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: '#fff', border: '1px solid #bbf7d0' }}>
                    <span className="font-semibold text-sm" style={{ color: '#333' }}>#{idx + 1} {member.name}</span>
                    <span className="font-bold text-base" style={{ color: '#16a34a' }}>{member.total} batalhas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low Performers */}
          {reportConfig.metrics.lowPerformers && reportData.lowPerformers.length > 0 && (
            <div className="mb-5 rounded p-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
              <h2 className="text-sm font-bold mb-3" style={{ color: '#991b1b', borderBottom: '1px solid #fecaca', paddingBottom: '8px' }}>⚠️ Baixo Desempenho (&lt;10 batalhas)</h2>
              <div className="grid grid-cols-4 gap-2">
                {reportData.lowPerformers.map(member => (
                  <div key={member.name} className="text-center p-2 rounded" style={{ backgroundColor: '#fff', border: '1px solid #fca5a5' }}>
                    <div className="text-xs font-semibold truncate" style={{ color: '#333' }}>{member.name}</div>
                    <div className="text-xl font-black" style={{ color: '#dc2626' }}>{member.total}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact Analysis */}
          {reportConfig.metrics.impactAnalysis && impactAnalysis.hasData && (
            <div className="mb-5 rounded p-4" style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
              <h2 className="text-sm font-bold mb-3" style={{ color: '#92400e', borderBottom: '1px solid #fde68a', paddingBottom: '8px' }}>📊 Análise de Impacto: Batalhas x Diamantes</h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-3 rounded" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                  <div className="text-2xl font-black" style={{ color: '#dc2626' }}>{impactAnalysis.daysWithLowBattles}</div>
                  <div className="text-xs font-semibold" style={{ color: '#666' }}>Dias Baixa Batalha</div>
                  <div className="text-xs" style={{ color: '#999' }}>&lt;10/dia</div>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd' }}>
                  <div className="text-xl font-black" style={{ color: '#2563eb' }}>
                    {impactAnalysis.avgDiamondsHighBattles ? (impactAnalysis.avgDiamondsHighBattles / 1000000).toFixed(2) + 'M' : '-'}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: '#666' }}>💎 Alta Batalha</div>
                  <div className="text-xs" style={{ color: '#999' }}>&gt;20/dia</div>
                </div>
                <div className="text-center p-3 rounded" style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
                  <div className="text-xl font-black" style={{ color: '#666' }}>
                    {impactAnalysis.avgDiamondsLowBattles ? (impactAnalysis.avgDiamondsLowBattles / 1000000).toFixed(2) + 'M' : '-'}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: '#666' }}>💎 Baixa Batalha</div>
                  <div className="text-xs" style={{ color: '#999' }}>&lt;10/dia</div>
                </div>
              </div>
              {impactAnalysis.differencePercent !== 0 && (
                <div className="text-center p-3 rounded" style={{ backgroundColor: impactAnalysis.differencePercent > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${impactAnalysis.differencePercent > 0 ? '#86efac' : '#fca5a5'}` }}>
                  <span className="text-sm font-semibold" style={{ color: '#333' }}>Impacto: Alta batalha = </span>
                  <span className="text-lg font-black" style={{ color: impactAnalysis.differencePercent > 0 ? '#16a34a' : '#dc2626' }}>
                    {impactAnalysis.differencePercent > 0 ? '+' : ''}{impactAnalysis.differencePercent.toFixed(1)}%
                  </span>
                  <span className="text-sm" style={{ color: '#333' }}> 💎</span>
                </div>
              )}
              {impactAnalysis.problematicDays.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-bold mb-2" style={{ color: '#991b1b' }}>Dias Problemáticos</h3>
                  <div className="space-y-1">
                    {impactAnalysis.problematicDays.slice(0, 5).map(day => (
                      <div key={day.date} className="flex items-center justify-between p-2 rounded text-xs" style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                        <span className="font-semibold" style={{ color: '#333' }}>{day.dateLabel}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-bold" style={{ color: '#f59e0b' }}>{day.battles} bat.</span>
                          <span className="font-bold" style={{ color: '#dc2626' }}>{(day.diamondChange / 1000000).toFixed(2)}M 💎</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs" style={{ color: '#666' }}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span>0 batalhas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fff', border: '1px solid #ddd' }}></div>
              <span>1-3 batalhas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span>4+ batalhas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattlesDashboard;
