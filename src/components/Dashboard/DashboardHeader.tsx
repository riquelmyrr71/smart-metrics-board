import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  FileText,
  Undo2,
  Redo2,
  Share2,
  Settings,
  HelpCircle,
  Calculator,
  Save,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
  BarChart3,
  StickyNote,
  CalendarDays,
  Swords,
  UserSearch,
  LayoutDashboard,
} from 'lucide-react';
import { DashboardSettings } from '@/types/dashboard';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface DashboardHeaderProps {
  title: string;
  settings: DashboardSettings;
  canUndo: boolean;
  canRedo: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  showIncrementControls: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onShare: () => void;
  onSave: () => void;
  onReset: () => void;
  onSettingsChange: (settings: Partial<DashboardSettings>) => void;
  onToggleIncrementControls: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  settings,
  canUndo,
  canRedo,
  isSaving = false,
  lastSaved,
  showIncrementControls,
  onUndo,
  onRedo,
  onExportCSV,
  onExportPDF,
  onShare,
  onSave,
  onReset,
  onSettingsChange,
  onToggleIncrementControls,
}) => {
  const formatLastSaved = (date: Date | null | undefined) => {
    if (!date) return null;
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  return (
    <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-20 table-header-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm">
              <div className="text-sm space-y-2">
                <p><strong>Atalhos de teclado:</strong></p>
                <ul className="text-xs space-y-1">
                  <li><kbd className="px-1 bg-muted rounded">Enter</kbd> - Salvar e mover para baixo</li>
                  <li><kbd className="px-1 bg-muted rounded">Tab</kbd> - Salvar e mover para direita</li>
                  <li><kbd className="px-1 bg-muted rounded">Shift+Tab</kbd> - Mover para esquerda</li>
                  <li><kbd className="px-1 bg-muted rounded">Esc</kbd> - Cancelar edição</li>
                  <li><kbd className="px-1 bg-muted rounded">Ctrl+Z</kbd> - Desfazer</li>
                  <li><kbd className="px-1 bg-muted rounded">Ctrl+Y</kbd> - Refazer</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Clique duplo em uma célula para editar. Use = para fórmulas.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Overview Dashboard Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/overview">
                <Button variant="default" size="sm" className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Overview Mensal</TooltipContent>
          </Tooltip>

          {/* Charts Dashboard Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/graficos">
                <Button variant="outline" size="sm" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Gráficos</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Dashboard de Gráficos</TooltipContent>
          </Tooltip>

          {/* Notes Page Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/anotacoes">
                <Button variant="outline" size="sm" className="gap-2">
                  <StickyNote className="w-4 h-4" />
                  <span className="hidden sm:inline">Anotações</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Página de Anotações</TooltipContent>
          </Tooltip>

          {/* Scheduling Dashboard Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/agendamentos">
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Agendamentos</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Agendamento de Lives</TooltipContent>
          </Tooltip>

          {/* Battles Dashboard Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/batalhas">
                <Button variant="outline" size="sm" className="gap-2">
                  <Swords className="w-4 h-4" />
                  <span className="hidden sm:inline">Batalhas</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Painel de Batalhas</TooltipContent>
          </Tooltip>

          {/* Creators Analysis Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/criadores-analise">
                <Button variant="outline" size="sm" className="gap-2">
                  <UserSearch className="w-4 h-4" />
                  <span className="hidden sm:inline">Análise</span>
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Criadores em Análise</TooltipContent>
          </Tooltip>

          {/* Toggle increment controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showIncrementControls ? "default" : "outline"}
                size="sm"
                onClick={onToggleIncrementControls}
                className="gap-2"
              >
                {showIncrementControls ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">+/-</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showIncrementControls ? 'Ocultar controles de incremento' : 'Mostrar controles de incremento'}
            </TooltipContent>
          </Tooltip>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onUndo}
                  disabled={!canUndo}
                  aria-label="Desfazer"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRedo}
                  disabled={!canRedo}
                  aria-label="Refazer"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
          
          {/* Save button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Salvar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {lastSaved ? `Último: ${formatLastSaved(lastSaved)}` : 'Salvar alterações'}
            </TooltipContent>
          </Tooltip>

          {/* Export buttons */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar para CSV</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPDF}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Exportar para PDF</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Compartilhar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Compartilhar link</TooltipContent>
          </Tooltip>
          
          {/* Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Configurações</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Configurações do Painel</SheetTitle>
                <SheetDescription>
                  Ajuste as configurações de cálculo e exibição
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Decimal places */}
                <div className="space-y-2">
                  <Label>Casas decimais</Label>
                  <Select
                    value={String(settings.decimalPlaces)}
                    onValueChange={(v) => onSettingsChange({ decimalPlaces: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 casas</SelectItem>
                      <SelectItem value="1">1 casa</SelectItem>
                      <SelectItem value="2">2 casas</SelectItem>
                      <SelectItem value="3">3 casas</SelectItem>
                      <SelectItem value="4">4 casas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Projection formula */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Fórmula de projeção
                  </Label>
                  <Select
                    value={settings.projectionFormula}
                    onValueChange={(v) => onSettingsChange({ projectionFormula: v as 'compound' | 'linear' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compound">
                        Composta: next = current × (1 + rate)
                      </SelectItem>
                      <SelectItem value="linear">
                        Linear: next = current + incremento
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define como as projeções automáticas são calculadas
                  </p>
                </div>
                
                {/* Cap at 100% */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Limitar a 100%</Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar "100%+" para valores acima
                    </p>
                  </div>
                  <Switch
                    checked={settings.capPercentAt100}
                    onCheckedChange={(v) => onSettingsChange({ capPercentAt100: v })}
                  />
                </div>
                
                {/* Highlight over 100% */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Destacar &gt;100%</Label>
                    <p className="text-xs text-muted-foreground">
                      Aplicar formatação especial para valores acima de 100%
                    </p>
                  </div>
                  <Switch
                    checked={settings.highlightOver100}
                    onCheckedChange={(v) => onSettingsChange({ highlightOver100: v })}
                  />
                </div>
                
                {/* Show formulas */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar fórmulas</Label>
                    <p className="text-xs text-muted-foreground">
                      Exibir fórmulas ao invés de valores calculados
                    </p>
                  </div>
                  <Switch
                    checked={settings.showFormulas}
                    onCheckedChange={(v) => onSettingsChange({ showFormulas: v })}
                  />
                </div>

                {/* Reset Dashboard */}
                <div className="pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label className="text-destructive">Resetar Dashboard</Label>
                    <p className="text-xs text-muted-foreground">
                      Apaga todos os dados salvos e recarrega com a estrutura inicial (inclui novos executivos)
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={onReset}
                      className="gap-2 w-full"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resetar para dados iniciais
                    </Button>
                  </div>
                </div>
                
                {/* Documentation */}
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-2">Documentação</h4>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong>Fórmulas globais:</strong> Acesse Configurações para alternar
                      entre fórmula composta e linear para projeções automáticas.
                    </p>
                    <p>
                      <strong>Cap de 100%:</strong> Ative "Limitar a 100%" para exibir
                      "100%+" quando valores excederem 100%. Por padrão, valores são
                      mostrados como estão (ex: 120%).
                    </p>
                    <p>
                      <strong>Fórmulas personalizadas:</strong> Use = no início de uma
                      célula para criar fórmulas. Ex: =A1*(1+B1)
                    </p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
