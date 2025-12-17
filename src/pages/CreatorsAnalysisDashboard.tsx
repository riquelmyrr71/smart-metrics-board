import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  UserPlus
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

interface CreatorsData {
  [memberName: string]: string[]; // Array of creator names
}

interface CreatorsTodayData {
  [memberName: string]: string[]; // Array of creator names added today
}

interface TeamStructure {
  executive: string;
  members: string[];
}

const CREATORS_DATA_ID = '00000000-0000-0000-0000-000000000004';

const DEFAULT_TEAM_STRUCTURE: TeamStructure[] = [
  {
    executive: 'Danilo Garcia',
    members: ['JOÃO', 'IGOR', 'RYAN'],
  },
  {
    executive: 'Lucas Zampoli',
    members: ['BIANCA FOSCHINI', 'IAGO PATRICIO', 'BKARO', 'GABRIELLE SOUSA'],
  },
  {
    executive: 'Lucas Beccaro',
    members: ['MARIANA TEIXEIRA', 'ANA JÚLIA SANTIAGO', 'ANA PAULA CARDOSO', 'MATHEUS ARAUJO'],
  },
  {
    executive: 'Iago Andrade',
    members: ['CAIO PEDRO', 'LORRANY COSTA', 'STELLA RODRIGUES', 'GUILHERME'],
  },
  {
    executive: 'Leonardo e Bianca',
    members: ['GUILHERME TEIXEIRA', 'NAYARA SILVA'],
  },
  {
    executive: 'Gabrielle Sousa',
    members: ['MARCO'],
  },
];

