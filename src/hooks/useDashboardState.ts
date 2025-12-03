import { useState, useCallback, useRef, useEffect } from 'react';
import { Cell, CellValue, Row, Column, Section, DashboardState, DashboardSettings, HistoryEntry, ColumnGroup } from '@/types/dashboard';
import { FormulaEngine } from '@/lib/formulaEngine';
import { PeriodSettings, getDefaultPeriodSettings, calculateProjection, calculateAchievement, calculateProjectedAchievement } from '@/lib/projectionCalculator';
import { createCell } from '@/data/dashboardData';
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
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(getDefaultPeriodSettings());
  
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

  // Recalculate all projections when period settings change
  const recalculateAllProjections = useCallback((currentRows: Row[]): Row[] => {
    return currentRows.map(row => {
      if (row.type !== 'data') return row;
      
      const updatedCells = { ...row.cells };
      
      // Get base values
      const recAtual = updatedCells.rec_atual?.value.raw as number || 0;
      const metaRec = updatedCells.meta_rec?.value.raw as number || 0;
      const diamantesAtuais = updatedCells.diamantes_atuais?.value.raw as number || 0;
      const metaDiamantes = updatedCells.meta_diamantes?.value.raw as number || 0;
      
      // Calculate projections based on period
      const projRec = calculateProjection(recAtual, periodSettings);
      const projDima = calculateProjection(diamantesAtuais, periodSettings);
      
      // Calculate achievements
      const atgPercent = calculateAchievement(recAtual, metaRec);
      const atgProjRec = calculateProjectedAchievement(projRec, metaRec);
      const atgDima = calculateAchievement(diamantesAtuais, metaDiamantes);
      const atgProjDima = calculateProjectedAchievement(projDima, metaDiamantes);
      
      // Update cells
      if (updatedCells.atg_percent) {
        updatedCells.atg_percent = {
          ...updatedCells.atg_percent,
          value: {
            ...updatedCells.atg_percent.value,
            raw: atgPercent / 100,
            displayValue: `${Math.round(atgPercent)}%`,
          },
        };
      }
      
      if (updatedCells.proj_rec) {
        updatedCells.proj_rec = {
          ...updatedCells.proj_rec,
          value: {
            ...updatedCells.proj_rec.value,
            raw: projRec,
            displayValue: new Intl.NumberFormat('pt-BR').format(projRec),
          },
        };
      }
      
      if (updatedCells.atg_proj_rec) {
        updatedCells.atg_proj_rec = {
          ...updatedCells.atg_proj_rec,
          value: {
            ...updatedCells.atg_proj_rec.value,
            raw: atgProjRec / 100,
            displayValue: `${Math.round(atgProjRec)}%`,
          },
        };
      }
      
      if (updatedCells.atg_dima) {
        updatedCells.atg_dima = {
          ...updatedCells.atg_dima,
          value: {
            ...updatedCells.atg_dima.value,
            raw: atgDima / 100,
            displayValue: `${Math.round(atgDima)}%`,
          },
        };
      }
      
      if (updatedCells.proj_dima) {
        updatedCells.proj_dima = {
          ...updatedCells.proj_dima,
          value: {
            ...updatedCells.proj_dima.value,
            raw: projDima,
            displayValue: new Intl.NumberFormat('pt-BR').format(projDima),
          },
        };
      }
      
      if (updatedCells.atg_proj_dima) {
        updatedCells.atg_proj_dima = {
          ...updatedCells.atg_proj_dima,
          value: {
            ...updatedCells.atg_proj_dima.value,
            raw: atgProjDima / 100,
            displayValue: `${Math.round(atgProjDima)}%`,
          },
        };
      }
      
      return { ...row, cells: updatedCells };
    });
  }, [periodSettings]);

  // Recalculate subtotals and totals
  const recalculateSubtotalsAndTotals = useCallback((currentRows: Row[]): Row[] => {
    const sections = new Map<string, Row[]>();
    const dataRows: Row[] = [];
    
    // Group data rows by section
    currentRows.forEach(row => {
      if (row.type === 'data') {
        dataRows.push(row);
        if (row.sectionId) {
          const sectionRows = sections.get(row.sectionId) || [];
          sectionRows.push(row);
          sections.set(row.sectionId, sectionRows);
        }
      }
    });
    
    // First pass: update subtotals
    const withSubtotals = currentRows.map(row => {
      if (row.type === 'subtotal' && row.sectionId) {
        const sectionRows = sections.get(row.sectionId) || [];
        return recalculateSummaryRow(row, sectionRows, columns);
      }
      return row;
    });
    
    // Second pass: update totals using updated subtotals
    return withSubtotals.map(row => {
      if (row.type === 'total') {
        // For total, sum all data rows directly for accuracy
        return recalculateSummaryRow(row, dataRows, columns);
      }
      return row;
    });
  }, [columns]);

  const recalculateSummaryRow = (summaryRow: Row, sourceRows: Row[], cols: Column[]): Row => {
    const updatedCells = { ...summaryRow.cells };
    
    cols.forEach(col => {
      if (!updatedCells[col.id]) return;
      
      if (col.type === 'number' || col.type === 'currency') {
        const sum = sourceRows.reduce((acc, row) => {
          const cell = row.cells[col.id];
          if (cell) {
            const value = typeof cell.value.raw === 'number' ? cell.value.raw : 0;
            return acc + value;
          }
          return acc;
        }, 0);
        
        updatedCells[col.id] = {
          ...updatedCells[col.id],
          value: {
            ...updatedCells[col.id].value,
            raw: sum,
            displayValue: new Intl.NumberFormat('pt-BR').format(sum),
          },
        };
      } else if (col.type === 'percentage') {
        // For percentages in summary rows, recalculate based on totals
        // ATG % = Total Atual / Total Meta
        if (col.id === 'atg_percent') {
          const totalAtual = sourceRows.reduce((acc, row) => acc + (typeof row.cells.rec_atual?.value.raw === 'number' ? row.cells.rec_atual.value.raw : 0), 0);
          const totalMeta = sourceRows.reduce((acc, row) => acc + (typeof row.cells.meta_rec?.value.raw === 'number' ? row.cells.meta_rec.value.raw : 0), 0);
          const atg = totalMeta > 0 ? (totalAtual / totalMeta) * 100 : 0;
          
          updatedCells[col.id] = {
            ...updatedCells[col.id],
            value: {
              ...updatedCells[col.id].value,
              raw: atg / 100,
              displayValue: `${Math.round(atg)}%`,
            },
          };
        } else if (col.id === 'atg_proj_rec') {
          const totalProj = sourceRows.reduce((acc, row) => acc + (typeof row.cells.proj_rec?.value.raw === 'number' ? row.cells.proj_rec.value.raw : 0), 0);
          const totalMeta = sourceRows.reduce((acc, row) => acc + (typeof row.cells.meta_rec?.value.raw === 'number' ? row.cells.meta_rec.value.raw : 0), 0);
          const atg = totalMeta > 0 ? (totalProj / totalMeta) * 100 : 0;
          
          updatedCells[col.id] = {
            ...updatedCells[col.id],
            value: {
              ...updatedCells[col.id].value,
              raw: atg / 100,
              displayValue: `${Math.round(atg)}%`,
            },
          };
        } else if (col.id === 'atg_dima') {
          const totalAtual = sourceRows.reduce((acc, row) => acc + (typeof row.cells.diamantes_atuais?.value.raw === 'number' ? row.cells.diamantes_atuais.value.raw : 0), 0);
          const totalMeta = sourceRows.reduce((acc, row) => acc + (typeof row.cells.meta_diamantes?.value.raw === 'number' ? row.cells.meta_diamantes.value.raw : 0), 0);
          const atg = totalMeta > 0 ? (totalAtual / totalMeta) * 100 : 0;
          
          updatedCells[col.id] = {
            ...updatedCells[col.id],
            value: {
              ...updatedCells[col.id].value,
              raw: atg / 100,
              displayValue: `${Math.round(atg)}%`,
            },
          };
        } else if (col.id === 'atg_proj_dima') {
          const totalProj = sourceRows.reduce((acc, row) => acc + (typeof row.cells.proj_dima?.value.raw === 'number' ? row.cells.proj_dima.value.raw : 0), 0);
          const totalMeta = sourceRows.reduce((acc, row) => acc + (typeof row.cells.meta_diamantes?.value.raw === 'number' ? row.cells.meta_diamantes.value.raw : 0), 0);
          const atg = totalMeta > 0 ? (totalProj / totalMeta) * 100 : 0;
          
          updatedCells[col.id] = {
            ...updatedCells[col.id],
            value: {
              ...updatedCells[col.id].value,
              raw: atg / 100,
              displayValue: `${Math.round(atg)}%`,
            },
          };
        }
      }
    });
    
    return { ...summaryRow, cells: updatedCells };
  };
  
  // Update period settings and recalculate
  const updatePeriodSettings = useCallback((newSettings: Partial<PeriodSettings>) => {
    setPeriodSettings(prev => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  }, []);

  // Effect to recalculate when period settings change
  useEffect(() => {
    if (rows.length > 0) {
      setRows(prevRows => {
        const withProjections = recalculateAllProjections(prevRows);
        return recalculateSubtotalsAndTotals(withProjections);
      });
    }
  }, [periodSettings]);
  
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
      
      // Recalculate projections and then subtotals/totals
      const withProjections = recalculateAllProjections(newRows);
      return recalculateSubtotalsAndTotals(withProjections);
    });
  }, [historyIndex, settings.capPercentAt100, recalculateAllProjections, recalculateSubtotalsAndTotals]);
  
  const undo = useCallback(() => {
    if (historyIndex < 0) return;
    
    const entry = history[historyIndex];
    
    setRows(prevRows => {
      const newRows = prevRows.map(row => {
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
      });
      
      const withProjections = recalculateAllProjections(newRows);
      return recalculateSubtotalsAndTotals(withProjections);
    });
    
    setHistoryIndex(prev => prev - 1);
  }, [history, historyIndex, recalculateAllProjections, recalculateSubtotalsAndTotals]);
  
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    
    const entry = history[historyIndex + 1];
    
    setRows(prevRows => {
      const newRows = prevRows.map(row => {
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
      });
      
      const withProjections = recalculateAllProjections(newRows);
      return recalculateSubtotalsAndTotals(withProjections);
    });
    
    setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex, recalculateAllProjections, recalculateSubtotalsAndTotals]);
  
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

  // Trigger initial calculation after data loads
  const initializeData = useCallback((data: { columns: Column[], columnGroups: ColumnGroup[], rows: Row[] }) => {
    setColumns(data.columns);
    setColumnGroups(data.columnGroups);
    
    // Calculate projections for initial data
    const withProjections = recalculateAllProjections(data.rows);
    const withTotals = recalculateSubtotalsAndTotals(withProjections);
    setRows(withTotals);
  }, [recalculateAllProjections, recalculateSubtotalsAndTotals]);

  // Add a new member to a section
  const addMember = useCallback((sectionId: string, memberName: string = 'NOVO MEMBRO') => {
    setRows(prevRows => {
      // Find section rows to determine order
      const sectionRows = prevRows.filter(r => r.sectionId === sectionId && r.type === 'data');
      const subtotalRow = prevRows.find(r => r.sectionId === sectionId && r.type === 'subtotal');
      
      // Generate unique ID
      const newRowId = `row_${Date.now()}`;
      const newOrder = subtotalRow ? subtotalRow.order - 0.5 : sectionRows.length > 0 ? Math.max(...sectionRows.map(r => r.order)) + 1 : 1;
      
      const newRow: Row = {
        id: newRowId,
        type: 'data',
        order: newOrder,
        sectionId,
        cells: {
          streamers: createCell(newRowId, 'streamers', 0, 'number'),
          team: createCell(newRowId, 'team', memberName, 'text'),
          rec_atual: createCell(newRowId, 'rec_atual', 0, 'number'),
          meta_rec: createCell(newRowId, 'meta_rec', 75, 'number'),
          atg_percent: createCell(newRowId, 'atg_percent', 0, 'percentage'),
          proj_rec: createCell(newRowId, 'proj_rec', 0, 'number'),
          atg_proj_rec: createCell(newRowId, 'atg_proj_rec', 0, 'percentage'),
          diamantes_atuais: createCell(newRowId, 'diamantes_atuais', 0, 'currency'),
          meta_diamantes: createCell(newRowId, 'meta_diamantes', 100000, 'currency'),
          atg_dima: createCell(newRowId, 'atg_dima', 0, 'percentage'),
          proj_dima: createCell(newRowId, 'proj_dima', 0, 'currency'),
          atg_proj_dima: createCell(newRowId, 'atg_proj_dima', 0, 'percentage'),
        },
      };
      
      // Insert before subtotal
      const insertIndex = subtotalRow ? prevRows.indexOf(subtotalRow) : prevRows.length;
      const newRows = [...prevRows.slice(0, insertIndex), newRow, ...prevRows.slice(insertIndex)];
      
      const withProjections = recalculateAllProjections(newRows);
      return recalculateSubtotalsAndTotals(withProjections);
    });
  }, [recalculateAllProjections, recalculateSubtotalsAndTotals]);

  // Delete a member from the dashboard
  const deleteMember = useCallback((rowId: string) => {
    setRows(prevRows => {
      const newRows = prevRows.filter(r => r.id !== rowId);
      const withProjections = recalculateAllProjections(newRows);
      return recalculateSubtotalsAndTotals(withProjections);
    });
  }, [recalculateAllProjections, recalculateSubtotalsAndTotals]);

  // Add a new executive section
  const addExecutive = useCallback((executiveName: string = 'NOVO EXECUTIVO') => {
    setRows(prevRows => {
      const sectionId = `section_${Date.now()}`;
      const headerRowId = `header_${Date.now()}`;
      const dataRowId = `data_${Date.now()}`;
      const subtotalRowId = `subtotal_${Date.now()}`;
      
      // Find the total row index to insert before it
      const totalRowIndex = prevRows.findIndex(r => r.type === 'total');
      const insertIndex = totalRowIndex !== -1 ? totalRowIndex : prevRows.length;
      
      // Calculate order based on existing sections
      const existingSectionHeaders = prevRows.filter(r => r.type === 'section-header');
      const baseOrder = existingSectionHeaders.length * 100 + 100;
      
      // Create section header row
      const headerRow: Row = {
        id: headerRowId,
        type: 'section-header',
        order: baseOrder,
        sectionId,
        cells: {
          team: createCell(headerRowId, 'team', executiveName, 'text'),
        },
      };
      
      // Create initial data row
      const dataRow: Row = {
        id: dataRowId,
        type: 'data',
        order: baseOrder + 1,
        sectionId,
        cells: {
          streamers: createCell(dataRowId, 'streamers', 0, 'number'),
          team: createCell(dataRowId, 'team', 'NOVO MEMBRO', 'text'),
          rec_atual: createCell(dataRowId, 'rec_atual', 0, 'number'),
          meta_rec: createCell(dataRowId, 'meta_rec', 75, 'number'),
          atg_percent: createCell(dataRowId, 'atg_percent', 0, 'percentage'),
          proj_rec: createCell(dataRowId, 'proj_rec', 0, 'number'),
          atg_proj_rec: createCell(dataRowId, 'atg_proj_rec', 0, 'percentage'),
          diamantes_atuais: createCell(dataRowId, 'diamantes_atuais', 0, 'currency'),
          meta_diamantes: createCell(dataRowId, 'meta_diamantes', 100000, 'currency'),
          atg_dima: createCell(dataRowId, 'atg_dima', 0, 'percentage'),
          proj_dima: createCell(dataRowId, 'proj_dima', 0, 'currency'),
          atg_proj_dima: createCell(dataRowId, 'atg_proj_dima', 0, 'percentage'),
        },
      };
      
      // Create subtotal row
      const subtotalRow: Row = {
        id: subtotalRowId,
        type: 'subtotal',
        order: baseOrder + 2,
        sectionId,
        cells: {
          streamers: createCell(subtotalRowId, 'streamers', 0, 'number'),
          team: createCell(subtotalRowId, 'team', 'SUBTOTAL', 'text'),
          rec_atual: createCell(subtotalRowId, 'rec_atual', 0, 'number'),
          meta_rec: createCell(subtotalRowId, 'meta_rec', 75, 'number'),
          atg_percent: createCell(subtotalRowId, 'atg_percent', 0, 'percentage'),
          proj_rec: createCell(subtotalRowId, 'proj_rec', 0, 'number'),
          atg_proj_rec: createCell(subtotalRowId, 'atg_proj_rec', 0, 'percentage'),
          diamantes_atuais: createCell(subtotalRowId, 'diamantes_atuais', 0, 'currency'),
          meta_diamantes: createCell(subtotalRowId, 'meta_diamantes', 100000, 'currency'),
          atg_dima: createCell(subtotalRowId, 'atg_dima', 0, 'percentage'),
          proj_dima: createCell(subtotalRowId, 'proj_dima', 0, 'currency'),
          atg_proj_dima: createCell(subtotalRowId, 'atg_proj_dima', 0, 'percentage'),
        },
      };
      
      const newRows = [
        ...prevRows.slice(0, insertIndex),
        headerRow,
        dataRow,
        subtotalRow,
        ...prevRows.slice(insertIndex),
      ];
      
      const withProjections = recalculateAllProjections(newRows);
      return recalculateSubtotalsAndTotals(withProjections);
    });
  }, [recalculateAllProjections, recalculateSubtotalsAndTotals]);
  
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
    periodSettings,
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
    updatePeriodSettings,
    getCellKey,
    getFormulaEngine,
    initializeData,
    addMember,
    deleteMember,
    addExecutive,
    
    // Computed
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
  };
};
