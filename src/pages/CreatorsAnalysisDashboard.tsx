import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  Save, 
  Home, 
  FileText, 
  Plus, 
  Trash2,
  Loader2,
  UserSearch,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ExternalLink,
  Trophy,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import curliLogo from '@/assets/logo-curli.png';

interface CreatorsData {
  [memberName: string]: number;
}

interface TeamStructure {
  executive: string;
  members: string[];
}

interface ComparisonData {
  yesterdayTotal: number;
  yesterdayTime: string;
  dailyGoal: number;
}

const CREATORS_DATA_ID = '00000000-0000-0000-0000-000000000004';

const DEFAULT_TEAM_STRUCTURE: TeamStructure[] = [
  { executive: 'Danilo Garcia', members: ['JOÃO', 'IGOR', 'RYAN'] },
  { executive: 'Lucas Zampoli', members: ['BIANCA FOSCHINI', 'IAGO PATRICIO', 'BKARO', 'GABRIELLE SOUSA'] },
  { executive: 'Lucas Beccaro', members: ['MARIANA TEIXEIRA', 'ANA JÚLIA SANTIAGO', 'ANA PAULA CARDOSO', 'MATHEUS ARAUJO'] },
  { executive: 'Iago Andrade', members: ['CAIO PEDRO', 'LORRANY COSTA', 'STELLA RODRIGUES', 'GUILHERME'] },
  { executive: 'Leonardo e Bianca', members: ['GUILHERME TEIXEIRA', 'NAYARA SILVA'] },
  { executive: 'Gabrielle Sousa', members: ['MARCO'] },
];