const CreatorsAnalysisDashboard = () => {
  const [creatorsData, setCreatorsData] = useState<CreatorsData>({});
  const [creatorsTodayData, setCreatorsTodayData] = useState<CreatorsTodayData>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamStructure, setTeamStructure] = useState<TeamStructure[]>(DEFAULT_TEAM_STRUCTURE);
  const [newExecutiveName, setNewExecutiveName] = useState('');
  const [newAssociateName, setNewAssociateName] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [showExecutiveDialog, setShowExecutiveDialog] = useState(false);
  const [showAssociateDialog, setShowAssociateDialog] = useState(false);
  const [showAddCreatorDialog, setShowAddCreatorDialog] = useState(false);
  const [showAddCreatorTodayDialog, setShowAddCreatorTodayDialog] = useState(false);
  const [selectedMemberForCreator, setSelectedMemberForCreator] = useState('');
  const [newCreatorName, setNewCreatorName] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load data
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
            creatorsTodayData?: CreatorsTodayData;
            teamStructure?: TeamStructure[];
            lastUpdated?: string;
          };
          if (parsed.creatorsData) setCreatorsData(parsed.creatorsData);
          if (parsed.creatorsTodayData) setCreatorsTodayData(parsed.creatorsTodayData);
          if (parsed.teamStructure) setTeamStructure(parsed.teamStructure);
          if (parsed.lastUpdated) setLastUpdated(parsed.lastUpdated);
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
    const now = new Date().toISOString();
    try {
      const payload = {
        id: CREATORS_DATA_ID,
        data: { 
          creatorsData, 
          creatorsTodayData,
          teamStructure,
          lastUpdated: now 
        } as unknown as import('@/integrations/supabase/types').Json,
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

  // Get creators for a member
  const getCreators = (member: string): string[] => {
    return creatorsData[member] || [];
  };

  // Get creators today for a member
  const getCreatorsToday = (member: string): string[] => {
    return creatorsTodayData[member] || [];
  };

  // Add creator to member
  const addCreator = (member: string, creatorName: string, isToday: boolean = false) => {
    if (!creatorName.trim()) return;
    
    if (isToday) {
      setCreatorsTodayData(prev => ({
        ...prev,
        [member]: [...(prev[member] || []), creatorName.trim()],
      }));
    } else {
      setCreatorsData(prev => ({
        ...prev,
        [member]: [...(prev[member] || []), creatorName.trim()],
      }));
    }
  };

  // Remove creator from member
  const removeCreator = (member: string, creatorIndex: number, isToday: boolean = false) => {
    if (isToday) {
      setCreatorsTodayData(prev => ({
        ...prev,
        [member]: (prev[member] || []).filter((_, i) => i !== creatorIndex),
      }));
    } else {
      setCreatorsData(prev => ({
        ...prev,
        [member]: (prev[member] || []).filter((_, i) => i !== creatorIndex),
      }));
    }
  };

  // Calculate executive total
  const getExecutiveTotal = (members: string[]): number => {
    return members.reduce((sum, member) => sum + getCreators(member).length, 0);
  };

  // Calculate executive today total
  const getExecutiveTodayTotal = (members: string[]): number => {
    return members.reduce((sum, member) => sum + getCreatorsToday(member).length, 0);
  };

  // Calculate grand total
  const getGrandTotal = (): number => {
    return teamStructure.reduce((sum, exec) => sum + getExecutiveTotal(exec.members), 0);
  };

  // Calculate grand today total
  const getGrandTodayTotal = (): number => {
    return teamStructure.reduce((sum, exec) => sum + getExecutiveTodayTotal(exec.members), 0);
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

  // Handle add creator
  const handleAddCreator = () => {
    if (!selectedMemberForCreator || !newCreatorName.trim()) return;
    addCreator(selectedMemberForCreator, newCreatorName, false);
    setNewCreatorName('');
    setShowAddCreatorDialog(false);
  };

  // Handle add creator today
  const handleAddCreatorToday = () => {
    if (!selectedMemberForCreator || !newCreatorName.trim()) return;
    addCreator(selectedMemberForCreator, newCreatorName, true);
    setNewCreatorName('');
    setShowAddCreatorTodayDialog(false);
  };

  // Get all members flat
  const allMembers = useMemo(() => {
    return teamStructure.flatMap(exec => exec.members);
  }, [teamStructure]);

  // Export PDF
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
      const pdf = new jsPDF({ 
        orientation: 'portrait', 
        unit: 'mm', 
        format: 'a4' 
      });
      
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

      <main className="p-4">
        {/* Last Updated Banner */}
        <Card className="mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div className="text-center">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Última atualização: {lastUpdated 
                    ? format(new Date(lastUpdated), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                    : 'Nunca salvo'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4">
                <Users className="h-10 w-10 text-purple-500" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total de Criadores em Análise</p>
                  <p className="text-4xl font-bold">{getGrandTotal()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4">
                <UserPlus className="h-10 w-10 text-emerald-500" />
                <div className="text-center">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Criadores Hoje</p>
                  <p className="text-4xl font-bold text-emerald-600">{getGrandTodayTotal()}</p>
                </div>
              </div>
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

          {/* Add Creator Dialog */}
          <Dialog open={showAddCreatorDialog} onOpenChange={setShowAddCreatorDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-purple-100 hover:bg-purple-200 border-purple-300">
                <UserPlus className="h-4 w-4 mr-2 text-purple-600" />
                Adicionar Criador
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Adicionar Criador em Análise</DialogTitle>
              </DialogHeader>
              <Select value={selectedMemberForCreator} onValueChange={setSelectedMemberForCreator}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o associado" />
                </SelectTrigger>
                <SelectContent className="bg-card border z-50">
                  {allMembers.map(member => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nome do criador"
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCreator()}
              />
              <DialogFooter>
                <Button onClick={handleAddCreator}>Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Creator Today Dialog */}
          <Dialog open={showAddCreatorTodayDialog} onOpenChange={setShowAddCreatorTodayDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-emerald-100 hover:bg-emerald-200 border-emerald-300">
                <UserPlus className="h-4 w-4 mr-2 text-emerald-600" />
                Adicionar Criador Hoje
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Adicionar Criador de Hoje</DialogTitle>
              </DialogHeader>
              <Select value={selectedMemberForCreator} onValueChange={setSelectedMemberForCreator}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione o associado" />
                </SelectTrigger>
                <SelectContent className="bg-card border z-50">
                  {allMembers.map(member => (
                    <SelectItem key={member} value={member}>
                      {member}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nome do criador"
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCreatorToday()}
              />
              <DialogFooter>
                <Button onClick={handleAddCreatorToday} className="bg-emerald-600 hover:bg-emerald-700">Adicionar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Panel */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">EXECUTIVO / ASSOCIADO</th>
                    <th className="text-center px-4 py-3 font-medium w-24">TOTAL</th>
                    <th className="text-center px-4 py-3 font-medium w-24 bg-emerald-100 dark:bg-emerald-900/30">HOJE</th>
                    <th className="text-left px-4 py-3 font-medium">CRIADORES EM ANÁLISE</th>
                    <th className="text-left px-4 py-3 font-medium bg-emerald-100 dark:bg-emerald-900/30">CRIADORES HOJE</th>
                    <th className="text-center px-4 py-3 font-medium w-16">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStructure.map((exec) => {
                    const execTotal = getExecutiveTotal(exec.members);
                    const execTodayTotal = getExecutiveTodayTotal(exec.members);
                    
                    return (
                      <React.Fragment key={exec.executive}>
                        {/* Executive Header */}
                        <tr className="bg-purple-900 text-white group">
                          <td className="px-4 py-3 font-bold">
                            <div className="flex items-center gap-2">
                              <span className="text-red-400">🔴</span>
                              {exec.executive}
                            </div>
                          </td>
                          <td className="text-center font-bold text-lg">{execTotal}</td>
                          <td className="text-center font-bold text-lg bg-emerald-800">{execTodayTotal}</td>
                          <td></td>
                          <td className="bg-emerald-800"></td>
                          <td className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                              onClick={() => handleRemoveExecutive(exec.executive)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        
                        {/* Members */}
                        {exec.members.map(member => {
                          const creators = getCreators(member);
                          const creatorsToday = getCreatorsToday(member);
                          
                          return (
                            <tr key={member} className="border-b border-border/50 hover:bg-muted/30 group">
                              <td className="px-4 py-2 pl-10 text-sm font-medium">{member}</td>
                              <td className="text-center font-bold text-lg">{creators.length}</td>
                              <td className="text-center font-bold text-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">{creatorsToday.length}</td>
                              <td className="px-2 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {creators.map((creator, idx) => (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-xs group/tag"
                                    >
                                      {creator}
                                      <button 
                                        onClick={() => removeCreator(member, idx, false)}
                                        className="opacity-0 group-hover/tag:opacity-100 hover:text-red-500"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-2 bg-emerald-50 dark:bg-emerald-900/20">
                                <div className="flex flex-wrap gap-1">
                                  {creatorsToday.map((creator, idx) => (
                                    <span 
                                      key={idx} 
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded text-xs group/tag"
                                    >
                                      {creator}
                                      <button 
                                        onClick={() => removeCreator(member, idx, true)}
                                        className="opacity-0 group-hover/tag:opacity-100 hover:text-red-500"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                                  onClick={() => handleRemoveAssociate(exec.executive, member)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Grand Total */}
                  <tr className="bg-muted font-bold border-t-2">
                    <td className="px-4 py-3">TOTAL GERAL</td>
                    <td className="text-center text-xl">{getGrandTotal()}</td>
                    <td className="text-center text-xl text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">{getGrandTodayTotal()}</td>
                    <td></td>
                    <td className="bg-emerald-100 dark:bg-emerald-900/30"></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Hidden Report for PDF Export */}
        <div className="fixed -left-[9999px] top-0">
          <div ref={reportRef} className="bg-[#fafafa] p-8 w-[800px]" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
              <div className="flex items-center gap-4">
                <img src={curliLogo} alt="Curli Logo" className="h-12 w-auto" />
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-800">📊 PAINEL DE CRIADORES EM ANÁLISE</h1>
                <p className="text-sm text-gray-600">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Last Updated */}
            <div className="mb-4 p-3 bg-amber-100 rounded-lg text-center">
              <p className="text-sm font-medium text-amber-800">
                ⏰ Última atualização: {lastUpdated 
                  ? format(new Date(lastUpdated), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                  : 'Nunca salvo'}
              </p>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-400 mb-6"></div>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-purple-100 rounded-lg">
                <h2 className="text-lg font-bold text-gray-800 mb-2">📈 RESUMO GERAL:</h2>
                <p className="text-2xl font-bold text-purple-800 ml-4">Total de Criadores: {getGrandTotal()}</p>
              </div>
              <div className="p-4 bg-emerald-100 rounded-lg">
                <h2 className="text-lg font-bold text-gray-800 mb-2">🆕 CRIADORES HOJE:</h2>
                <p className="text-2xl font-bold text-emerald-800 ml-4">Total Hoje: {getGrandTodayTotal()}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-400 mb-6"></div>

            {/* Analysis by Executive */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">👥 ANÁLISE POR EXECUTIVO:</h2>
              
              {teamStructure.map((exec) => {
                const execTotal = getExecutiveTotal(exec.members);
                const execTodayTotal = getExecutiveTodayTotal(exec.members);
                
                return (
                  <div key={exec.executive} className="mb-4 ml-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-500">🔴</span>
                      <span className="font-bold text-gray-800">{exec.executive}</span>
                    </div>
                    <p className="ml-6 text-sm text-gray-700 mb-1">
                      Total: {execTotal} criadores | Hoje: {execTodayTotal}
                    </p>
                    <div className="ml-10 space-y-1">
                      {exec.members.map(member => {
                        const creators = getCreators(member);
                        const creatorsToday = getCreatorsToday(member);
                        return (
                          <div key={member} className="text-sm text-gray-600">
                            <span className="font-medium">{member}:</span> {creators.length}
                            {creatorsToday.length > 0 && (
                              <span className="text-emerald-600 ml-2">(+{creatorsToday.length} hoje)</span>
                            )}
                            {creators.length > 0 && (
                              <div className="ml-4 text-xs text-gray-500">
                                {creators.join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreatorsAnalysisDashboard;
