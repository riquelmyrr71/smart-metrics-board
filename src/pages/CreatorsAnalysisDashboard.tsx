import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Home, 
  FileText, 
  Plus, 
  Trash2,
  Loader2,
  UserSearch
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
  [memberName: string]: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [teamStructure, setTeamStructure] = useState<TeamStructure[]>(DEFAULT_TEAM_STRUCTURE);
  const [newExecutiveName, setNewExecutiveName] = useState('');
  const [newAssociateName, setNewAssociateName] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [showExecutiveDialog, setShowExecutiveDialog] = useState(false);
  const [showAssociateDialog, setShowAssociateDialog] = useState(false);
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
          const parsed = data.data as { creatorsData?: CreatorsData; teamStructure?: TeamStructure[] };
          if (parsed.creatorsData) setCreatorsData(parsed.creatorsData);
          if (parsed.teamStructure) setTeamStructure(parsed.teamStructure);
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
        id: CREATORS_DATA_ID,
        data: { creatorsData, teamStructure } as unknown as import('@/integrations/supabase/types').Json,
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

  // Get creator count for a member
  const getCreatorCount = (member: string): number => {
    return creatorsData[member] || 0;
  };

  // Set creator count
  const setCreatorCount = (member: string, count: number) => {
    setCreatorsData(prev => ({
      ...prev,
      [member]: Math.max(0, count),
    }));
  };

  // Calculate executive total
  const getExecutiveTotal = (members: string[]): number => {
    return members.reduce((sum, member) => sum + getCreatorCount(member), 0);
  };

  // Calculate grand total
  const getGrandTotal = (): number => {
    return teamStructure.reduce((sum, exec) => sum + getExecutiveTotal(exec.members), 0);
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
        {/* Summary Card */}
        <Card className="mb-6">
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

        {/* Main Panel */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">EXECUTIVO / ASSOCIADO</th>
                    <th className="text-center px-4 py-3 font-medium w-40">CRIADORES</th>
                    <th className="text-center px-4 py-3 font-medium w-20">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStructure.map((exec) => {
                    const execTotal = getExecutiveTotal(exec.members);
                    
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
                          const count = getCreatorCount(member);
                          
                          return (
                            <tr key={member} className="border-b border-border/50 hover:bg-muted/30 group">
                              <td className="px-4 py-2 pl-10 text-sm">{member}</td>
                              <td className="text-center px-2">
                                <Input
                                  type="number"
                                  min={0}
                                  value={count}
                                  onChange={(e) => setCreatorCount(member, parseInt(e.target.value) || 0)}
                                  className="h-8 w-20 mx-auto text-center text-sm font-medium"
                                />
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

            {/* Divider */}
            <div className="border-b border-gray-400 mb-6"></div>

            {/* Summary */}
            <div className="mb-6 p-4 bg-purple-100 rounded-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-2">📈 RESUMO GERAL:</h2>
              <p className="text-2xl font-bold text-purple-800 ml-4">Total de Criadores: {getGrandTotal()}</p>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-400 mb-6"></div>

            {/* Analysis by Executive */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">👥 ANÁLISE POR EXECUTIVO:</h2>
              
              {teamStructure.map((exec) => {
                const execTotal = getExecutiveTotal(exec.members);
                
                return (
                  <div key={exec.executive} className="mb-4 ml-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-500">🔴</span>
                      <span className="font-bold text-gray-800">{exec.executive}</span>
                    </div>
                    <p className="ml-6 text-sm text-gray-700 mb-1">Total: {execTotal} criadores</p>
                    <div className="ml-10 space-y-1">
                      {exec.members.map(member => (
                        <p key={member} className="text-sm text-gray-600">
                          {member}: {getCreatorCount(member)}
                        </p>
                      ))}
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
