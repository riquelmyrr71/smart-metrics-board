import React, { useCallback, useEffect, useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardTable } from './DashboardTable';
import { PeriodSettingsPanel } from './PeriodSettings';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useDashboardPersistence } from '@/hooks/useDashboardPersistence';
import { exportToCSV, downloadCSV, downloadPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { initialDashboardData } from '@/data/dashboardData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Copy, Check } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    columns,
    columnGroups,
    rows,
    settings,
    periodSettings,
    editingCell,
    setEditingCell,
    selectedCells,
    setSelectedCells,
    updateCell,
    undo,
    redo,
    updateSettings,
    updatePeriodSettings,
    canUndo,
    canRedo,
    getFormulaEngine,
    initializeData,
    addMember,
    deleteMember,
  } = useDashboardState();

  const { saveDashboard, loadDashboard, isSaving, lastSaved } = useDashboardPersistence();
  
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize with saved data or sample data
  useEffect(() => {
    const initData = async () => {
      if (initialized || rows.length > 0) return;
      
      const savedData = await loadDashboard();
      if (savedData) {
        initializeData({
          columns: savedData.columns,
          columnGroups: savedData.columnGroups,
          rows: savedData.rows,
        });
        if (savedData.settings) {
          updateSettings(savedData.settings);
        }
        if (savedData.periodSettings) {
          updatePeriodSettings(savedData.periodSettings);
        }
        toast.success('Dados carregados do banco de dados');
      } else {
        initializeData(initialDashboardData);
      }
      setInitialized(true);
    };
    
    initData();
  }, [initialized, rows.length, initializeData, loadDashboard, updateSettings, updatePeriodSettings]);

  const handleSave = useCallback(async () => {
    await saveDashboard({
      rows,
      columns,
      columnGroups,
      settings,
      periodSettings,
    });
  }, [saveDashboard, rows, columns, columnGroups, settings, periodSettings]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
        toast.info('Alteração desfeita');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        toast.info('Alteração refeita');
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  const handleCellEdit = useCallback((rowId: string, columnId: string, value: string, isFormula?: boolean) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return;
    
    let parsedValue: string | number = value;
    let formula: string | undefined = isFormula ? value : undefined;
    
    if (!isFormula) {
      // Parse based on column type
      if (column.type === 'percentage') {
        // Handle percentage input
        const cleanValue = value.replace('%', '').trim();
        parsedValue = parseFloat(cleanValue);
        if (isNaN(parsedValue)) {
          toast.error('Valor inválido para porcentagem');
          return;
        }
        // Store as decimal
        parsedValue = parsedValue / 100;
      } else if (column.type === 'number' || column.type === 'currency') {
        const cleanValue = value.replace(/[^\d.,-]/g, '').replace(',', '.');
        parsedValue = parseFloat(cleanValue);
        if (isNaN(parsedValue)) {
          toast.error('Valor numérico inválido');
          return;
        }
      }
    }
    
    updateCell(rowId, columnId, {
      raw: parsedValue,
      formula,
      type: column.type,
    });
    
    toast.success('Célula atualizada - projeções recalculadas');
  }, [columns, updateCell]);
  
  const handleExportCSV = useCallback(() => {
    const content = exportToCSV(rows, columns, columnGroups, settings, false);
    downloadCSV(content, 'painel-performance.csv');
    toast.success('CSV exportado com sucesso');
  }, [rows, columns, columnGroups, settings]);
  
  const handleExportPDF = useCallback(() => {
    downloadPDF(rows, columns, columnGroups, settings, 'Painel de Performance');
    toast.success('PDF gerado - use Ctrl+P para salvar');
  }, [rows, columns, columnGroups, settings]);
  
  const handleShare = useCallback(() => {
    setShareDialogOpen(true);
  }, []);
  
  const handleCopyLink = useCallback(async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=true&permission=${sharePermission}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado para a área de transferência');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  }, [sharePermission]);
  
  const handleToggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const handleAddMember = useCallback((sectionId: string) => {
    addMember(sectionId);
    toast.success('Novo membro adicionado');
  }, [addMember]);

  const handleDeleteMember = useCallback((rowId: string) => {
    deleteMember(rowId);
    toast.success('Membro removido');
  }, [deleteMember]);
  
  const handlePaste = useCallback((rowId: string, columnId: string, data: string[][]) => {
    // Find starting position
    const rowIndex = rows.findIndex(r => r.id === rowId && r.type === 'data');
    const colIndex = columns.findIndex(c => c.id === columnId);
    
    if (rowIndex === -1 || colIndex === -1) return;
    
    const dataRows = rows.filter(r => r.type === 'data');
    
    data.forEach((rowData, dRow) => {
      const targetRowIndex = rowIndex + dRow;
      if (targetRowIndex >= dataRows.length) return;
      
      const targetRow = dataRows[targetRowIndex];
      
      rowData.forEach((cellValue, dCol) => {
        const targetColIndex = colIndex + dCol;
        if (targetColIndex >= columns.length) return;
        
        const targetCol = columns[targetColIndex];
        if (targetCol.editable === false) return;
        
        handleCellEdit(targetRow.id, targetCol.id, cellValue.trim());
      });
    });
    
    toast.success(`${data.length} linha(s) coladas`);
  }, [rows, columns, handleCellEdit]);
  
  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      <DashboardHeader
        title="Painel de Performance"
        settings={settings}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onUndo={undo}
        onRedo={redo}
        onExportCSV={handleExportCSV}
        onExportPDF={handleExportPDF}
        onShare={handleShare}
        onSave={handleSave}
        onSettingsChange={updateSettings}
      />
      
      <main className="flex-1 overflow-hidden p-2 sm:p-4">
        {/* Period Settings */}
        <PeriodSettingsPanel
          settings={periodSettings}
          onSettingsChange={updatePeriodSettings}
        />
        
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
          <DashboardTable
            columns={columns}
            columnGroups={columnGroups}
            rows={rows}
            settings={settings}
            editingCell={editingCell}
            selectedCells={selectedCells}
            formulaEngine={getFormulaEngine()}
            collapsedSections={collapsedSections}
            onCellEdit={handleCellEdit}
            onStartEdit={setEditingCell}
            onEndEdit={() => setEditingCell(null)}
            onSelectCell={(key) => setSelectedCells(new Set([key]))}
            onToggleSection={handleToggleSection}
            onPaste={handlePaste}
            onAddMember={handleAddMember}
            onDeleteMember={handleDeleteMember}
          />
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-success" />
            <span>≥80%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-warning" />
            <span>50-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-destructive" />
            <span>&lt;50%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-dashboard-over100" />
            <span>&gt;100% (destaque)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 relative">
              <div className="formula-indicator" />
            </div>
            <span>Célula com fórmula</span>
          </div>
        </div>
        
        {/* Formula explanation */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Fórmulas de cálculo:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Projeção</strong> = (Valor Atual ÷ Dias Decorridos) × Total de Dias do Período</li>
            <li><strong>ATG %</strong> = (Valor Atual ÷ Meta) × 100</li>
            <li><strong>ATG PROJ.%</strong> = (Projeção ÷ Meta) × 100</li>
          </ul>
        </div>
      </main>
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Painel</DialogTitle>
            <DialogDescription>
              Gere um link para compartilhar este painel com outras pessoas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Permissão</Label>
              <RadioGroup value={sharePermission} onValueChange={(v) => setSharePermission(v as 'view' | 'edit')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="view" id="view" />
                  <Label htmlFor="view" className="font-normal">Somente visualização</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="edit" id="edit" />
                  <Label htmlFor="edit" className="font-normal">Pode editar</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}?share=true&permission=${sharePermission}`}
                  className="font-mono text-xs"
                />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
