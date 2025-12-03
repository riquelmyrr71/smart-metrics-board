import { Row, Column, DashboardSettings, ExportOptions, ColumnGroup } from '@/types/dashboard';
import { FormulaEngine } from './formulaEngine';

export const exportToCSV = (
  rows: Row[],
  columns: Column[],
  columnGroups: ColumnGroup[],
  settings: DashboardSettings,
  includeFormulas: boolean = false
): string => {
  const lines: string[] = [];
  
  // Add column group headers
  const groupHeader = columns.map(col => {
    const group = columnGroups.find(g => g.columns.includes(col.id));
    return group?.name || '';
  });
  lines.push(groupHeader.map(v => `"${v}"`).join(','));
  
  // Add column headers
  const header = columns.map(col => col.name);
  lines.push(header.map(v => `"${v}"`).join(','));
  
  // Add data rows
  rows.forEach(row => {
    if (row.type === 'section-header') {
      // Section header as merged cell simulation
      const firstCell = Object.values(row.cells)[0];
      const sectionName = firstCell?.value.raw || '';
      lines.push(`"${sectionName}"` + ','.repeat(columns.length - 1));
      return;
    }
    
    const rowData = columns.map(col => {
      const cell = row.cells[col.id];
      if (!cell) return '';
      
      if (includeFormulas && cell.value.formula) {
        return `"${cell.value.formula}"`;
      }
      
      const value = cell.value.displayValue || String(cell.value.raw || '');
      // Escape quotes and wrap in quotes
      return `"${value.replace(/"/g, '""')}"`;
    });
    
    lines.push(rowData.join(','));
  });
  
  return lines.join('\n');
};

