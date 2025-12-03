import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Cell, CellValue, Column } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Calculator } from 'lucide-react';

interface EditableCellProps {
  cell: Cell;
  column: Column;
  isEditing: boolean;
  isSelected: boolean;
  rowType: 'header' | 'section-header' | 'data' | 'subtotal' | 'total';
  isOver100: boolean;
  capAt100: boolean;
  highlightOver100: boolean;
  trend?: '↑' | '↓' | '→';
  showProgress?: boolean;
  progressValue?: number;
  onStartEdit: () => void;
  onEndEdit: (value: string, isFormula?: boolean) => void;
  onCancelEdit: () => void;
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  cell,
  column,
  isEditing,
  isSelected,
  rowType,
  isOver100,
  capAt100,
  highlightOver100,
  trend,
  showProgress,
  progressValue = 0,
  onStartEdit,
  onEndEdit,
  onCancelEdit,
  onNavigate,
}) => {
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditing) {
      const displayVal = cell.value.formula || String(cell.value.raw || '');
      setEditValue(displayVal);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, cell.value]);
  
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          onEndEdit(editValue, editValue.startsWith('='));
        } else {
          onEndEdit(editValue, editValue.startsWith('='));
          onNavigate('down');
        }
        break;
      case 'Tab':
        e.preventDefault();
        onEndEdit(editValue, editValue.startsWith('='));
        onNavigate(e.shiftKey ? 'left' : 'right');
        break;
      case 'Escape':
        onCancelEdit();
        break;
      case 'ArrowUp':
        if (!e.shiftKey) {
          onEndEdit(editValue, editValue.startsWith('='));
          onNavigate('up');
        }
        break;
      case 'ArrowDown':
        if (!e.shiftKey) {
          onEndEdit(editValue, editValue.startsWith('='));
          onNavigate('down');
        }
        break;
    }
  }, [editValue, onEndEdit, onCancelEdit, onNavigate]);
  
  const handleDoubleClick = useCallback(() => {
    if (column.editable !== false && rowType === 'data') {
      onStartEdit();
    }
  }, [column.editable, rowType, onStartEdit]);
  
  const handleBlur = useCallback(() => {
    if (isEditing) {
      onEndEdit(editValue, editValue.startsWith('='));
    }
  }, [isEditing, editValue, onEndEdit]);
  
  const displayValue = cell.value.displayValue || String(cell.value.raw || '-');
  const hasFormula = !!cell.value.formula;
  const hasError = !!cell.value.error;
  
  const getProgressColor = () => {
    if (progressValue >= 80) return 'bg-success';
    if (progressValue >= 50) return 'bg-warning';
    return 'bg-destructive';
  };
  
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case '↑':
        return <TrendingUp className="w-3 h-3 text-success" />;
      case '↓':
        return <TrendingDown className="w-3 h-3 text-destructive" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };
  
  const cellContent = (
    <div
      className={cn(
        'relative h-full min-h-[24px] flex items-center px-0.5 py-0 transition-all',
        'editable-cell',
        column.align === 'left' ? 'justify-start text-left' : column.align === 'center' ? 'justify-center text-center' : 'justify-end text-right',
        column.type === 'number' || column.type === 'percentage' || column.type === 'currency'
          ? 'font-mono-numbers'
          : '',
        isSelected && 'ring-2 ring-primary/50 ring-inset bg-primary/5',
        rowType === 'data' && column.editable !== false && 'cursor-pointer hover:bg-accent/10',
        isOver100 && highlightOver100 && 'cell-over100',
        hasError && 'text-destructive',
      )}
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
      role="gridcell"
      aria-label={`${column.name}: ${displayValue}`}
      aria-selected={isSelected}
    >
      {/* Progress bar background */}
      {showProgress && progressValue > 0 && (
        <div
          className={cn('progress-bar-fill', getProgressColor())}
          style={{ width: `${Math.min(progressValue, 100)}%` }}
        />
      )}
      
      {/* Formula indicator */}
      {hasFormula && !isEditing && (
        <div className="formula-indicator" title="Esta célula contém uma fórmula" />
      )}
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={cn(
            'w-full h-full bg-card border-none outline-none',
            'text-sm font-mono-numbers',
            column.align === 'left' ? 'text-left' : column.align === 'center' ? 'text-center' : 'text-right'
          )}
          aria-label={`Editando ${column.name}`}
        />
      ) : (
        <span className="relative z-10 flex items-center gap-1">
          {displayValue}
          {trend && <span className="ml-1">{getTrendIcon()}</span>}
          {isOver100 && highlightOver100 && !capAt100 && (
            <span className="text-[10px] text-dashboard-over100 font-bold ml-1">
              &gt;100%
            </span>
          )}
        </span>
      )}
    </div>
  );
  
  // Wrap with tooltip for over 100% or formula cells
  if ((isOver100 && highlightOver100) || hasFormula || hasError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cellContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {hasError && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span>Erro: {cell.value.error}</span>
            </div>
          )}
          {isOver100 && highlightOver100 && (
            <div className="flex items-center gap-2 text-dashboard-over100">
              <AlertTriangle className="w-4 h-4" />
              <span>Valor acima de 100% — verifique base/alcance</span>
            </div>
          )}
          {hasFormula && !hasError && (
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span>Fórmula: {cell.value.formula}</span>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return cellContent;
};
