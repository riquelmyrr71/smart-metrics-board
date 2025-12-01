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
  // Generate HTML content for PDF
  const styles = `
    <style>
      @page { size: landscape; margin: 10mm; }
      body { font-family: 'Inter', Arial, sans-serif; font-size: 9px; color: #1a1a1a; }
      h1 { font-size: 16px; color: #8B1538; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 4px 6px; border: 1px solid #ddd; text-align: right; }
      th { background: #8B1538; color: white; font-weight: 600; }
      .section-header { background: #5c0f26; color: white; font-weight: 600; text-align: left; }
      .subtotal { background: #a64d6a; color: white; font-weight: 600; }
      .total { background: #8B1538; color: white; font-weight: 700; }
      .text-left { text-align: left; }
      .positive { color: #16a34a; }
      .negative { color: #dc2626; }
      .over100 { color: #be185d; font-weight: 700; }
      .row-even { background: #fff; }
      .row-odd { background: #f7f7f7; }
      .group-header { background: #5c0f26; color: white; font-weight: 600; text-align: center; }
    </style>
  `;
  
  let tableContent = '<table>';
  
  // Column group headers
  tableContent += '<tr>';
  let currentGroup = '';
  let colspan = 0;
  
  columns.forEach((col, index) => {
    const group = columnGroups.find(g => g.columns.includes(col.id));
    const groupName = group?.name || '';
    
    if (groupName !== currentGroup) {
      if (colspan > 0) {
        tableContent += `<th class="group-header" colspan="${colspan}">${currentGroup}</th>`;
      }
      currentGroup = groupName;
      colspan = 1;
    } else {
      colspan++;
    }
    
    if (index === columns.length - 1) {
      tableContent += `<th class="group-header" colspan="${colspan}">${currentGroup}</th>`;
    }
  });
  tableContent += '</tr>';
  
  // Column headers
  tableContent += '<tr>';
  columns.forEach(col => {
    const align = col.align === 'left' ? 'text-left' : '';
    tableContent += `<th class="${align}">${col.name}</th>`;
  });
  tableContent += '</tr>';
  
  // Data rows
  rows.forEach((row, rowIndex) => {
    let rowClass = '';
    
    switch (row.type) {
      case 'section-header':
        rowClass = 'section-header';
        break;
      case 'subtotal':
        rowClass = 'subtotal';
        break;
      case 'total':
        rowClass = 'total';
        break;
      default:
        rowClass = rowIndex % 2 === 0 ? 'row-even' : 'row-odd';
    }
    
    tableContent += `<tr class="${rowClass}">`;
    
    if (row.type === 'section-header') {
      const firstCell = Object.values(row.cells)[0];
      tableContent += `<td colspan="${columns.length}" class="section-header">${firstCell?.value.raw || ''}</td>`;
    } else {
      columns.forEach(col => {
        const cell = row.cells[col.id];
        const value = cell?.value.displayValue || String(cell?.value.raw || '-');
        const align = col.align === 'left' ? 'text-left' : '';
        
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
        
        tableContent += `<td class="${align} ${valueClass}">${value}</td>`;
      });
    }
    
    tableContent += '</tr>';
  });
  
  tableContent += '</table>';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      <h1>${title}</h1>
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
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