const CreatorsAnalysisDashboard = () => {
  const [creatorsData, setCreatorsData] = useState<CreatorsData>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamStructure, setTeamStructure] = useState<TeamStructure[]>(DEFAULT_TEAM_STRUCTURE);
  const [newExecutiveName, setNewExecutiveName] = useState('');
  const [newAssociateName, setNewAssociateName] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [showExecutiveDialog, setShowExecutiveDialog] = useState(false);
  const [showAssociateDialog, setShowAssociateDialog] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData>({ yesterdayTotal: 0, yesterdayTime: '', dailyGoal: 50 });
  
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('dashboard_data')
          .select('*')
          .eq('id', CREATORS_DATA_ID)
          .maybeSingle();

        if (error) throw error;

        if (data?.data) {
          const parsed = data.data as { 
            creatorsData?: CreatorsData; 
            teamStructure?: TeamStructure[];
            lastUpdated?: string;
            comparisonData?: ComparisonData;
          };
          if (parsed.creatorsData) setCreatorsData(parsed.creatorsData);
          if (parsed.teamStructure) setTeamStructure(parsed.teamStructure);
          if (parsed.lastUpdated) setLastUpdated(parsed.lastUpdated);
          if (parsed.comparisonData) setComparisonData(parsed.comparisonData);
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

  const handleSave = async () => {
    setIsSaving(true);
    const now = new Date().toISOString();
    try {
      const payload = {
        id: CREATORS_DATA_ID,
        data: { creatorsData, teamStructure, lastUpdated: now, comparisonData } as unknown as import('@/integrations/supabase/types').Json,
        updated_at: now,
      };
      const { error } = await supabase.from('dashboard_data').upsert(payload);
      if (error) throw error;
      setLastUpdated(now);
      toast({ title: 'Salvo!', description: 'Dados salvos com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar dados', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const getCreatorCount = (member: string): number => creatorsData[member] || 0;

  const setCreatorCount = (member: string, count: number) => {
    setCreatorsData(prev => ({
      ...prev,
      [member]: Math.max(0, count),
    }));
  };

  const getExecutiveTotal = (members: string[]): number => {
    return members.reduce((sum, member) => sum + getCreatorCount(member), 0);
  };

  const getGrandTotal = (): number => {
    return teamStructure.reduce((sum, exec) => sum + getExecutiveTotal(exec.members), 0);
  };

  const getTotalAssociates = (): number => {
    return teamStructure.reduce((sum, exec) => sum + exec.members.length, 0);
  };

  const getAveragePerAssociate = (): number => {
    const total = getTotalAssociates();
    return total > 0 ? Math.round((getGrandTotal() / total) * 10) / 10 : 0;
  };

  const getTopPerformer = (): { name: string; count: number; executive: string } | null => {
    let top: { name: string; count: number; executive: string } | null = null;
    teamStructure.forEach(exec => {
      exec.members.forEach(member => {
        const count = getCreatorCount(member);
        if (!top || count > top.count) {
          top = { name: member, count, executive: exec.executive };
        }
      });
    });
    return top;
  };

  const getComparisonDiff = (): { diff: number; percentage: number } => {
    const current = getGrandTotal();
    const yesterday = comparisonData.yesterdayTotal || 0;
    const diff = current - yesterday;
    const percentage = yesterday > 0 ? Math.round((diff / yesterday) * 100) : 0;
    return { diff, percentage };
  };

  const getGoalProgress = (): { percentage: number; remaining: number } => {
    const current = getGrandTotal();
    const goal = comparisonData.dailyGoal || 50;
    const percentage = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
    const remaining = Math.max(goal - current, 0);
    return { percentage, remaining };
  };

  const handleAddExecutive = () => {
    if (!newExecutiveName.trim()) return;
    setTeamStructure(prev => [...prev, { executive: newExecutiveName.trim(), members: [] }]);
    setNewExecutiveName('');
    setShowExecutiveDialog(false);
  };

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

  const handleRemoveAssociate = (executive: string, member: string) => {
    setTeamStructure(prev => prev.map(exec =>
      exec.executive === executive
        ? { ...exec, members: exec.members.filter(m => m !== member) }
        : exec
    ));
  };

  const handleRemoveExecutive = (executive: string) => {
    setTeamStructure(prev => prev.filter(exec => exec.executive !== executive));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPDF(true);
    try {
      toast({ title: 'Gerando relatório...', description: 'Aguarde' });
      
      const canvas = await html2canvas(reportRef.current, { 
        scale: 2, 
        backgroundColor: '#fafafa',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      
      const x = (pdfWidth - imgWidth * ratio) / 2;
      pdf.addImage(imgData, 'PNG', x, 10, imgWidth * ratio, imgHeight * ratio);
      
      pdf.save(`painel-criadores-analise-${format(new Date(), 'dd-MM-yyyy-HHmm')}.pdf`);
      toast({ title: 'Relatório exportado!' });
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
            <UserSearch className="h-6 w-6 text-purple-500" />
            <h1 className="text-xl font-bold">Criadores em Análise</h1>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExportingPDF}>
              {isExportingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Exportar PDF
            </Button>
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {/* Last Updated Banner */}
        <Card className="mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Última atualização: {lastUpdated 
                  ? format(new Date(lastUpdated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : 'Nunca salvo'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Goal Progress */}
        <Card className="mb-4 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">Meta Diária</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={comparisonData.dailyGoal || ''}
                  onChange={(e) => setComparisonData(prev => ({
                    ...prev,
                    dailyGoal: parseInt(e.target.value) || 50
                  }))}
                  className="w-20 h-8 text-center font-bold"
                  placeholder="50"
                />
                <span className="text-sm text-muted-foreground">criadores</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative">
              <div className="h-6 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    getGoalProgress().percentage >= 100 
                      ? 'bg-green-500' 
                      : getGoalProgress().percentage >= 75 
                        ? 'bg-blue-500' 
                        : getGoalProgress().percentage >= 50 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(getGoalProgress().percentage, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">
                    {getGrandTotal()} / {comparisonData.dailyGoal || 50} ({getGoalProgress().percentage}%)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Progress Info */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>
                {getGoalProgress().percentage >= 100 
                  ? '🎉 Meta atingida!' 
                  : `Faltam ${getGoalProgress().remaining} criadores`}
              </span>
              <span>
                {getGoalProgress().percentage >= 100 
                  ? `+${getGrandTotal() - (comparisonData.dailyGoal || 50)} acima da meta`
                  : `${100 - getGoalProgress().percentage}% restante`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Total Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Atual</p>
                  <p className="text-2xl font-bold">{getGrandTotal()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yesterday Comparison */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Ontem (mesmo horário)</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={comparisonData.yesterdayTotal || ''}
                    onChange={(e) => setComparisonData(prev => ({
                      ...prev,
                      yesterdayTotal: parseInt(e.target.value) || 0,
                      yesterdayTime: format(new Date(), 'HH:mm')
                    }))}
                    className="w-20 h-8 text-center font-bold"
                    placeholder="0"
                  />
                  {(() => {
                    const { diff, percentage } = getComparisonDiff();
                    if (diff === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
                    if (diff > 0) return (
                      <span className="flex items-center text-green-600 text-sm font-medium">
                        <TrendingUp className="h-4 w-4 mr-1" />+{diff} ({percentage}%)
                      </span>
                    );
                    return (
                      <span className="flex items-center text-red-600 text-sm font-medium">
                        <TrendingDown className="h-4 w-4 mr-1" />{diff} ({percentage}%)
                      </span>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average per Associate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Média por Associado</p>
                  <p className="text-2xl font-bold">{getAveragePerAssociate()}</p>
                  <p className="text-xs text-muted-foreground">{getTotalAssociates()} associados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performer */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Top Performer</p>
                  {(() => {
                    const top = getTopPerformer();
                    if (!top || top.count === 0) return <p className="text-sm text-muted-foreground">-</p>;
                    return (
                      <>
                        <p className="text-sm font-bold">{top.name}</p>
                        <p className="text-xs text-muted-foreground">{top.count} criadores</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/graficos')}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Ver Gráficos
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/overview')}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Overview
          </Button>
        </div>

        {/* Management Buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Dialog open={showExecutiveDialog} onOpenChange={setShowExecutiveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Executivo
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
                <Plus className="h-4 w-4 mr-1" />
                Associado
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

        {/* Main Panel */}
        <Card>
          <CardContent className="p-0">
            {teamStructure.map((exec) => {
              const execTotal = getExecutiveTotal(exec.members);
              
              return (
                <div key={exec.executive}>
                  {/* Executive Header */}
                  <div className="bg-purple-900 text-white px-4 py-2 flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">🔴</span>
                      <span className="font-bold">{exec.executive}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Total: {execTotal}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                        onClick={() => handleRemoveExecutive(exec.executive)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Members */}
                  {exec.members.map(member => {
                    const count = getCreatorCount(member);
                    
                    return (
                      <div key={member} className="border-b border-border/50 px-4 py-2 hover:bg-muted/30 group flex items-center justify-between">
                        <span className="font-medium text-sm pl-4">{member}</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={count || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCreatorCount(member, val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                            }}
                            className="w-20 h-8 text-center font-bold"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => handleRemoveAssociate(exec.executive, member)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            
            {/* Grand Total */}
            <div className="bg-muted font-bold px-4 py-3 flex items-center justify-between border-t-2">
              <span>TOTAL GERAL</span>
              <span className="text-xl">{getGrandTotal()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Hidden Report for PDF Export */}
        <div className="fixed -left-[9999px] top-0">
          <div ref={reportRef} className="bg-white p-6 w-[550px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <img src={curliLogo} alt="Curli Logo" className="h-8 w-auto" />
              <div className="text-right">
                <p className="text-xs text-gray-500">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-gray-900">CRIADORES EM ANÁLISE</h1>
            </div>

            {/* Metrics Summary */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Total Atual</p>
                <p className="text-xl font-bold text-purple-700">{getGrandTotal()}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Ontem</p>
                <p className="text-xl font-bold text-gray-700">{comparisonData.yesterdayTotal || '-'}</p>
              </div>
              <div className={`p-2 rounded text-center ${getComparisonDiff().diff >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-xs text-gray-600">Variação</p>
                <p className={`text-xl font-bold ${getComparisonDiff().diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {getComparisonDiff().diff >= 0 ? '+' : ''}{getComparisonDiff().diff}
                </p>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Média/Assoc.</p>
                <p className="text-xl font-bold text-blue-700">{getAveragePerAssociate()}</p>
              </div>
            </div>

            {/* Daily Goal Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-700">🎯 Meta Diária: {comparisonData.dailyGoal || 50}</span>
                <span className="text-xs font-bold text-gray-700">{getGoalProgress().percentage}%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    getGoalProgress().percentage >= 100 
                      ? 'bg-green-500' 
                      : getGoalProgress().percentage >= 75 
                        ? 'bg-blue-500' 
                        : getGoalProgress().percentage >= 50 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(getGoalProgress().percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-1">
                {getGoalProgress().percentage >= 100 
                  ? `🎉 Meta atingida! (+${getGrandTotal() - (comparisonData.dailyGoal || 50)} acima)`
                  : `Faltam ${getGoalProgress().remaining} criadores`}
              </p>
            </div>

            {/* Top Performer */}
            {(() => {
              const top = getTopPerformer();
              if (top && top.count > 0) {
                return (
                  <div className="bg-amber-50 p-2 rounded mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">🏆</span>
                      <span className="text-sm font-bold text-amber-800">Top Performer: {top.name}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700">{top.count} criadores</span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 font-bold text-gray-800">Executivo / Associado</th>
                  <th className="text-right py-2 font-bold text-gray-800 w-16">Qtd</th>
                </tr>
              </thead>
              <tbody>
                {teamStructure.map((exec) => {
                  const execTotal = getExecutiveTotal(exec.members);
                  
                  return (
                    <React.Fragment key={exec.executive}>
                      <tr className="bg-gray-100">
                        <td className="py-1.5 font-bold text-gray-900">{exec.executive}</td>
                        <td className="py-1.5 text-right font-bold text-gray-900">{execTotal}</td>
                      </tr>
                      {exec.members.map(member => {
                        const count = getCreatorCount(member);
                        const isTop = getTopPerformer()?.name === member && count > 0;
                        return (
                          <tr key={member} className={`border-b border-gray-200 ${isTop ? 'bg-amber-50' : ''}`}>
                            <td className="py-1 pl-4 text-gray-700">
                              {isTop && <span className="mr-1">⭐</span>}
                              {member}
                            </td>
                            <td className={`py-1 text-right ${isTop ? 'font-bold text-amber-700' : 'text-gray-700'}`}>{count}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
                <tr className="border-t-2 border-gray-400">
                  <td className="py-2 font-bold text-gray-900">TOTAL GERAL ({getTotalAssociates()} associados)</td>
                  <td className="py-2 text-right font-bold text-xl text-purple-700">{getGrandTotal()}</td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">
                Relatório gerado automaticamente • {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatorsAnalysisDashboard;
