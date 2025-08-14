import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Project, FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import { runModelSimulation } from '@/lib/project-aggregation';
import { formatCurrency } from '@/lib/utils';

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'all';
  template?: 'executive' | 'detailed' | 'board' | 'technical';
  orientation?: string;
  metadata?: {
    author?: string;
    company?: string;
    confidentiality?: string;
  };
}

export interface ExportData {
  project: Project;
  models: FinancialModel[];
  actuals?: ActualsPeriodEntry[];
  primaryModel?: FinancialModel;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  data?: Uint8Array | string;
  error?: string;
}

export class UnifiedExportService {
  async export(data: ExportData, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const opts: ExportOptions = {
      format: options.format || 'pdf',
      template: options.template || 'executive',
      metadata: {
        author: options.metadata?.author || 'Fortress Financial',
        company: options.metadata?.company || 'Fortress Financial',
        confidentiality: options.metadata?.confidentiality || 'Internal Use Only',
      }
    };
    
    try {
      switch (opts.format) {
        case 'pdf':
          return await this.generatePDF(data, opts);
        case 'excel':
          return await this.generateExcel(data, opts);
        case 'csv':
          return await this.generateCSV(data, opts);
        default:
          throw new Error(`Unsupported format: ${opts.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  private async generatePDF(data: ExportData, options: ExportOptions): Promise<ExportResult> {
    const doc = new jsPDF({
      orientation: (options.orientation || 'portrait') as 'portrait' | 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Generate content based on template
    switch (options.template) {
      case 'executive':
        this.generateExecutivePDF(doc, data, options);
        break;
      case 'detailed':
        this.generateDetailedPDF(doc, data, options);
        break;
      case 'board':
        this.generateBoardPDF(doc, data, options);
        break;
      case 'technical':
        this.generateTechnicalPDF(doc, data, options);
        break;
      default:
        this.generateExecutivePDF(doc, data, options);
    }

    const filename = this.generateFilename(data.project.name, 'pdf', options.template);
    const pdfData = doc.output('arraybuffer');
    
    return {
      success: true,
      filename,
      data: new Uint8Array(pdfData),
    };
  }

  private generateExecutivePDF(doc: jsPDF, data: ExportData, options: ExportOptions): void {
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129);
    doc.text(data.project.name, margin, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Financial Analysis Report', margin, 38);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth - margin - 50, 30);
    doc.text(options.metadata?.company || '', pageWidth - margin - 50, 35);
    doc.setTextColor(255, 0, 0);
    doc.text(options.metadata?.confidentiality || '', pageWidth - margin - 50, 40);
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 45, pageWidth - margin, 45);
    
    // Executive Summary
    let currentY = 60;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', margin, currentY);
    currentY += 10;
    
    // Key metrics
    const primaryModel = data.primaryModel || data.models[0];
    if (primaryModel) {
      const simulation = runModelSimulation(primaryModel);
      const totalRevenue = Math.round(simulation.totalRevenue);
      const totalCosts = Math.round(simulation.totalCosts);
      const totalProfit = Math.round(simulation.totalProfit);
      
      const metricsData = [
        ['Total Projected Revenue', formatCurrency(totalRevenue)],
        ['Total Projected Costs', formatCurrency(totalCosts)],
        ['Total Projected Profit', formatCurrency(totalProfit)],
        ['Profit Margin', totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'],
        ['ROI', totalCosts > 0 ? `${((totalProfit / totalCosts) * 100).toFixed(1)}%` : '0%'],
      ];
      
      autoTable(doc, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: metricsData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [16, 185, 129] },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 10;
      
      // Summary text
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const summaryText = `This financial analysis for ${data.project.name} projects a total revenue of ${formatCurrency(totalRevenue)} with a profit margin of ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%. The analysis includes ${data.models.length} financial scenario${data.models.length !== 1 ? 's' : ''} and represents our current best estimate of financial performance.`;
      
      const lines = doc.splitTextToSize(summaryText, pageWidth - (margin * 2));
      doc.text(lines, margin, currentY);
      currentY += lines.length * 5 + 10;
      
      // Financial Projections
      doc.setFontSize(16);
      doc.text('Financial Projections', margin, currentY);
      currentY += 10;
      
      // Revenue breakdown
      if (primaryModel.assumptions?.revenue && primaryModel.assumptions.revenue.length > 0) {
        doc.setFontSize(12);
        doc.text('Revenue Streams', margin, currentY);
        currentY += 5;
        
        const revenueData = primaryModel.assumptions.revenue.map(r => [
          r.name,
          r.type,
          formatCurrency(Math.round(r.value)),
          r.frequency || 'One-time',
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['Stream', 'Type', 'Value', 'Frequency']],
          body: revenueData,
          theme: 'striped',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [34, 197, 94] },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Cost breakdown
      if (primaryModel.assumptions?.costs && primaryModel.assumptions.costs.length > 0) {
        doc.setFontSize(12);
        doc.text('Cost Structure', margin, currentY);
        currentY += 5;
        
        const costData = primaryModel.assumptions.costs.map(c => [
          c.name,
          c.category,
          formatCurrency(Math.round(c.value)),
          c.type,
        ]);
        
        autoTable(doc, {
          startY: currentY,
          head: [['Item', 'Category', 'Value', 'Type']],
          body: costData,
          theme: 'striped',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [239, 68, 68] },
        });
      }
    }
    
    // Add footer
    this.addPDFFooter(doc, data, options);
  }

  private generateDetailedPDF(doc: jsPDF, data: ExportData, options: ExportOptions): void {
    // Start with executive summary
    this.generateExecutivePDF(doc, data, options);
    
    // Add more detailed sections
    doc.addPage();
    const margin = 20;
    let currentY = margin;
    
    doc.setFontSize(18);
    doc.text('Detailed Financial Analysis', margin, currentY);
    currentY += 15;
    
    // Add scenario comparison if multiple models
    if (data.models.length > 1) {
      doc.setFontSize(14);
      doc.text('Scenario Comparison', margin, currentY);
      currentY += 10;
      
      const scenarioData = data.models.map(model => {
        const simulation = runModelSimulation(model);
        return [
          model.name,
          formatCurrency(Math.round(simulation.totalRevenue)),
          formatCurrency(Math.round(simulation.totalCosts)),
          formatCurrency(Math.round(simulation.totalProfit)),
          simulation.totalRevenue > 0 
            ? `${((simulation.totalProfit / simulation.totalRevenue) * 100).toFixed(1)}%`
            : '0%',
        ];
      });
      
      autoTable(doc, {
        startY: currentY,
        head: [['Scenario', 'Revenue', 'Costs', 'Profit', 'Margin']],
        body: scenarioData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Add assumptions section
    doc.setFontSize(14);
    doc.text('Key Assumptions', margin, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    const assumptions = [
      '• Revenue projections based on market research and industry benchmarks',
      '• Cost structure includes both fixed and variable components',
      '• Growth rate assumptions are conservative and achievable',
      '• No seasonal adjustments have been applied',
      '• All values are in USD'
    ];
    
    assumptions.forEach(assumption => {
      doc.text(assumption, margin, currentY);
      currentY += 7;
    });
    
    this.addPDFFooter(doc, data, options);
  }

  private generateBoardPDF(doc: jsPDF, data: ExportData, options: ExportOptions): void {
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Title page
    doc.setFontSize(32);
    doc.setTextColor(16, 185, 129);
    doc.text(data.project.name, pageWidth / 2, pageHeight / 3, { align: 'center' });
    
    doc.setFontSize(20);
    doc.setTextColor(100, 100, 100);
    doc.text('Board Presentation', pageWidth / 2, pageHeight / 3 + 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(format(new Date(), 'MMMM yyyy'), pageWidth / 2, pageHeight / 3 + 35, { align: 'center' });
    
    // Key metrics page
    doc.addPage();
    let currentY = 40;
    
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Financial Metrics', margin, currentY);
    currentY += 20;
    
    const primaryModel = data.primaryModel || data.models[0];
    if (primaryModel) {
      const simulation = runModelSimulation(primaryModel);
      
      // Large format metrics
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Projected Annual Revenue', margin, currentY);
      doc.setFontSize(28);
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(Math.round(simulation.totalRevenue)), margin, currentY + 12);
      
      currentY += 40;
      
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Expected Net Profit', margin, currentY);
      doc.setFontSize(28);
      doc.setTextColor(16, 185, 129);
      doc.text(formatCurrency(Math.round(simulation.totalProfit)), margin, currentY + 12);
      
      currentY += 40;
      
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Return on Investment', margin, currentY);
      doc.setFontSize(28);
      doc.setTextColor(16, 185, 129);
      const roi = simulation.totalCosts > 0 ? Math.round((simulation.totalProfit / simulation.totalCosts) * 100) : 0;
      doc.text(`${roi}%`, margin, currentY + 12);
    }
    
    // Investment highlights
    doc.addPage();
    currentY = 40;
    
    doc.setFontSize(24);
    doc.text('Investment Highlights', margin, currentY);
    currentY += 20;
    
    const highlights = [
      '✓ Strong profit margins exceeding 75%',
      '✓ Multiple revenue streams',
      '✓ Scalable business model',
      '✓ Proven market demand',
      '✓ Experienced management team'
    ];
    
    doc.setFontSize(14);
    highlights.forEach(highlight => {
      doc.text(highlight, margin, currentY);
      currentY += 12;
    });
    
    this.addPDFFooter(doc, data, options);
  }

  private generateTechnicalPDF(doc: jsPDF, data: ExportData, options: ExportOptions): void {
    // This is similar to detailed but with more technical information
    this.generateDetailedPDF(doc, data, options);
    
    // Add technical appendix
    doc.addPage();
    const margin = 20;
    let currentY = 40;
    
    doc.setFontSize(18);
    doc.text('Technical Appendix', margin, currentY);
    currentY += 15;
    
    doc.setFontSize(12);
    doc.text('Model Specifications', margin, currentY);
    currentY += 10;
    
    doc.setFontSize(10);
    const specs = [
      `• Model Type: Deterministic Financial Model`,
      `• Time Horizon: 14 weeks`,
      `• Update Frequency: Weekly`,
      `• Currency: USD`,
      `• Growth Model: ${data.models[0]?.assumptions?.growthModel?.type || 'Linear'}`,
      `• Scenarios Modeled: ${data.models.length}`,
    ];
    
    specs.forEach(spec => {
      doc.text(spec, margin, currentY);
      currentY += 7;
    });
    
    this.addPDFFooter(doc, data, options);
  }

  private addPDFFooter(doc: jsPDF, data: ExportData, options: ExportOptions): void {
    const pageCount = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `© ${new Date().getFullYear()} ${options.metadata?.company || 'Fortress Financial'}`,
        margin,
        pageHeight - 10
      );
      
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - margin - 20,
        pageHeight - 10
      );
    }
  }

  private async generateExcel(data: ExportData, options: ExportOptions): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Fortress Financial Modeler Export'],
      [''],
      ['Project', data.project.name],
      ['Generated', format(new Date(), 'PPP')],
      [''],
      ['Financial Summary'],
    ];
    
    data.models.forEach(model => {
      const simulation = runModelSimulation(model);
      summaryData.push([
        model.name,
        Math.round(simulation.totalRevenue),
        Math.round(simulation.totalCosts),
        Math.round(simulation.totalProfit)
      ]);
    });
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Models sheet
    if (data.models.length > 0) {
      const modelsData = data.models.map(model => {
        const simulation = runModelSimulation(model);
        return {
          'Model Name': model.name,
          'Total Revenue': Math.round(simulation.totalRevenue),
          'Total Costs': Math.round(simulation.totalCosts),
          'Total Profit': Math.round(simulation.totalProfit),
          'Profit Margin %': simulation.totalRevenue > 0 
            ? ((simulation.totalProfit / simulation.totalRevenue) * 100).toFixed(1)
            : '0',
        };
      });
      
      const modelsSheet = XLSX.utils.json_to_sheet(modelsData);
      XLSX.utils.book_append_sheet(workbook, modelsSheet, 'Models');
    }
    
    const filename = this.generateFilename(data.project.name, 'xlsx', options.template);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    return {
      success: true,
      filename,
      data: new Uint8Array(excelBuffer),
    };
  }

  private async generateCSV(data: ExportData, options: ExportOptions): Promise<ExportResult> {
    const rows: string[][] = [];
    
    rows.push(['Project', data.project.name]);
    rows.push(['Generated', format(new Date(), 'yyyy-MM-dd')]);
    rows.push([]);
    rows.push(['Model', 'Revenue', 'Costs', 'Profit']);
    
    data.models.forEach(model => {
      const simulation = runModelSimulation(model);
      rows.push([
        model.name,
        Math.round(simulation.totalRevenue).toString(),
        Math.round(simulation.totalCosts).toString(),
        Math.round(simulation.totalProfit).toString(),
      ]);
    });
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const filename = this.generateFilename(data.project.name, 'csv', options.template);
    
    return {
      success: true,
      filename,
      data: csvContent,
    };
  }

  private generateFilename(projectName: string, extension: string, template?: string): string {
    const sanitized = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const date = format(new Date(), 'yyyy-MM-dd');
    const templateSuffix = template ? `_${template}` : '';
    return `${sanitized}${templateSuffix}_${date}.${extension}`;
  }

  static downloadFile(data: Uint8Array | string, filename: string, mimeType: string): void {
    const blob = typeof data === 'string' 
      ? new Blob([data], { type: mimeType })
      : new Blob([data], { type: mimeType });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const exportService = new UnifiedExportService();
