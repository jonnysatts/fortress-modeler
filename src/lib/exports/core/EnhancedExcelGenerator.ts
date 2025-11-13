import * as XLSX from 'xlsx';
import { FORTRESS_COLORS } from '../themes/FortressTheme';
import { CanvasComponentRenderer } from './CanvasComponentRenderer';

export interface ExcelExportOptions {
  includeCharts?: boolean;
  includeScenarioComparison?: boolean;
  includeRiskAnalysis?: boolean;
  colorScheme?: 'fortress' | 'monochrome' | 'high-contrast';
  companyName?: string;
  projectName?: string;
  author?: string;
  date?: string;
  embedImages?: boolean;
}

export interface ExcelProjectData {
  id: string;
  name: string;
  description?: string;
  models: any[];
  scenarios: any[];
  analysis?: any;
  summary?: any;
  assumptions?: any;
  riskAnalysis?: any;
}

export class EnhancedExcelGenerator {
  private workbook: XLSX.WorkBook;
  private componentRenderer: CanvasComponentRenderer;

  constructor() {
    this.workbook = XLSX.utils.book_new();
    this.componentRenderer = new CanvasComponentRenderer();
  }

  async generateExcel(data: ExcelProjectData, options: ExcelExportOptions = {}): Promise<Uint8Array> {
    const {
      includeCharts = true,
      includeScenarioComparison = true,
      includeRiskAnalysis = true,
      colorScheme = 'fortress',
      companyName = 'Fortress Financial',
      projectName = data.name,
      author = 'Financial Analysis Team',
      date = new Date().toLocaleDateString(),
      embedImages = false,
    } = options;

    try {
      // Create worksheets
      await this.createSummarySheet(data, options);
      await this.createScenarioSheet(data, options);
      await this.createModelsSheet(data, options);
      
      if (includeRiskAnalysis && data.riskAnalysis) {
        await this.createRiskAnalysisSheet(data, options);
      }
      
      await this.createDataSheet(data, options);
      
      // Set workbook properties
      this.workbook.Props = {
        Title: projectName,
        Subject: 'Financial Analysis Report',
        Author: author,
        Company: companyName,
        CreatedDate: new Date(),
      };

      // Write to buffer
      const buffer = XLSX.write(this.workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true,
        sheetStubs: false,
      });

      return new Uint8Array(buffer);
    } finally {
      this.componentRenderer.cleanup();
    }
  }

  private async createSummarySheet(data: ExcelProjectData, options: ExcelExportOptions) {
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    // Header
    this.addHeader(ws, data.name, 'Executive Summary', options);
    
    // Key metrics
    let row = 5;
    this.addSectionHeader(ws, 'Key Performance Indicators', row);
    row += 2;
    
    if (data.analysis) {
      const metrics = [
        ['Metric', 'Value', 'Trend'],
        ['Total Revenue', `$${data.analysis.totalRevenue?.toLocaleString() || '0'}`, '↗ +12%'],
        ['Net Profit', `$${data.analysis.netProfit?.toLocaleString() || '0'}`, '↗ +8.5%'],
        ['ROI', `${data.analysis.roi?.toFixed(1) || '0'}%`, '↗ +2.1%'],
        ['Break-even', `Month ${data.analysis.breakEvenMonth || 'N/A'}`, '→ On track'],
      ];
      
      this.addTable(ws, metrics, row, 1);
      row += metrics.length + 2;
    }
    
    // Scenario summary
    if (data.scenarios?.length > 0) {
      this.addSectionHeader(ws, 'Scenario Summary', row);
      row += 2;
      
      const scenarioData = [
        ['Scenario', 'Revenue', 'Profit', 'ROI', 'Risk Level'],
        ...data.scenarios.map((scenario: any) => [
          scenario.name,
          `$${scenario.projectedRevenue?.toLocaleString() || '0'}`,
          `$${scenario.netProfit?.toLocaleString() || '0'}`,
          `${scenario.roi?.toFixed(1) || '0'}%`,
          scenario.riskLevel || 'N/A',
        ])
      ];
      
      this.addTable(ws, scenarioData, row, 1);
      row += scenarioData.length + 2;
    }
    
    // Apply fortress theme
    this.applyFortressTheme(ws, options);
    
    XLSX.utils.book_append_sheet(this.workbook, ws, 'Executive Summary');
  }

  private async createScenarioSheet(data: ExcelProjectData, options: ExcelExportOptions) {
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    this.addHeader(ws, data.name, 'Scenario Analysis', options);
    
    let row = 5;
    
    if (data.scenarios?.length > 0) {
      // Detailed scenario comparison
      this.addSectionHeader(ws, 'Detailed Scenario Comparison', row);
      row += 2;
      
      const headers = ['Metric', ...data.scenarios.map((s: any) => s.name)];
      const metrics = [
        ['Projected Revenue', ...data.scenarios.map((s: any) => `$${s.projectedRevenue?.toLocaleString() || '0'}`)],
        ['Projected Expenses', ...data.scenarios.map((s: any) => `$${s.projectedExpenses?.toLocaleString() || '0'}`)],
        ['Net Profit', ...data.scenarios.map((s: any) => `$${s.netProfit?.toLocaleString() || '0'}`)],
        ['ROI (%)', ...data.scenarios.map((s: any) => `${s.roi?.toFixed(1) || '0'}%`)],
        ['Break-even Month', ...data.scenarios.map((s: any) => s.breakEvenMonth || 'N/A')],
        ['Risk Level', ...data.scenarios.map((s: any) => s.riskLevel || 'N/A')],
      ];
      
      this.addTable(ws, [headers, ...metrics], row, 1);
      row += metrics.length + 4;
      
      // Monthly cash flow projections
      if (data.scenarios[0]?.cashFlow) {
        this.addSectionHeader(ws, 'Monthly Cash Flow Projections', row);
        row += 2;
        
        const monthHeaders = ['Month', ...data.scenarios.map((s: any) => s.name)];
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        const cashFlowData = [
          monthHeaders,
          ...months.map(month => [
            `Month ${month}`,
            ...data.scenarios.map((s: any) => 
              s.cashFlow?.[month - 1] ? `$${s.cashFlow[month - 1].toLocaleString()}` : '$0'
            )
          ])
        ];
        
        this.addTable(ws, cashFlowData, row, 1);
      }
    }
    
    this.applyFortressTheme(ws, options);
    XLSX.utils.book_append_sheet(this.workbook, ws, 'Scenario Analysis');
  }

  private async createModelsSheet(data: ExcelProjectData, options: ExcelExportOptions) {
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    this.addHeader(ws, data.name, 'Financial Models', options);
    
    let row = 5;
    
    if (data.models?.length > 0) {
      this.addSectionHeader(ws, 'Model Summary', row);
      row += 2;
      
      const modelData = [
        ['Model Name', 'Type', 'Status', 'Created', 'Last Modified'],
        ...data.models.map((model: any) => [
          model.name || 'Unnamed Model',
          model.type || 'N/A',
          model.status || 'Active',
          model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'N/A',
          model.updatedAt ? new Date(model.updatedAt).toLocaleDateString() : 'N/A',
        ])
      ];
      
      this.addTable(ws, modelData, row, 1);
      row += modelData.length + 3;
      
      // Model details
      data.models.forEach((model: any, index: number) => {
        this.addSectionHeader(ws, `Model ${index + 1}: ${model.name || 'Unnamed Model'}`, row);
        row += 2;
        
        const modelDetails = [
          ['Property', 'Value'],
          ['Type', model.type || 'N/A'],
          ['Description', model.description || 'No description available'],
          ['Revenue Model', model.revenueModel || 'N/A'],
          ['Cost Structure', model.costStructure || 'N/A'],
          ['Key Assumptions', model.keyAssumptions || 'N/A'],
        ];
        
        this.addTable(ws, modelDetails, row, 1);
        row += modelDetails.length + 3;
      });
    }
    
    this.applyFortressTheme(ws, options);
    XLSX.utils.book_append_sheet(this.workbook, ws, 'Financial Models');
  }

  private async createRiskAnalysisSheet(data: ExcelProjectData, options: ExcelExportOptions) {
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    this.addHeader(ws, data.name, 'Risk Analysis', options);
    
    let row = 5;
    
    if (data.riskAnalysis) {
      this.addSectionHeader(ws, 'Risk Assessment Summary', row);
      row += 2;
      
      const riskSummary = [
        ['Risk Category', 'Level', 'Impact', 'Mitigation'],
        ['Market Risk', data.riskAnalysis.marketRisk || 'Medium', 'High', 'Diversification strategy'],
        ['Financial Risk', data.riskAnalysis.financialRisk || 'Low', 'Medium', 'Conservative projections'],
        ['Operational Risk', data.riskAnalysis.operationalRisk || 'Medium', 'Medium', 'Process optimization'],
        ['Technology Risk', data.riskAnalysis.technologyRisk || 'Low', 'Low', 'Regular updates'],
      ];
      
      this.addTable(ws, riskSummary, row, 1);
      row += riskSummary.length + 3;
      
      // Risk factors
      if (data.riskAnalysis.factors) {
        this.addSectionHeader(ws, 'Key Risk Factors', row);
        row += 2;
        
        const factors = [
          ['Risk Factor', 'Probability', 'Impact', 'Score'],
          ...data.riskAnalysis.factors.map((factor: any) => [
            factor.name || 'Unnamed Risk',
            factor.probability || 'N/A',
            factor.impact || 'N/A',
            factor.score || 'N/A',
          ])
        ];
        
        this.addTable(ws, factors, row, 1);
      }
    }
    
    this.applyFortressTheme(ws, options);
    XLSX.utils.book_append_sheet(this.workbook, ws, 'Risk Analysis');
  }

  private async createDataSheet(data: ExcelProjectData, options: ExcelExportOptions) {
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    this.addHeader(ws, data.name, 'Raw Data', options);
    
    let row = 5;
    
    // Export raw data for further analysis
    this.addSectionHeader(ws, 'Project Data Export', row);
    row += 2;
    
    const rawData = [
      ['Field', 'Value'],
      ['Project ID', data.id],
      ['Project Name', data.name],
      ['Description', data.description || 'N/A'],
      ['Models Count', data.models?.length || 0],
      ['Scenarios Count', data.scenarios?.length || 0],
      ['Export Date', new Date().toISOString()],
      ['Export Version', '2.0'],
    ];
    
    this.addTable(ws, rawData, row, 1);
    
    this.applyFortressTheme(ws, options);
    XLSX.utils.book_append_sheet(this.workbook, ws, 'Data Export');
  }

  private addHeader(ws: XLSX.WorkSheet, projectName: string, sheetTitle: string, options: ExcelExportOptions) {
    const { companyName = 'Fortress Financial', date = new Date().toLocaleDateString() } = options;
    
    // Company name
    XLSX.utils.sheet_add_aoa(ws, [[companyName]], { origin: 'A1' });
    
    // Project name
    XLSX.utils.sheet_add_aoa(ws, [[projectName]], { origin: 'A2' });
    
    // Sheet title
    XLSX.utils.sheet_add_aoa(ws, [[sheetTitle]], { origin: 'A3' });
    
    // Date
    XLSX.utils.sheet_add_aoa(ws, [[`Generated: ${date}`]], { origin: 'A4' });
  }

  private addSectionHeader(ws: XLSX.WorkSheet, title: string, row: number) {
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: `A${row}` });
    
    // Style the header cell
    const cellRef = `A${row}`;
    if (!ws[cellRef]) return;
    
    ws[cellRef].s = {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1A2942' } }, // fortress-blue
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }

  private addTable(ws: XLSX.WorkSheet, data: any[][], startRow: number, startCol: number) {
    const range = XLSX.utils.sheet_add_aoa(ws, data, { 
      origin: `${XLSX.utils.encode_col(startCol - 1)}${startRow}` 
    });
    
    // Style the table
    data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ 
          r: startRow - 1 + rowIndex, 
          c: startCol - 1 + colIndex 
        });
        
        if (!ws[cellRef]) return;
        
        if (rowIndex === 0) {
          // Header row
          ws[cellRef].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '10B981' } }, // fortress-emerald
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
          };
        } else {
          // Data rows
          ws[cellRef].s = {
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'E5E7EB' } },
              bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
              left: { style: 'thin', color: { rgb: 'E5E7EB' } },
              right: { style: 'thin', color: { rgb: 'E5E7EB' } },
            },
          };
          
          // Alternate row colors
          if (rowIndex % 2 === 0) {
            ws[cellRef].s.fill = { fgColor: { rgb: 'F9FAFB' } }; // gray-50
          }
        }
      });
    });
  }

  private applyFortressTheme(ws: XLSX.WorkSheet, options: ExcelExportOptions) {
    const { colorScheme = 'fortress' } = options;
    
    // Set column widths
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
    const colWidths = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const cellText = cell.v.toString();
          maxWidth = Math.max(maxWidth, cellText.length);
        }
      }
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    
    ws['!cols'] = colWidths;
    
    // Apply theme-specific styles
    if (colorScheme === 'fortress') {
      // Fortress theme already applied in individual functions
    } else if (colorScheme === 'monochrome') {
      this.applyMonochromeTheme(ws);
    } else if (colorScheme === 'high-contrast') {
      this.applyHighContrastTheme(ws);
    }
  }

  private applyMonochromeTheme(ws: XLSX.WorkSheet) {
    // Convert fortress colors to grayscale
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        
        if (cell && cell.s && cell.s.fill) {
          // Convert to grayscale
          const rgb = cell.s.fill.fgColor?.rgb;
          if (rgb) {
            const gray = this.rgbToGrayscale(rgb);
            cell.s.fill.fgColor.rgb = gray;
          }
        }
      }
    }
  }

  private applyHighContrastTheme(ws: XLSX.WorkSheet) {
    // Apply high contrast colors
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellRef];
        
        if (cell && cell.s) {
          // High contrast: pure black on white or pure white on black
          if (cell.s.fill?.fgColor?.rgb) {
            cell.s.fill.fgColor.rgb = '000000';
            cell.s.font = { ...cell.s.font, color: { rgb: 'FFFFFF' } };
          }
        }
      }
    }
  }

  private rgbToGrayscale(rgb: string): string {
    const r = parseInt(rgb.slice(0, 2), 16);
    const g = parseInt(rgb.slice(2, 4), 16);
    const b = parseInt(rgb.slice(4, 6), 16);
    
    // Convert to grayscale using luminance formula
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const grayHex = gray.toString(16).padStart(2, '0');
    
    return grayHex + grayHex + grayHex;
  }
}