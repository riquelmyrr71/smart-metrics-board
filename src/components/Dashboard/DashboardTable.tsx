import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Column, Row, ColumnGroup, DashboardSettings, Cell } from '@/types/dashboard';
import { EditableCell } from './EditableCell';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
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
  onCellEdit: (rowId: string, columnId: string, value: string, isFormula?: boolean) => void;
  onStartEdit: (cellKey: string) => void;
  onEndEdit: () => void;
  onSelectCell: (cellKey: string) => void;
  onToggleSection: (sectionId: string) => void;
  onPaste: (rowId: string, columnId: string, data: string[][]) => void;
  onAddMember: (sectionId: string) => void;
  onDeleteMember: (rowId: string) => void;
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
  onCellEdit,
  onStartEdit,
  onEndEdit,
  onSelectCell,
  onToggleSection,
  onPaste,
  onAddMember,
  onDeleteMember,
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
  
  const visibleRows = rows.filter(row => {
    if (row.type === 'section-header') return true;
    if (!row.sectionId) return true;
    return !collapsedSections.has(row.sectionId);
  });
  
  // Group columns for header rendering
  const renderColumnGroups = () => {
    if (columnGroups.length === 0) return null;
    
    return (
      <tr>
        {columnGroups.map(group => (
          <th
            key={group.id}
            colSpan={group.columns.length}
            className="bg-secondary text-secondary-foreground px-2 py-2 text-center font-semibold text-xs uppercase tracking-wider border-r border-dashboard-cell-border"
          >
            {group.name}
          </th>
        ))}
      </tr>
    );
  };
  
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table
        ref={tableRef}
        className="w-full border-collapse text-sm"
        role="grid"
        aria-label="Painel de Performance"
      >
        <thead className="sticky top-0 z-10">
          {renderColumnGroups()}
          <tr>
            {columns.map((col, colIndex) => (
              <th
                key={col.id}
                className={cn(
                  'bg-dashboard-header text-dashboard-header-text px-2 py-2 font-semibold text-xs border-r border-dashboard-cell-border whitespace-nowrap',
                  col.align === 'left' ? 'text-left' : 'text-right'
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
            ))}
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
                    className="px-2 py-2 font-bold text-secondary-foreground cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => onToggleSection(sectionId)}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      <span className="flex-1">{firstCell?.value.raw || 'Seção'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-50 hover:!opacity-100 h-6 w-6 p-0 transition-opacity"
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
                <tr key={row.id} className="bg-dashboard-subtotal text-dashboard-header-text font-semibold">
                  {columns.map((col, colIndex) => {
                    const cell = row.cells[col.id];
                    const displayValue = cell?.value.displayValue || String(cell?.value.raw || '-');
                    
                    return (
                      <td
                        key={col.id}
                        className={cn(
                          'px-2 py-1.5 border-r border-dashboard-cell-border/50',
                          col.align === 'left' ? 'text-left' : 'text-right',
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
                          'px-2 py-2 border-r border-dashboard-cell-border/50',
                          col.align === 'left' ? 'text-left' : 'text-right',
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
                  if (!cell) {
                    return (
                      <td key={col.id} className="px-2 py-1 border-r border-dashboard-cell-border">
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
                  
                  return (
                    <td
                      key={col.id}
                      className={cn(
                        'border-r border-dashboard-cell-border p-0 relative',
                      )}
                      onClick={() => {
                        setFocusedCell({ rowIndex: dataRowIndex, colIndex });
                        onSelectCell(cellKey);
                      }}
                    >
                      <div className="flex items-center">
                        <div className="flex-1">
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
