export type CellType = 'text' | 'number' | 'percentage' | 'currency' | 'formula';

export interface CellValue {
  raw: string | number;
  formula?: string;
  displayValue?: string;
  type: CellType;
  error?: string;
}

export interface Cell {
  id: string;
  rowId: string;
  columnId: string;
  value: CellValue;
  isEditing?: boolean;
  hasFormula?: boolean;
  lastUpdated?: number;
}

export interface Column {
  id: string;
  name: string;
  type: CellType;
  width?: number;
  group?: string;
  tooltip?: string;
  editable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface ColumnGroup {
  id: string;
  name: string;
  columns: string[];
}

export interface Row {
  id: string;
  type: 'header' | 'section-header' | 'data' | 'subtotal' | 'total';
  cells: Record<string, Cell>;
  sectionId?: string;
  order: number;
}

export interface Section {
  id: string;
  name: string;
  rows: string[];
  subtotalRowId?: string;
  collapsed?: boolean;
}

export interface DashboardState {
  columns: Column[];
  columnGroups: ColumnGroup[];
  rows: Row[];
  sections: Section[];
  settings: DashboardSettings;
}

export interface DashboardSettings {
  decimalPlaces: number;
  capPercentAt100: boolean;
  defaultGrowthRate: number;
  projectionFormula: 'compound' | 'linear';
  showFormulas: boolean;
  highlightOver100: boolean;
}

export interface HistoryEntry {
  timestamp: number;
  cellId: string;
  previousValue: CellValue;
  newValue: CellValue;
  description: string;
}

export interface DashboardConfig {
  title: string;
  subtitle?: string;
  lastUpdated?: Date;
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeFormulas: boolean;
  includeColors: boolean;
}

export interface ShareOptions {
  permission: 'view' | 'edit';
  expiresAt?: Date;
}
