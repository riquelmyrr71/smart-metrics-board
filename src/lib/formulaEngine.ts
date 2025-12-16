import { Cell, CellValue, Row, DashboardSettings } from '@/types/dashboard';

export class FormulaEngine {
  private cells: Map<string, Cell>;
  private settings: DashboardSettings;

  constructor(cells: Map<string, Cell>, settings: DashboardSettings) {
    this.cells = cells;
    this.settings = settings;
  }

  updateCells(cells: Map<string, Cell>) {
    this.cells = cells;
  }

  updateSettings(settings: DashboardSettings) {
    this.settings = settings;
  }

  parseFormula(formula: string, currentCellId: string): number | string {
    if (!formula.startsWith('=')) {
      return formula;
    }

    const expr = formula.substring(1).trim();
    
    try {
      // Replace cell references with values
      const processedExpr = this.replaceCellReferences(expr, currentCellId);
      
      // Evaluate the expression safely
      const result = this.safeEval(processedExpr);
      
      return this.roundResult(result);
    } catch (error) {
      return '#ERROR!';
    }
  }

  private replaceCellReferences(expr: string, currentCellId: string): string {
    // Match cell references like A1, B2, etc. or named references like [Row1.Column1]
    const cellRefRegex = /\[([^\]]+)\]|([A-Z]+\d+)/gi;
    
