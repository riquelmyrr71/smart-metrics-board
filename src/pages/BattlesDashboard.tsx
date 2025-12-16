import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, getDaysInMonth, startOfMonth, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
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
  Loader2
} from 'lucide-react';
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

const BATTLES_DATA_ID = '00000000-0000-0000-0000-000000000003';
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
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStart = startOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load battle data
        const { data: battlesData, error: battlesError } = await supabase
          .from('dashboard_data')
          .select('*')
          .eq('id', BATTLES_DATA_ID)
          .maybeSingle();

        if (battlesError) throw battlesError;

        if (battlesData?.data) {
          const parsed = battlesData.data as { battleData?: BattleData; teamStructure?: TeamStructure[] };
          if (parsed.battleData) setBattleData(parsed.battleData);
          if (parsed.teamStructure) setTeamStructure(parsed.teamStructure);
        }

        // Load diamond data for impact analysis
        const { data: chartData, error: chartError } = await supabase
          .from('dashboard_data')
          .select('*')
          .eq('id', CHART_DATA_ID)
          .maybeSingle();

        if (chartError) throw chartError;

        if (chartData?.data) {
          const parsed = chartData.data as { entries?: DiamondEntry[] };
          if (parsed.entries) setDiamondEntries(parsed.entries);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados',
          variant: 'destructive',
        });
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
        data: { battleData, teamStructure } as unknown as import('@/integrations/supabase/types').Json,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('dashboard_data').upsert(payload);

      if (error) throw error;

      toast({
        title: 'Salvo!',
        description: 'Dados salvos com sucesso',
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar dados',
        variant: 'destructive',
      });
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
      [member]: {
        ...(prev[member] || {}),
        [dateStr]: count,
      },
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
      return { hasData: false, correlationData: [], problematicDays: [], daysWithLowBattles: 0 };
    }

    // Sort by date
    const sortedDiamonds = [...currentMonthDiamonds].sort((a, b) => a.date.localeCompare(b.date));
    
    // Get daily battle totals
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

    // Calculate correlation data
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

    // Find problematic days (low battles + diamond drop)
    const problematicDays = correlationData.filter(d => d.battles < 10 && d.diamondChange < 0);
    const daysWithLowBattles = correlationData.filter(d => d.battles < 10).length;

    // Calculate averages
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

    return {
      hasData: true,
      correlationData,
      problematicDays,
      daysWithLowBattles,
      avgDiamondsHighBattles,
      avgDiamondsLowBattles,
      differencePercent,
    };
  }, [battleData, diamondEntries, currentMonth, days, teamStructure]);

  // Metrics
  const metrics = useMemo(() => {
    const totalBattles = getGrandTotal();
    const totalMembers = teamStructure.reduce((sum, exec) => sum + exec.members.length, 0);
    const avgPerMember = totalMembers > 0 ? totalBattles / totalMembers : 0;
    
    // Best performers
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
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPDF(true);
    try {
      toast({ title: 'Gerando PDF...', description: 'Aguarde' });
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#fafafa' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`painel-batalhas-${format(currentMonth, 'MM-yyyy')}.pdf`);
      toast({ title: 'PDF exportado!' });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({ title: 'Erro', description: 'Falha ao exportar PDF', variant: 'destructive' });
    } finally {
      setIsExportingPDF(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
            <Swords className="h-6 w-6 text-red-500" />
            <h1 className="text-xl font-bold">Painel de Batalhas</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Month Navigation */}
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
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

            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExportingPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4">
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
        <div className="flex gap-2 mb-4">
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Associado</DialogTitle>
              </DialogHeader>
              <Select value={selectedExecutive} onValueChange={setSelectedExecutive}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o executivo" />
                </SelectTrigger>
                <SelectContent>
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

        {/* Main Table */}
        <div ref={reportRef} className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium min-w-[150px] z-10">TIME</th>
                {days.map(day => (
                  <th key={day.toISOString()} className="px-2 py-2 text-center font-medium min-w-[40px]">
                    {format(day, 'dd/MM')}
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-bold bg-muted min-w-[60px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {teamStructure.map((exec) => (
                <React.Fragment key={exec.executive}>
                  {/* Executive Header */}
                  <tr className="bg-gray-900 text-white">
                    <td colSpan={days.length + 2} className="px-3 py-2 font-bold text-center">
                      {exec.executive}
                    </td>
                  </tr>
                  
                  {/* Members */}
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
                      {days.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const count = getBattleCount(member, day);
                        const isEditing = editingCell?.member === member && editingCell?.date === dateStr;
                        
                        return (
                          <td 
                            key={dateStr} 
                            className={cn(
                              "px-1 py-1 text-center cursor-pointer transition-colors",
                              count === 0 ? "bg-red-500/20 text-red-400" : 
                              count < 3 ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-emerald-500/20 text-emerald-400"
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
                  
                  {/* Executive Subtotal */}
                  <tr className="bg-muted/30 border-b-2 border-border">
                    <td className="sticky left-0 bg-muted/30 px-3 py-1 font-bold text-xs z-10">
                      SUBTOTAL
                    </td>
                    {days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const dayTotal = exec.members.reduce((sum, m) => sum + (battleData[m]?.[dateStr] || 0), 0);
                      return (
                        <td key={dateStr} className="px-1 py-1 text-center font-bold text-xs">
                          {dayTotal}
                        </td>
                      );
                    })}
                    <td className="px-3 py-1 text-center font-bold bg-muted">
                      {getExecutiveTotal(exec.members)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              
              {/* Grand Total */}
              <tr className="bg-gray-900 text-white font-bold">
                <td className="sticky left-0 bg-gray-900 px-3 py-2 z-10">TOTAL GERAL</td>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  let dayTotal = 0;
                  teamStructure.forEach(exec => {
                    exec.members.forEach(m => {
                      dayTotal += battleData[m]?.[dateStr] || 0;
                    });
                  });
                  return (
                    <td key={dateStr} className="px-1 py-2 text-center text-xs">
                      {dayTotal}
                    </td>
                  );
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
                    {impactAnalysis.avgDiamondsHighBattles 
                      ? (impactAnalysis.avgDiamondsHighBattles / 1000000).toFixed(2) + 'M' 
                      : '-'}
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-3 border">
                  <div className="text-xs text-muted-foreground mb-1">💎 Baixa (&lt;10)</div>
                  <div className="text-xl font-bold text-gray-500">
                    {impactAnalysis.avgDiamondsLowBattles 
                      ? (impactAnalysis.avgDiamondsLowBattles / 1000000).toFixed(2) + 'M' 
                      : '-'}
                  </div>
                </div>
              </div>

              {impactAnalysis.differencePercent !== 0 && (
                <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                  <div className="text-sm">
                    Dias com alta batalha (&gt;20) = {' '}
                    <span className={impactAnalysis.differencePercent > 0 ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                      {impactAnalysis.differencePercent > 0 ? '+' : ''}{impactAnalysis.differencePercent.toFixed(1)}%
                    </span>{' '}
                    💎
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
    </div>
  );
};

export default BattlesDashboard;
