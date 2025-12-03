import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Column, Row, ColumnGroup, DashboardSettings, Cell } from '@/types/dashboard';
import { EditableCell } from './EditableCell';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ChevronDown, ChevronRight, Plus, Trash2, ChevronUp } from 'lucide-react';
import { FormulaEngine } from '@/lib/formulaEngine';
import { Button } from '@/components/ui/button';

interface DashboardTableProps {
  columns: Column[];
  columnGroups: ColumnGroup[];
  rows: Row[];
  settings: DashboardSettings;
  editingCell: string | null;
  selectedCells: Set<string>;
  formulaEngine: FormulaEngine | null;
  collapsedSections: Set<string>;
  showIncrementControls: boolean;
  onCellEdit: (rowId: string, columnId: string, value: string, isFormula?: boolean) => void;
  onStartEdit: (cellKey: string) => void;
  onEndEdit: () => void;
  onSelectCell: (cellKey: string) => void;
  onToggleSection: (sectionId: string) => void;
  onPaste: (rowId: string, columnId: string, data: string[][]) => void;
  onAddMember: (sectionId: string) => void;
  onDeleteMember: (rowId: string) => void;
  onIncrement: (rowId: string, columnId: string, delta: number) => void;
}

export const DashboardTable: React.FC<DashboardTableProps> = ({
  columns,
  columnGroups,
  rows,
  settings,
  editingCell,
  selectedCells,
  formulaEngine,
  collapsedSections,
  showIncrementControls,
  onCellEdit,
  onStartEdit,
  onEndEdit,
  onSelectCell,
  onToggleSection,
  onPaste,
  onAddMember,
  onDeleteMember,
  onIncrement,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  
  const getCellKey = (rowId: string, columnId: string) => `${rowId}-${columnId}`;
  
  // Keyboard navigation
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!focusedCell) return;
    
    const dataRows = rows.filter(r => r.type === 'data');
    const editableColumns = columns.filter(c => c.editable !== false);
    
    let newRowIndex = focusedCell.rowIndex;
    let newColIndex = focusedCell.colIndex;
    
    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, newRowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(dataRows.length - 1, newRowIndex + 1);
        break;
      case 'left':
        newColIndex = Math.max(0, newColIndex - 1);
        break;
      case 'right':
        newColIndex = Math.min(editableColumns.length - 1, newColIndex + 1);
        break;
    }
    
    setFocusedCell({ rowIndex: newRowIndex, colIndex: newColIndex });
    
    const row = dataRows[newRowIndex];
    const col = editableColumns[newColIndex];
    if (row && col) {
      onSelectCell(getCellKey(row.id, col.id));
    }
  }, [focusedCell, rows, columns, onSelectCell]);
  
  // Handle paste from Excel
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!focusedCell || editingCell) return;
      
      const clipboardData = e.clipboardData?.getData('text/plain');
      if (!clipboardData) return;
      
      e.preventDefault();
      
      const lines = clipboardData.trim().split(/\r?\n/).map(line => 
        line.includes('\t') ? line.split('\t') : line.split(',')
      );
      
      const dataRows = rows.filter(r => r.type === 'data');
      const editableColumns = columns.filter(c => c.editable !== false);
      const row = dataRows[focusedCell.rowIndex];
      const col = editableColumns[focusedCell.colIndex];
      
      if (row && col) {
        onPaste(row.id, col.id, lines);
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [focusedCell, editingCell, rows, columns, onPaste]);
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        // Undo is handled by parent
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        // Redo is handled by parent
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const isOver100 = (cell: Cell): boolean => {
    if (!formulaEngine || cell.value.type !== 'percentage') return false;
    return formulaEngine.isOver100Percent(cell.value);
  };
  
  const getTrend = (cell: Cell, row: Row, colIndex: number): '↑' | '↓' | '→' | undefined => {
    if (!formulaEngine || colIndex === 0) return undefined;
    
    const prevCol = columns[colIndex - 1];
    if (!prevCol || prevCol.type !== columns[colIndex]?.type) return undefined;
    
    const prevCell = row.cells[prevCol.id];
    if (!prevCell) return undefined;
    
    const current = formulaEngine.getCellNumericValue(cell);
    const previous = formulaEngine.getCellNumericValue(prevCell);
    
    return formulaEngine.getTrendIndicator(current, previous);
  };
  
  const getProgressValue = (cell: Cell): number | undefined => {
    if (cell.value.type !== 'percentage') return undefined;
    
    const numValue = typeof cell.value.raw === 'number' 
      ? cell.value.raw 
      : parseFloat(String(cell.value.raw));
    
    // Convert to 0-100 scale
    if (Math.abs(numValue) <= 2) {
      return numValue * 100;
    }
    return numValue;
  };
  
  // Calculate achievement progress for REC ATUAL and DIAMANTES ATUAIS columns
  const getAchievementProgress = (row: Row, columnId: string): number | undefined => {
    // For REC ATUAL, compare with META
    if (columnId === 'rec_atual') {
      const recAtualCell = row.cells['rec_atual'];
      const metaCell = row.cells['meta'];
      if (!recAtualCell || !metaCell) return undefined;
      
      const recAtual = typeof recAtualCell.value.raw === 'number' 
        ? recAtualCell.value.raw 
        : parseFloat(String(recAtualCell.value.raw)) || 0;
      const meta = typeof metaCell.value.raw === 'number' 
        ? metaCell.value.raw 
        : parseFloat(String(metaCell.value.raw)) || 0;
      
      if (meta <= 0) return 0;
      return Math.min((recAtual / meta) * 100, 100);
    }
    
    // For DIAMANTES ATUAIS, compare with META DE DIAMANTES
    if (columnId === 'diamantes_atuais') {
      const diamantesCell = row.cells['diamantes_atuais'];
      const metaDiamantesCell = row.cells['meta_diamantes'];
      if (!diamantesCell || !metaDiamantesCell) return undefined;
      
      const diamantes = typeof diamantesCell.value.raw === 'number' 
        ? diamantesCell.value.raw 
        : parseFloat(String(diamantesCell.value.raw)) || 0;
      const metaDiamantes = typeof metaDiamantesCell.value.raw === 'number' 
        ? metaDiamantesCell.value.raw 
        : parseFloat(String(metaDiamantesCell.value.raw)) || 0;
      
      if (metaDiamantes <= 0) return 0;
      return Math.min((diamantes / metaDiamantes) * 100, 100);
    }
    
    return undefined;
  };
  
  // Get progress bar color based on percentage
  const getProgressBarColor = (percentage: number): string => {
    if (percentage < 30) return 'bg-red-500/30';
    if (percentage < 50) return 'bg-yellow-500/30';
    if (percentage === 50) return 'bg-orange-500/30';
    if (percentage <= 80) return 'bg-sky-400/30';
    return 'bg-green-500/30';
  };
  
  const visibleRows = rows.filter(row => {
    if (row.type === 'section-header') return true;
    if (!row.sectionId) return true;
    return !collapsedSections.has(row.sectionId);
  });
  
  // Get column background color based on group
  const getColumnBgClass = (columnId: string, isHeader: boolean = false) => {
    const col = columns.find(c => c.id === columnId);
    if (!col) return '';
    
    if (col.group === 'recrutamento') {
      return isHeader ? 'bg-dashboard-col-recruitment-header' : 'bg-dashboard-col-recruitment';
    }
    if (col.group === 'diamantes') {
      return isHeader ? 'bg-dashboard-col-diamonds-header' : 'bg-dashboard-col-diamonds';
    }
    return '';
  };
  
  // Group columns for header rendering
  const renderColumnGroups = () => {
    if (columnGroups.length === 0) return null;
    
    return (
      <tr>
        {columnGroups.map(group => {
          const bgClass = group.id === 'recrutamento' 
            ? 'bg-dashboard-col-recruitment-header' 
            : group.id === 'diamantes' 
              ? 'bg-dashboard-col-diamonds-header' 
              : 'bg-secondary';
          
          return (
            <th
              key={group.id}
              colSpan={group.columns.length}
              className={cn(
                'text-foreground px-0.5 py-1 text-center font-semibold text-sm uppercase tracking-wider border-r border-dashboard-cell-border',
                bgClass
              )}
            >
              {group.name}
            </th>
          );
        })}
      </tr>
    );
  };
  
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table
        ref={tableRef}
        className="w-full border-collapse text-base"
        role="grid"
        aria-label="Painel de Performance"
      >
        <thead className="sticky top-0 z-10">
          {renderColumnGroups()}
          <tr>
            {columns.map((col, colIndex) => {
              const headerBgClass = col.group === 'recrutamento' 
                ? 'bg-dashboard-col-recruitment-header' 
                : col.group === 'diamantes' 
                  ? 'bg-dashboard-col-diamonds-header' 
                  : 'bg-dashboard-header text-dashboard-header-text';
              
              return (
              <th
                key={col.id}
                className={cn(
                  'px-0.5 py-1 font-semibold text-sm border-r border-dashboard-cell-border whitespace-nowrap',
                  headerBgClass,
                  col.group !== 'info' && 'text-foreground',
                  col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'
                )}
                style={{ minWidth: col.width || 80 }}
              >
                <div className="flex items-center gap-1">
                  {col.align === 'left' ? null : <span className="flex-1" />}
                  <span>{col.name}</span>
                  {col.tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 opacity-70 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{col.tooltip}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </th>
            );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => {
            // Section header row
            if (row.type === 'section-header') {
              const firstCell = Object.values(row.cells)[0];
              const sectionId = row.sectionId || row.id;
              const isCollapsed = collapsedSections.has(sectionId);
              
              return (
                <tr key={row.id} className="bg-secondary group">
                  <td
                    colSpan={columns.length}
                    className="px-0.5 py-0.5 font-bold text-secondary-foreground cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => onToggleSection(sectionId)}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                        <span className="text-base tracking-wide">{firstCell?.value.raw || 'Seção'}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-50 hover:!opacity-100 h-6 w-6 p-0 transition-opacity absolute right-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMember(sectionId);
                        }}
                        title="Adicionar membro"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            }
            
            // Subtotal row
            if (row.type === 'subtotal') {
              return (
                <tr key={row.id} className="font-semibold">
                  {columns.map((col, colIndex) => {
                    const cell = row.cells[col.id];
                    const displayValue = cell?.value.displayValue || String(cell?.value.raw || '-');
                    const subtotalBgClass = col.group === 'recrutamento' 
                      ? 'bg-dashboard-col-recruitment-header' 
                      : col.group === 'diamantes' 
                        ? 'bg-dashboard-col-diamonds-header' 
                        : 'bg-dashboard-subtotal text-dashboard-header-text';
                    
                    return (
                      <td
                        key={col.id}
                        className={cn(
                          'px-0.5 py-0.5 border-r border-dashboard-cell-border/50',
                          subtotalBgClass,
                          col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right',
                          (col.type === 'number' || col.type === 'percentage' || col.type === 'currency') && 'font-mono-numbers'
                        )}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              );
            }
            
            // Total row
            if (row.type === 'total') {
              return (
                <tr key={row.id} className="bg-dashboard-total text-dashboard-header-text font-bold">
                  {columns.map((col, colIndex) => {
                    const cell = row.cells[col.id];
                    const displayValue = cell?.value.displayValue || String(cell?.value.raw || '-');
                    
                    return (
                      <td
                        key={col.id}
                        className={cn(
                          'px-0.5 py-0.5 border-r border-dashboard-cell-border/50',
                          col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right',
                          (col.type === 'number' || col.type === 'percentage' || col.type === 'currency') && 'font-mono-numbers'
                        )}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              );
            }
            
            // Data row
            const dataRowIndex = rows.filter(r => r.type === 'data').indexOf(row);
            
            return (
              <tr
                key={row.id}
                className={cn(
                  rowIndex % 2 === 0 ? 'bg-dashboard-row-even' : 'bg-dashboard-row-odd',
                  'hover:bg-accent/5 transition-colors group'
                )}
              >
                {columns.map((col, colIndex) => {
                  const cell = row.cells[col.id];
                  const cellBgClass = getColumnBgClass(col.id);
                  
                  if (!cell) {
                    return (
                      <td key={col.id} className={cn("px-0.5 py-0 border-r border-dashboard-cell-border", cellBgClass)}>
                        -
                      </td>
                    );
                  }
                  
                  const cellKey = getCellKey(row.id, col.id);
                  const isEditing = editingCell === cellKey;
                  const isSelected = selectedCells.has(cellKey);
                  const cellIsOver100 = isOver100(cell);
                  const trend = col.type === 'percentage' ? getTrend(cell, row, colIndex) : undefined;
                  const progressValue = col.type === 'percentage' ? getProgressValue(cell) : undefined;
                  const isTeamColumn = col.id === 'team';
                  const isRecAtualColumn = col.id === 'rec_atual';
                  const isDiamantesAtualColumn = col.id === 'diamantes_atuais';
                  const achievementProgress = getAchievementProgress(row, col.id);
                  const showAchievementBar = (isRecAtualColumn || isDiamantesAtualColumn) && achievementProgress !== undefined;
                  
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        'border-r border-dashboard-cell-border p-0 relative',
                        cellBgClass,
                      )}
                      onClick={() => {
                        setFocusedCell({ rowIndex: dataRowIndex, colIndex });
                        onSelectCell(cellKey);
                      }}
                    >
                      <div className="flex items-center relative">
                        {/* Achievement progress bar background */}
                        {showAchievementBar && achievementProgress > 0 && (
                          <div 
                            className={cn(
                              'absolute inset-0 h-full transition-all',
                              getProgressBarColor(achievementProgress)
                            )}
                            style={{ width: `${achievementProgress}%` }}
                          />
                        )}
                        {/* Increment controls for REC ATUAL and DIAMANTES ATUAIS */}
                        {(isRecAtualColumn || isDiamantesAtualColumn) && showIncrementControls && (
                          <div className="flex flex-col ml-1 z-10">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-primary/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onIncrement(row.id, col.id, 1);
                              }}
                              title="Aumentar"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-primary/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                onIncrement(row.id, col.id, -1);
                              }}
                              title="Diminuir"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex-1 relative z-10">
                          <EditableCell
                            cell={cell}
                            column={col}
                            isEditing={isEditing}
                            isSelected={isSelected}
                            rowType={row.type}
                            isOver100={cellIsOver100}
                            capAt100={settings.capPercentAt100}
                            highlightOver100={settings.highlightOver100}
                            trend={trend}
                            showProgress={col.type === 'percentage'}
                            progressValue={progressValue}
                            onStartEdit={() => onStartEdit(cellKey)}
                            onEndEdit={(value, isFormula) => {
                              onCellEdit(row.id, col.id, value, isFormula);
                              onEndEdit();
                            }}
                            onCancelEdit={onEndEdit}
                            onNavigate={handleNavigate}
                          />
                        </div>
                        {isTeamColumn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-30 hover:!opacity-100 h-5 w-5 p-0 mr-1 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tem certeza que deseja excluir este membro?')) {
                                onDeleteMember(row.id);
                              }
                            }}
                            title="Excluir membro"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