    return expr.replace(cellRefRegex, (match, namedRef, standardRef) => {
      const ref = namedRef || standardRef;
      const cell = this.findCellByReference(ref);
      
      if (!cell) {
        throw new Error(`Cell reference not found: ${ref}`);
      }
      
      if (cell.id === currentCellId) {
        throw new Error('Circular reference detected');
      }
      
      const value = this.getCellNumericValue(cell);
      return value.toString();
    });
  }

  private findCellByReference(ref: string): Cell | undefined {
    // Support both A1 notation and named references
    for (const cell of this.cells.values()) {
      if (cell.id === ref || cell.id.toLowerCase() === ref.toLowerCase()) {
        return cell;
      }
    }
    return undefined;
  }

  getCellNumericValue(cell: Cell): number {
    const raw = cell.value.raw;
    
    if (typeof raw === 'number') {
      return raw;
    }
    
    if (typeof raw === 'string') {
      // Handle percentage strings
      if (raw.includes('%')) {
        const numStr = raw.replace('%', '').trim();
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num / 100;
      }
      
      // Handle Brazilian currency/number format
      let cleaned = raw.replace(/[R$\s]/g, '');
      
      // Brazilian format detection
      if (cleaned.includes('.') && cleaned.includes(',')) {
        const lastDot = cleaned.lastIndexOf('.');
        const lastComma = cleaned.lastIndexOf(',');
        if (lastComma > lastDot) {
          cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
          cleaned = cleaned.replace(',', '.');
        } else {
          cleaned = cleaned.replace(/,/g, '');
        }
      } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[parts.length - 1].length === 3)) {
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    
    return 0;
  }

  private safeEval(expr: string): number {
    // Simple math expression evaluator
    // Supports: +, -, *, /, ^, (), ABS, SUM, AVG
    
    // Replace power operator
    expr = expr.replace(/\^/g, '**');
    
    // Handle functions
    expr = this.processFunctions(expr);
    
    // Validate expression (only allow numbers and math operators)
    if (!/^[\d\s+\-*/.()]+$/.test(expr)) {
      throw new Error('Invalid expression');
    }
    
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expr}`)();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return result;
  }

  private processFunctions(expr: string): string {
    // ABS function
    expr = expr.replace(/ABS\(([^)]+)\)/gi, (_, arg) => {
      const val = this.safeEval(arg);
      return Math.abs(val).toString();
    });
    
    // SUM function - for ranges
    expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args) => {
      const values = args.split(',').map((v: string) => parseFloat(v.trim()) || 0);
      return values.reduce((a: number, b: number) => a + b, 0).toString();
    });
    
    // AVG function
    expr = expr.replace(/AVG\(([^)]+)\)/gi, (_, args) => {
      const values = args.split(',').map((v: string) => parseFloat(v.trim()) || 0);
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      return (sum / values.length).toString();
    });
    
    return expr;
  }

  private roundResult(value: number): number {
    const factor = Math.pow(10, this.settings.decimalPlaces);
    return Math.round(value * factor) / factor;
  }

  // Calculate projection based on settings
  calculateProjection(currentValue: number, growthRate: number, periods: number = 1): number {
    if (this.settings.projectionFormula === 'compound') {
      return this.roundResult(currentValue * Math.pow(1 + growthRate, periods));
    } else {
      return this.roundResult(currentValue + (currentValue * growthRate * periods));
    }
  }

  // Calculate percentage variation
  calculateVariation(current: number, previous: number): number | string {
    if (previous === 0) {
      return current === 0 ? 0 : 'N/A';
    }
    return this.roundResult(((current - previous) / Math.abs(previous)) * 100);
  }

  // Calculate CAGR
  calculateCAGR(initialValue: number, finalValue: number, periods: number): number | string {
    if (initialValue <= 0 || periods <= 0) {
      return 'N/A';
    }
    const cagr = Math.pow(finalValue / initialValue, 1 / periods) - 1;
    return this.roundResult(cagr * 100);
  }

  // Format value for display
  formatValue(value: CellValue, capAt100: boolean = false): string {
    const { raw, type, error } = value;
    
    if (error) {
      return error;
    }
    
    if (raw === null || raw === undefined || raw === '') {
      return '-';
    }
    
    const numValue = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.-]/g, ''));
    
    switch (type) {
      case 'percentage':
        let percentValue = numValue;
        if (Math.abs(numValue) <= 2) {
          // Assume it's a decimal (0.5 = 50%)
          percentValue = numValue * 100;
        }
        
        if (capAt100 && percentValue > 100) {
          return '100%+';
        }
        
        return `${this.roundResult(percentValue)}%`;
      
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'decimal',
          minimumFractionDigits: 0,
          maximumFractionDigits: this.settings.decimalPlaces,
        }).format(numValue);
      
      case 'number':
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: this.settings.decimalPlaces,
        }).format(numValue);
      
      default:
        return String(raw);
    }
  }

  // Check if value is over 100%
  isOver100Percent(value: CellValue): boolean {
    if (value.type !== 'percentage') return false;
    
    const numValue = typeof value.raw === 'number' ? value.raw : parseFloat(String(value.raw));
    
    // Handle both decimal (1.2 = 120%) and whole number (120 = 120%) representations
    if (Math.abs(numValue) <= 2) {
      return numValue > 1;
    }
    return numValue > 100;
  }

  // Get trend indicator
  getTrendIndicator(current: number, previous: number): '↑' | '↓' | '→' {
    const diff = current - previous;
    const threshold = Math.abs(previous) * 0.01; // 1% threshold
    
    if (diff > threshold) return '↑';
    if (diff < -threshold) return '↓';
    return '→';
  }

  // Calculate sum of column
  sumColumn(rows: Row[], columnId: string, excludeTypes: string[] = ['header', 'section-header', 'total', 'subtotal']): number {
    return rows
      .filter(row => !excludeTypes.includes(row.type))
      .reduce((sum, row) => {
        const cell = row.cells[columnId];
        if (cell) {
          return sum + this.getCellNumericValue(cell);
        }
        return sum;
      }, 0);
  }

  // Calculate average of column
  avgColumn(rows: Row[], columnId: string, excludeTypes: string[] = ['header', 'section-header', 'total', 'subtotal']): number {
    const validRows = rows.filter(row => !excludeTypes.includes(row.type));
    const sum = this.sumColumn(rows, columnId, excludeTypes);
    return validRows.length > 0 ? this.roundResult(sum / validRows.length) : 0;
  }
}

export const createFormulaEngine = (cells: Map<string, Cell>, settings: DashboardSettings) => {
  return new FormulaEngine(cells, settings);
};
