import { useState, useCallback, useRef, useEffect } from 'react';
import { Cell, CellValue, Row, Column, Section, DashboardState, DashboardSettings, HistoryEntry, ColumnGroup } from '@/types/dashboard';
import { FormulaEngine } from '@/lib/formulaEngine';

const DEFAULT_SETTINGS: DashboardSettings = {
  decimalPlaces: 0,
  capPercentAt100: false,
  defaultGrowthRate: 0.05,
  projectionFormula: 'compound',
  showFormulas: false,
  highlightOver100: true,
};

export const useDashboardState = (initialState?: Partial<DashboardState>) => {
  const [columns, setColumns] = useState<Column[]>(initialState?.columns || []);
  const [columnGroups, setColumnGroups] = useState<ColumnGroup[]>(initialState?.columnGroups || []);
  const [rows, setRows] = useState<Row[]>(initialState?.rows || []);
  const [sections, setSections] = useState<Section[]>(initialState?.sections || []);
  const [settings, setSettings] = useState<DashboardSettings>({
    ...DEFAULT_SETTINGS,
    ...initialState?.settings,
  });
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  
  const formulaEngineRef = useRef<FormulaEngine | null>(null);
  
  // Initialize formula engine
  useEffect(() => {
    const cellsMap = new Map<string, Cell>();
    rows.forEach(row => {
      Object.values(row.cells).forEach(cell => {
        cellsMap.set(cell.id, cell);
      });
    });
    
    if (!formulaEngineRef.current) {
      formulaEngineRef.current = new FormulaEngine(cellsMap, settings);
    } else {
      formulaEngineRef.current.updateCells(cellsMap);
      formulaEngineRef.current.updateSettings(settings);
    }
  }, [rows, settings]);
  
  const getCellKey = useCallback((rowId: string, columnId: string) => {
    return `${rowId}-${columnId}`;
  }, []);
  
  const updateCell = useCallback((rowId: string, columnId: string, newValue: Partial<CellValue>) => {
    setRows(prevRows => {
      const newRows = prevRows.map(row => {
        if (row.id !== rowId) return row;
        
        const cell = row.cells[columnId];
        if (!cell) return row;
        
        const previousValue = { ...cell.value };
        const updatedValue: CellValue = {
          ...cell.value,
          ...newValue,
        };
        
        // Process formula if present
        if (updatedValue.formula && formulaEngineRef.current) {
          const result = formulaEngineRef.current.parseFormula(
            updatedValue.formula,
            cell.id
          );
          
          if (typeof result === 'string' && result.startsWith('#')) {
            updatedValue.error = result;
          } else {
            updatedValue.raw = result as number;
            updatedValue.error = undefined;
          }
        }
        
        // Format display value
        if (formulaEngineRef.current) {
          updatedValue.displayValue = formulaEngineRef.current.formatValue(
            updatedValue,
            settings.capPercentAt100
          );
        }
        
        // Add to history
        const historyEntry: HistoryEntry = {
          timestamp: Date.now(),
          cellId: cell.id,
          previousValue,
          newValue: updatedValue,
          description: `Updated ${columnId} in row ${rowId}`,
        };
        
        setHistory(prev => [...prev.slice(0, historyIndex + 1), historyEntry]);
        setHistoryIndex(prev => prev + 1);
        
        return {
          ...row,
          cells: {
            ...row.cells,
            [columnId]: {
              ...cell,
              value: updatedValue,
              lastUpdated: Date.now(),
            },
          },
        };
      });
      
      // Recalculate dependent cells
      return recalculateDependentCells(newRows);
    });
  }, [historyIndex, settings.capPercentAt100]);
  
  const recalculateDependentCells = useCallback((currentRows: Row[]): Row[] => {
    // Simple dependency recalculation - in production, would use a DAG
    return currentRows.map(row => {
      if (row.type === 'subtotal' || row.type === 'total') {
        return recalculateTotalRow(row, currentRows);
      }
      return row;
    });
  }, []);
  
  const recalculateTotalRow = useCallback((totalRow: Row, allRows: Row[]): Row => {
    const updatedCells = { ...totalRow.cells };
    
    // Get rows to sum based on section
    const rowsToSum = allRows.filter(row => {
      if (totalRow.type === 'total') {
        return row.type === 'data' || row.type === 'subtotal';
      }
      return row.type === 'data' && row.sectionId === totalRow.sectionId;
    });
    
    columns.forEach(col => {
      if (col.type === 'number' || col.type === 'currency') {
        const sum = rowsToSum.reduce((acc, row) => {
          const cell = row.cells[col.id];
          if (cell && formulaEngineRef.current) {
            return acc + formulaEngineRef.current.getCellNumericValue(cell);
          }
          return acc;
        }, 0);
        
        if (updatedCells[col.id]) {
          updatedCells[col.id] = {
            ...updatedCells[col.id],
            value: {
              ...updatedCells[col.id].value,
              raw: sum,
              displayValue: formulaEngineRef.current?.formatValue(
                { raw: sum, type: col.type },
                settings.capPercentAt100
              ) || String(sum),
            },
          };
        }
      } else if (col.type === 'percentage' && totalRow.type === 'subtotal') {
        // Calculate average for percentages
        const values = rowsToSum
          .map(row => row.cells[col.id])
          .filter(cell => cell && cell.value.raw !== null);
        
        if (values.length > 0 && formulaEngineRef.current) {
          const sum = values.reduce((acc, cell) => {
            return acc + formulaEngineRef.current!.getCellNumericValue(cell!);
          }, 0);
          const avg = sum / values.length;
          
          if (updatedCells[col.id]) {
            updatedCells[col.id] = {
              ...updatedCells[col.id],
              value: {
                ...updatedCells[col.id].value,
                raw: avg,
                displayValue: formulaEngineRef.current.formatValue(
                  { raw: avg, type: 'percentage' },
                  settings.capPercentAt100
                ),
              },
            };
          }
        }
      }
    });
    
    return { ...totalRow, cells: updatedCells };
  }, [columns, settings.capPercentAt100]);
  
  const undo = useCallback(() => {
    if (historyIndex < 0) return;
    
    const entry = history[historyIndex];
    
    setRows(prevRows => prevRows.map(row => {
      const cell = Object.values(row.cells).find(c => c.id === entry.cellId);
      if (!cell) return row;
      
      return {
        ...row,
        cells: {
          ...row.cells,
          [cell.columnId]: {
            ...cell,
            value: entry.previousValue,
          },
        },
      };
    }));
    
    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex]);
  
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const entry = history[historyIndex + 1];
    
    setRows(prevRows => prevRows.map(row => {
      const cell = Object.values(row.cells).find(c => c.id === entry.cellId);
      if (!cell) return row;
      
      return {
        ...row,
        cells: {
          ...row.cells,
          [cell.columnId]: {
            ...cell,
            value: entry.newValue,
          },
        },
      };
    }));
    
    setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex]);
  
  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, collapsed: !section.collapsed }
        : section
    ));
  }, []);
  
  const updateSettings = useCallback((newSettings: Partial<DashboardSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  const getFormulaEngine = useCallback(() => formulaEngineRef.current, []);
  
  return {
    // State
    columns,
    setColumns,
    columnGroups,
    setColumnGroups,
    rows,
    setRows,
    sections,
    setSections,
    settings,
    history,
    editingCell,
    setEditingCell,
    selectedCells,
    setSelectedCells,
    
    // Actions
    updateCell,
    undo,
    redo,
    toggleSection,
    updateSettings,
    getCellKey,
    getFormulaEngine,
    
    // Computed
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
  };
};