export const downloadCSV = (
  content: string,
  filename: string = 'dashboard-export.csv'
) => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generatePDFContent = (
  rows: Row[],
  columns: Column[],
  columnGroups: ColumnGroup[],
  settings: DashboardSettings,
  title: string = 'Dashboard Report'
): string => {
  // Exact colors from the design system (light mode)
  const colors = {
    primary: '#8B1538',
    secondary: '#661230',
    background: '#f5f5f5',
    card: '#ffffff',
    rowEven: '#ffffff',
    rowOdd: '#f7f7f7',
    rowSubtotal: '#993d52',
    rowTotal: '#8B1538',
    cellBorder: '#e0e0e0',
    // Column group colors
    colRecruitment: '#fbe9dd',
    colRecruitmentHeader: '#dfb499',
    colDiamonds: '#dcdee3',
    colDiamondsHeader: '#9ea2a9',
    // Status colors
    positive: '#22c55e',
    negative: '#ef4444',
    warning: '#f59e0b',
    over100: '#be185d',
  };

  const styles = `
    <style>
      @page { 
        size: A4 landscape; 
        margin: 8mm; 
      }
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        font-size: 8px; 
        color: #1a1a1a; 
        background: ${colors.background};
        padding: 10px;
      }
      .container {
        background: ${colors.card};
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        table-layout: fixed;
      }
      th, td { 
        padding: 3px 4px; 
        border: 1px solid ${colors.cellBorder}; 
        text-align: right; 
        font-size: 7px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      th { 
        font-weight: 600; 
        font-size: 7px;
      }
      .group-header-recruitment {
        background: ${colors.colRecruitmentHeader};
        color: #1a1a1a;
      }
      .group-header-diamonds {
        background: ${colors.colDiamondsHeader};
        color: #1a1a1a;
      }
      .group-header-info {
        background: ${colors.primary};
        color: white;
      }
      .col-header-recruitment {
        background: ${colors.colRecruitmentHeader};
        color: #1a1a1a;
      }
      .col-header-diamonds {
        background: ${colors.colDiamondsHeader};
        color: #1a1a1a;
      }
      .col-header-info {
        background: ${colors.primary};
        color: white;
      }
      .col-recruitment {
        background: ${colors.colRecruitment};
      }
      .col-diamonds {
        background: ${colors.colDiamonds};
      }
      .section-header { 
        background: ${colors.secondary}; 
        color: white; 
        font-weight: 600; 
        text-align: center !important;
        font-size: 8px;
      }
      .subtotal { 
        background: ${colors.colRecruitmentHeader}; 
        font-weight: 600; 
      }
      .subtotal-diamonds {
        background: ${colors.colDiamondsHeader};
        font-weight: 600;
      }
      .total { 
        background: ${colors.rowTotal}; 
        color: white; 
        font-weight: 700; 
      }
      .text-left { text-align: left !important; }
      .text-center { text-align: center !important; }
      .positive { color: ${colors.positive}; font-weight: 600; }
      .negative { color: ${colors.negative}; font-weight: 600; }
      .over100 { color: ${colors.over100}; font-weight: 700; }
      .row-even { background: ${colors.rowEven}; }
      .row-odd { background: ${colors.rowOdd}; }
      .font-mono { font-family: 'Consolas', monospace; }
    </style>
  `;
  
  // Get column group info
  const getColumnGroup = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    return col?.group || 'info';
  };
  
  let tableContent = '<div class="container"><table>';
  
  // Column group headers
  tableContent += '<tr>';
  columnGroups.forEach(group => {
    let headerClass = 'group-header-info';
    if (group.id === 'recrutamento') headerClass = 'group-header-recruitment';
    else if (group.id === 'diamantes') headerClass = 'group-header-diamonds';
    
    tableContent += `<th class="${headerClass} text-center" colspan="${group.columns.length}">${group.name}</th>`;
  });
  tableContent += '</tr>';
  
  // Column headers
  tableContent += '<tr>';
  columns.forEach(col => {
    const align = col.align === 'left' ? 'text-left' : '';
    let headerClass = 'col-header-info';
    if (col.group === 'recrutamento') headerClass = 'col-header-recruitment';
    else if (col.group === 'diamantes') headerClass = 'col-header-diamonds';
    
    tableContent += `<th class="${headerClass} ${align}">${col.name}</th>`;
  });
  tableContent += '</tr>';
  
  // Data rows
  let dataRowIndex = 0;
  rows.forEach((row) => {
    if (row.type === 'section-header') {
      const firstCell = Object.values(row.cells)[0];
      tableContent += `<tr><td colspan="${columns.length}" class="section-header">${firstCell?.value.raw || ''}</td></tr>`;
      return;
    }
    
    if (row.type === 'subtotal') {
      tableContent += '<tr>';
      columns.forEach(col => {
        const cell = row.cells[col.id];
        const value = cell?.value.displayValue || String(cell?.value.raw || '-');
        const align = col.align === 'left' ? 'text-left' : '';
        const colClass = col.group === 'diamantes' ? 'subtotal-diamonds' : 'subtotal';
        const monoClass = (col.type === 'number' || col.type === 'percentage' || col.type === 'currency') ? 'font-mono' : '';
        tableContent += `<td class="${colClass} ${align} ${monoClass}">${value}</td>`;
      });
      tableContent += '</tr>';
      return;
    }
    
    if (row.type === 'total') {
      tableContent += '<tr>';
      columns.forEach(col => {
        const cell = row.cells[col.id];
        const value = cell?.value.displayValue || String(cell?.value.raw || '-');
        const align = col.align === 'left' ? 'text-left' : '';
        const monoClass = (col.type === 'number' || col.type === 'percentage' || col.type === 'currency') ? 'font-mono' : '';
        tableContent += `<td class="total ${align} ${monoClass}">${value}</td>`;
      });
      tableContent += '</tr>';
      return;
    }
    
    // Data row
    const rowClass = dataRowIndex % 2 === 0 ? 'row-even' : 'row-odd';
    dataRowIndex++;
    
    tableContent += `<tr class="${rowClass}">`;
    columns.forEach(col => {
      const cell = row.cells[col.id];
      const value = cell?.value.displayValue || String(cell?.value.raw || '-');
      const align = col.align === 'left' ? 'text-left' : '';
      
      let colBgClass = '';
      if (col.group === 'recrutamento') colBgClass = 'col-recruitment';
      else if (col.group === 'diamantes') colBgClass = 'col-diamonds';
      
      let valueClass = '';
      if (cell?.value.type === 'percentage') {
        const numValue = typeof cell.value.raw === 'number' ? cell.value.raw : parseFloat(String(cell.value.raw));
        const percentValue = Math.abs(numValue) <= 2 ? numValue * 100 : numValue;
        
        if (percentValue > 100) {
          valueClass = 'over100';
        } else if (percentValue >= 80) {
          valueClass = 'positive';
        } else if (percentValue < 50) {
          valueClass = 'negative';
        }
      }
      
      const monoClass = (col.type === 'number' || col.type === 'percentage' || col.type === 'currency') ? 'font-mono' : '';
      tableContent += `<td class="${colBgClass} ${align} ${valueClass} ${monoClass}">${value}</td>`;
    });
    tableContent += '</tr>';
  });
  
  tableContent += '</table></div>';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      ${tableContent}
    </body>
    </html>
  `;
};

export const downloadPDF = async (
  rows: Row[],
  columns: Column[],
  columnGroups: ColumnGroup[],
  settings: DashboardSettings,
  title: string = 'Dashboard Report'
) => {
  const htmlContent = generatePDFContent(rows, columns, columnGroups, settings, title);
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
};

export const parseClipboardData = (clipboardText: string): string[][] => {
  // Parse tab-separated or comma-separated values
  const lines = clipboardText.trim().split(/\r?\n/);
  
  return lines.map(line => {
    // Try tab-separated first (Excel default)
    if (line.includes('\t')) {
      return line.split('\t');
    }
    // Then comma-separated
    return line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
  });
};
