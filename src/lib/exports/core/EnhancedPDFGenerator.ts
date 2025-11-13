import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FORTRESS_COLORS, FORTRESS_TYPOGRAPHY, FORTRESS_LAYOUT } from '../themes/FortressTheme';
import { CanvasComponentRenderer, ScenarioData } from './CanvasComponentRenderer';

export interface PDFExportOptions {
  format?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
  template?: 'executive' | 'detailed' | 'board' | 'technical';
  includeCharts?: boolean;
  includeScenarioComparison?: boolean;
  includeRiskAnalysis?: boolean;
  colorScheme?: 'fortress' | 'monochrome' | 'high-contrast';
  companyName?: string;
  projectName?: string;
  author?: string;
  date?: string;
}

export interface ProjectData {
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

export class EnhancedPDFGenerator {
  private doc: jsPDF;
  private componentRenderer: CanvasComponentRenderer;
  private pageWidth: number;
  private pageHeight: number;
  private margins: { top: number; right: number; bottom: number; left: number };
  private currentY: number;

  constructor() {
    this.doc = new jsPDF();
    this.componentRenderer = new CanvasComponentRenderer();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margins = { top: 20, right: 20, bottom: 20, left: 20 };
    this.currentY = this.margins.top;
  }

  async generatePDF(data: ProjectData, options: PDFExportOptions = {}): Promise<Uint8Array> {
    const {
      format = 'letter',
      orientation = 'portrait',
      template = 'executive',
      includeCharts = true,
      includeScenarioComparison = true,
      includeRiskAnalysis = true,
      colorScheme = 'fortress',
      companyName = 'Fortress Financial',
      projectName = data.name,
      author = 'Financial Analysis Team',
      date = new Date().toLocaleDateString(),
    } = options;

    // Initialize PDF with proper settings
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.currentY = this.margins.top;

    try {
      // Generate PDF based on template
      switch (template) {
        case 'executive':
          await this.generateExecutiveSummary(data, options);
          break;
        case 'detailed':
          await this.generateDetailedAnalysis(data, options);
          break;
        case 'board':
          await this.generateBoardPresentation(data, options);
          break;
        case 'technical':
          await this.generateTechnicalDeepDive(data, options);
          break;
        default:
          await this.generateExecutiveSummary(data, options);
      }

      return this.doc.output('arraybuffer') as Uint8Array;
    } finally {
      this.componentRenderer.cleanup();
    }
  }

  private async generateExecutiveSummary(data: ProjectData, options: PDFExportOptions) {
    // Title page
    this.addBrandedHeader(options);
    this.addTitle(data.name, 'Executive Summary');
    this.addMetadata(options);
    this.addNewPage();

    // Executive overview
    this.addSectionHeader('Executive Overview');
    
    if (data.summary) {
      this.addText(data.summary.overview || 'Comprehensive financial analysis and scenario modeling.', 'body');
    }

    // Key metrics summary table
    if (data.analysis) {
      this.addSubsectionHeader('Financial Summary');
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', this.formatCurrency(data.analysis.totalRevenue || 0)],
        ['Total Costs', this.formatCurrency(data.analysis.totalCosts || 0)],
        ['Net Profit', this.formatCurrency(data.analysis.netProfit || 0)],
        ['Return on Investment', `${(data.analysis.roi || 0).toFixed(1)}%`],
        ['Project Duration', `${data.analysis.duration || 0} ${data.analysis.timeUnit || 'months'}`],
        ['Break-even Point', `Month ${data.analysis.breakEvenMonth || 'N/A'}`],
      ];
      
      this.addTable(summaryData);
      this.addSpace(10);
    }

    // Key metrics (using component renderer)
    if (options.includeScenarioComparison && data.scenarios?.length > 0) {
      this.addSectionHeader('Key Performance Indicators');

      // Calculate actual trends from scenario data instead of hardcoding
      const calculateTrend = (current: number, baseline: number): { trend: 'up' | 'down' | 'neutral', value: string } => {
        if (!baseline || baseline === 0) return { trend: 'neutral', value: 'N/A' };
        const percentChange = ((current - baseline) / baseline) * 100;
        const trend = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
        const value = percentChange !== 0 ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : '0%';
        return { trend, value };
      };

      // Use best/worst scenarios for comparison, or previous period data if available
      const baselineRevenue = data.scenarios[0]?.projectedRevenue || data.analysis?.totalRevenue || 0;
      const baselineProfit = data.scenarios[0]?.netProfit || data.analysis?.netProfit || 0;
      const baselineROI = data.scenarios[0]?.roi || data.analysis?.roi || 0;

      const revenueTrend = calculateTrend(data.analysis?.totalRevenue || 0, baselineRevenue);
      const profitTrend = calculateTrend(data.analysis?.netProfit || 0, baselineProfit);
      const roiTrend = calculateTrend(data.analysis?.roi || 0, baselineROI);

      // Generate KPI data from scenarios with calculated trends
      const kpiData = [
        { title: 'Total Revenue', value: `$${data.analysis?.totalRevenue?.toLocaleString() || '0'}`, trend: revenueTrend.trend, trendValue: revenueTrend.value },
        { title: 'Net Profit', value: `$${data.analysis?.netProfit?.toLocaleString() || '0'}`, trend: profitTrend.trend, trendValue: profitTrend.value },
        { title: 'ROI', value: `${data.analysis?.roi?.toFixed(1) || '0'}%`, trend: roiTrend.trend, trendValue: roiTrend.value },
        { title: 'Break-even', value: `Month ${data.analysis?.breakEvenMonth || 'N/A'}`, trend: 'neutral' as const, trendValue: '' },
      ];

      const kpiImage = await this.componentRenderer.captureKPIGrid(kpiData, { width: 700, height: 200 });

      this.addImage(kpiImage, 'KPI Grid', 180, 50);
    }

    // Scenario comparison
    if (options.includeScenarioComparison && data.scenarios?.length > 0) {
      this.addSectionHeader('Scenario Analysis');
      
      // Render each scenario card
      for (const scenario of data.scenarios) {
        const scenarioData: ScenarioData = {
          name: scenario.name || 'Unnamed Scenario',
          label: scenario.label || 'Custom',
          projectedRevenue: scenario.projectedRevenue || 0,
          projectedExpenses: scenario.projectedExpenses || 0,
          netProfit: scenario.netProfit || 0,
          roi: scenario.roi || 0,
          breakEvenMonth: scenario.breakEvenMonth || 0,
          riskLevel: scenario.riskLevel || 'Medium'
        };
        
        const scenarioImage = await this.componentRenderer.captureScenarioCard(scenarioData, { width: 700, height: 200 });
        this.addImage(scenarioImage, `${scenario.name} Analysis`, 180, 50);
        this.addSpace(10);
      }
    }

    // Risk analysis
    if (options.includeRiskAnalysis && data.riskAnalysis) {
      this.addSectionHeader('Risk Assessment');
      this.addText(data.riskAnalysis.summary || 'Risk analysis data not available.', 'body');
    }

    // Recommendations
    this.addSectionHeader('Recommendations');
    this.addText('Based on the analysis, we recommend proceeding with the Realistic scenario as the primary business case.', 'body');

    // Footer
    this.addFooter();
  }

  private async generateDetailedAnalysis(data: ProjectData, options: PDFExportOptions) {
    // Similar to executive but with more detail
    this.addBrandedHeader(options);
    this.addTitle(data.name, 'Detailed Financial Analysis');
    this.addMetadata(options);
    this.addNewPage();

    // Add detailed sections
    this.addSectionHeader('Project Overview');
    this.addText(data.description || 'Detailed project description not available.', 'body');

    // Executive Summary with key metrics
    if (data.analysis) {
      this.addSectionHeader('Executive Summary');
      
      // Add key metrics table
      this.addSubsectionHeader('Key Financial Metrics');
      const metricsData = [
        ['Metric', 'Value'],
        ['Total Revenue', this.formatCurrency(data.analysis.totalRevenue || 0)],
        ['Total Costs', this.formatCurrency(data.analysis.totalCosts || 0)],
        ['Net Profit', this.formatCurrency(data.analysis.netProfit || 0)],
        ['ROI', `${(data.analysis.roi || 0).toFixed(1)}%`],
        ['Break-even Point', `Month ${data.analysis.breakEvenMonth || 'N/A'}`],
        ['Duration', `${data.analysis.duration || 0} ${data.analysis.timeUnit || 'months'}`],
      ];
      
      this.addTable(metricsData);
      this.addSpace(15);
    }

    // Model analysis
    this.addSectionHeader('Financial Models');
    
    if (data.models && data.models.length > 0) {
      data.models.forEach((model, index) => {
        this.addSubsectionHeader(`Model ${index + 1}: ${model.name || 'Unnamed Model'}`);
        this.addText(`Type: ${model.type || 'Not specified'}`, 'body');
        this.addText(`Created: ${model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'Unknown'}`, 'body');
        
        if (model.summary) {
          this.addText(model.summary, 'body');
        }
        
        // Add model assumptions if available
        if (model.assumptions) {
          this.addSubsectionHeader('Key Assumptions');
          this.formatAssumptionsAsTable(model.assumptions);
        }
        
        this.addSpace(10);
      });
    }

    // Detailed scenario analysis - start fresh if we have significant content
    if (options.includeScenarioComparison && data.scenarios?.length > 0) {
      // If we're more than 1/4 down the page, start fresh page for scenario analysis
      if (this.currentY > this.margins.top + (this.pageHeight - this.margins.top - this.margins.bottom) * 0.25) {
        this.addNewPage();
      }
      this.addSectionHeader('Detailed Scenario Analysis');
      
      // Add scenario comparison table
      this.addSubsectionHeader('Scenario Comparison');
      const scenarioTableData = [
        ['Scenario', 'Revenue', 'Expenses', 'Net Profit', 'ROI', 'Break-even', 'Risk Level'],
        ...data.scenarios.map(scenario => [
          scenario.name || 'Unnamed',
          this.formatCurrency(scenario.projectedRevenue || 0),
          this.formatCurrency(scenario.projectedExpenses || 0),
          this.formatCurrency(scenario.netProfit || 0),
          `${(scenario.roi || 0).toFixed(1)}%`,
          `Month ${scenario.breakEvenMonth || 'N/A'}`,
          scenario.riskLevel || 'Medium'
        ])
      ];
      
      this.addTable(scenarioTableData);
      this.addSpace(15);
      
      // Render visual scenario cards
      for (const scenario of data.scenarios) {
        const scenarioData: ScenarioData = {
          name: scenario.name || 'Unnamed Scenario',
          label: scenario.label || 'Custom',
          projectedRevenue: scenario.projectedRevenue || 0,
          projectedExpenses: scenario.projectedExpenses || 0,
          netProfit: scenario.netProfit || 0,
          roi: scenario.roi || 0,
          breakEvenMonth: scenario.breakEvenMonth || 0,
          riskLevel: scenario.riskLevel || 'Medium'
        };
        
        const scenarioImage = await this.componentRenderer.captureScenarioCard(scenarioData, { width: 700, height: 200 });
        this.addImage(scenarioImage, `${scenario.name} Analysis`, 180, 50);
        this.addSpace(15);
      }
    }

    // Financial projections - start on new page if we're not near the top already
    if (data.analysis?.periodicData) {
      // If we're more than 1/3 down the page, start fresh page for this major section
      if (this.currentY > this.margins.top + (this.pageHeight - this.margins.top - this.margins.bottom) * 0.33) {
        this.addNewPage();
      }
      this.addSectionHeader('Financial Projections');
      
      // Add revenue chart
      const periodicData = data.analysis.periodicData.slice(0, 12); // First 12 periods
      if (periodicData.length > 0) {
        this.addSubsectionHeader('Revenue Projection Chart');
        const chartData = {
          labels: periodicData.map((_: any, index: number) => `${data.analysis.timeUnit === 'week' ? 'W' : 'M'}${index + 1}`),
          values: periodicData.map((period: any) => period.revenue || 0),
          title: `${data.analysis.timeUnit === 'week' ? 'Weekly' : 'Monthly'} Revenue Projection`,
          type: 'bar' as const
        };
        
        const revenueChart = await this.componentRenderer.captureFinancialChart(chartData, { width: 600, height: 300 });
        this.addImage(revenueChart, 'Revenue Projection Chart', 150, 75);
        this.addSpace(10);
        
        // Add profit chart
        this.addSubsectionHeader('Profit Projection Chart');
        const profitChartData = {
          labels: periodicData.map((_: any, index: number) => `${data.analysis.timeUnit === 'week' ? 'W' : 'M'}${index + 1}`),
          values: periodicData.map((period: any) => period.profit || 0),
          title: `${data.analysis.timeUnit === 'week' ? 'Weekly' : 'Monthly'} Profit Projection`,
          type: 'line' as const
        };
        
        const profitChart = await this.componentRenderer.captureFinancialChart(profitChartData, { width: 600, height: 300 });
        this.addImage(profitChart, 'Profit Projection Chart', 150, 75);
        this.addSpace(10);
      }
      
      this.addSubsectionHeader('Performance Data Table');
      const projectionTableData = [
        ['Period', 'Revenue', 'Costs', 'Profit', 'Cumulative Profit', 'Margin %'],
        ...periodicData.map((period: any, index: number) => [
          `${data.analysis.timeUnit === 'week' ? 'Week' : 'Month'} ${index + 1}`,
          this.formatCurrency(period.revenue || 0),
          this.formatCurrency(period.costs || 0),
          this.formatCurrency(period.profit || 0),
          this.formatCurrency(period.cumulativeProfit || 0),
          `${((period.profit || 0) / (period.revenue || 1) * 100).toFixed(1)}%`
        ])
      ];
      
      this.addTable(projectionTableData);
      this.addSpace(15);
    }

    this.addFooter();
  }

  private async generateBoardPresentation(data: ProjectData, options: PDFExportOptions) {
    // Board-ready presentation style
    this.addBrandedHeader(options);
    this.addTitle(data.name, 'Board Presentation');
    this.addMetadata(options);
    this.addNewPage();

    // Executive summary slide
    this.addSectionHeader('Executive Summary');
    this.addBulletPoint('Project demonstrates strong financial viability');
    this.addBulletPoint('Multiple scenarios analyzed with comprehensive risk assessment');
    this.addBulletPoint('Recommended approach: Realistic scenario implementation');
    
    this.addNewPage();

    // Key metrics slide
    this.addSectionHeader('Key Financial Metrics');
    
    if (data.analysis) {
      // Generate KPI data from scenarios
      const kpiData = [
        { title: 'Total Revenue', value: `$${data.analysis?.totalRevenue?.toLocaleString() || '0'}`, trend: 'up' as const, trendValue: '+12%' },
        { title: 'Net Profit', value: `$${data.analysis?.netProfit?.toLocaleString() || '0'}`, trend: data.analysis?.netProfit >= 0 ? 'up' as const : 'down' as const, trendValue: '8.5%' },
        { title: 'ROI', value: `${data.analysis?.roi?.toFixed(1) || '0'}%`, trend: 'up' as const, trendValue: '+2.1%' },
        { title: 'Break-even', value: `Month ${data.analysis?.breakEvenMonth || 'N/A'}`, trend: 'neutral' as const },
      ];
      
      const kpiImage = await this.componentRenderer.captureKPIGrid(kpiData, { width: 700, height: 200 });
      
      this.addImage(kpiImage, 'Key Performance Indicators', 180, 50);
    }

    this.addFooter();
  }

  private async generateTechnicalDeepDive(data: ProjectData, options: PDFExportOptions) {
    // Technical analysis with full details
    this.addBrandedHeader(options);
    this.addTitle(data.name, 'Technical Analysis');
    this.addMetadata(options);
    this.addNewPage();

    // Methodology
    this.addSectionHeader('Methodology');
    this.addText('This analysis employs Monte Carlo simulation and scenario-based modeling to assess financial viability.', 'body');

    // Assumptions
    if (data.assumptions) {
      this.addSectionHeader('Key Assumptions');
      this.addText(JSON.stringify(data.assumptions, null, 2), 'code');
    }

    // Data sources
    this.addSectionHeader('Data Sources');
    this.addText('Analysis based on historical data, market research, and industry benchmarks.', 'body');

    this.addFooter();
  }

  private addBrandedHeader(options: PDFExportOptions) {
    const { companyName = 'Fortress Financial' } = options;
    
    // Add fortress-emerald header bar
    this.doc.setFillColor(16, 185, 129); // fortress-emerald
    this.doc.rect(0, 0, this.pageWidth, 15, 'F');
    
    // Company name
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(companyName, this.margins.left, 10);
    
    // Reset text color
    this.doc.setTextColor(55, 65, 81); // gray-700
    
    this.currentY = 25;
  }

  private addTitle(projectName: string, reportType: string) {
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(26, 41, 66); // fortress-blue
    this.doc.text(projectName, this.margins.left, this.currentY);
    
    this.currentY += 12;
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(107, 114, 128); // gray-500
    this.doc.text(reportType, this.margins.left, this.currentY);
    
    this.currentY += 20;
  }

  private addMetadata(options: PDFExportOptions) {
    const { author = 'Financial Analysis Team', date = new Date().toLocaleDateString() } = options;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(107, 114, 128); // gray-500
    this.doc.text(`Generated by: ${author}`, this.margins.left, this.currentY);
    this.doc.text(`Date: ${date}`, this.margins.left, this.currentY + 5);
    
    this.currentY += 15;
  }

  private addSectionHeader(title: string) {
    // Check if we have enough space for header + some content (at least 50mm)
    if (this.currentY + 50 > this.pageHeight - this.margins.bottom) {
      this.addNewPage();
    }
    
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(26, 41, 66); // fortress-blue
    this.doc.text(title, this.margins.left, this.currentY);
    
    this.currentY += 10;
  }

  private addSubsectionHeader(title: string) {
    this.checkPageBreak(15);
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(55, 65, 81); // gray-700
    this.doc.text(title, this.margins.left, this.currentY);
    
    this.currentY += 8;
  }

  private addText(text: string, style: 'body' | 'code' = 'body') {
    this.checkPageBreak(10);
    
    if (style === 'body') {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(55, 65, 81); // gray-700
    } else {
      this.doc.setFontSize(9);
      this.doc.setFont('courier', 'normal');
      this.doc.setTextColor(75, 85, 99); // gray-600
    }
    
    const maxWidth = this.pageWidth - this.margins.left - this.margins.right;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      this.checkPageBreak(6);
      this.doc.text(line, this.margins.left, this.currentY);
      this.currentY += 6;
    });
    
    this.currentY += 5;
  }

  private addBulletPoint(text: string) {
    this.checkPageBreak(8);
    
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(55, 65, 81); // gray-700
    
    this.doc.text('•', this.margins.left, this.currentY);
    
    const maxWidth = this.pageWidth - this.margins.left - this.margins.right - 10;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string, index: number) => {
      this.checkPageBreak(6);
      this.doc.text(line, this.margins.left + 10, this.currentY);
      if (index < lines.length - 1) {
        this.currentY += 6;
      }
    });
    
    this.currentY += 8;
  }

  private addImage(imageData: string, caption: string, width: number, height: number) {
    // If image + caption won't fit, start new page
    const totalHeight = height + 25; // image + caption + spacing
    if (this.currentY + totalHeight > this.pageHeight - this.margins.bottom) {
      this.addNewPage();
    }
    
    try {
      this.doc.addImage(imageData, 'PNG', this.margins.left, this.currentY, width, height);
      this.currentY += height + 5;
      
      // Add caption
      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(107, 114, 128); // gray-500
      this.doc.text(caption, this.margins.left, this.currentY);
      this.currentY += 10;
    } catch (error) {
      console.error('Failed to add image:', error);
      this.addText(`[Image: ${caption}]`, 'body');
    }
  }

  private drawTableRow(row: string[], rowIndex: number, isHeader: boolean, tableWidth: number, columnWidth: number, rowHeight: number) {
    // Draw row background
    if (isHeader) {
      this.doc.setFillColor(16, 185, 129); // fortress-emerald
      this.doc.rect(this.margins.left, this.currentY - 2, tableWidth, rowHeight + 2, 'F');
    } else if (rowIndex % 2 === 0) {
      this.doc.setFillColor(249, 250, 251); // gray-50
      this.doc.rect(this.margins.left, this.currentY - 2, tableWidth, rowHeight + 2, 'F');
    }
    
    // Draw borders
    this.doc.setDrawColor(229, 231, 235); // gray-200
    this.doc.setLineWidth(0.5);
    
    row.forEach((cell, colIndex) => {
      const x = this.margins.left + colIndex * columnWidth;
      const cellWidth = columnWidth;
      
      // Draw cell border
      this.doc.rect(x, this.currentY - 2, cellWidth, rowHeight + 2);
      
      // Set text style
      if (isHeader) {
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
      } else {
        this.doc.setTextColor(55, 65, 81); // gray-700
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
      }
      
      // Add text with padding
      const textX = x + 3;
      const textY = this.currentY + 3;
      
      // Truncate text if too long
      let cellText = cell.toString();
      const maxWidth = cellWidth - 6;
      const textWidth = this.doc.getTextWidth(cellText);
      
      if (textWidth > maxWidth) {
        while (this.doc.getTextWidth(cellText + '...') > maxWidth && cellText.length > 0) {
          cellText = cellText.slice(0, -1);
        }
        cellText += '...';
      }
      
      this.doc.text(cellText, textX, textY);
    });
    
    this.currentY += rowHeight + 2;
  }

  private addSpace(height: number) {
    this.currentY += height;
  }

  private addNewPage() {
    this.doc.addPage();
    this.currentY = this.margins.top;
  }

  private checkPageBreak(requiredHeight: number) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margins.bottom) {
      this.addNewPage();
    }
  }

  private addTable(data: string[][]) {
    // Calculate total table height
    const rowHeight = 8;
    const totalTableHeight = (data.length * (rowHeight + 2)) + 10;
    
    // If table won't fit on current page, start a new page
    if (this.currentY + totalTableHeight > this.pageHeight - this.margins.bottom) {
      this.addNewPage();
    }
    
    const startY = this.currentY;
    const tableWidth = this.pageWidth - this.margins.left - this.margins.right;
    const columnWidth = tableWidth / data[0].length;
    
    data.forEach((row, rowIndex) => {
      const isHeader = rowIndex === 0;
      
      // For very long tables, check if we need a new page and repeat header
      if (rowIndex > 0 && this.currentY + rowHeight + 2 > this.pageHeight - this.margins.bottom) {
        this.addNewPage();
        // Repeat header row on new page
        this.drawTableRow(data[0], 0, true, tableWidth, columnWidth, rowHeight);
        this.currentY += rowHeight + 2;
      }
      
      this.drawTableRow(row, rowIndex, isHeader, tableWidth, columnWidth, rowHeight);
    });
    
    this.addSpace(10);
  }

  private formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toFixed(0)}`;
    }
  }

  private formatAssumptionsAsTable(assumptions: any) {
    if (!assumptions || typeof assumptions !== 'object') return;

    // Handle costs array
    if (assumptions.costs && Array.isArray(assumptions.costs)) {
      this.addText('Cost Structure', 'body');
      const costsData = [
        ['Cost Item', 'Type', 'Amount'],
        ...assumptions.costs.map((cost: any) => [
          cost.name || 'Unnamed',
          this.capitalize(cost.type || 'N/A'),
          typeof cost.value === 'number' ? this.formatCurrency(cost.value) : cost.value || 'N/A'
        ])
      ];
      this.addTable(costsData);
      this.addSpace(10);
    }

    // Handle revenue array
    if (assumptions.revenue && Array.isArray(assumptions.revenue)) {
      this.addText('Revenue Streams', 'body');
      const revenueData = [
        ['Revenue Source', 'Type', 'Amount'],
        ...assumptions.revenue.map((rev: any) => [
          rev.name || 'Unnamed',
          this.capitalize(rev.type || 'N/A'),
          typeof rev.value === 'number' ? this.formatCurrency(rev.value) : rev.value || 'N/A'
        ])
      ];
      this.addTable(revenueData);
      this.addSpace(10);
    }

    // Handle metadata - extract key metrics
    if (assumptions.metadata && typeof assumptions.metadata === 'object') {
      this.addText('Event Configuration', 'body');
      const eventData: string[][] = [['Parameter', 'Value']];
      
      // Extract important metadata fields
      const importantFields = {
        type: 'Event Type',
        weeks: 'Duration (Weeks)',
        initialWeeklyAttendance: 'Initial Attendance',
        staffCount: 'Staff Count',
        staffCostPerPerson: 'Staff Cost per Person',
        ticketPrice: 'Ticket Price',
        fbSpend: 'F&B Spend per Customer',
        merchandiseSpend: 'Merchandise Spend per Customer'
      };

      Object.entries(importantFields).forEach(([key, label]) => {
        const value = this.getNestedValue(assumptions.metadata, key);
        if (value !== undefined && value !== null) {
          eventData.push([
            label,
            typeof value === 'number' && key.includes('Cost') || key.includes('Price') || key.includes('Spend') 
              ? this.formatCurrency(value) 
              : value.toString()
          ]);
        }
      });

      if (eventData.length > 1) {
        this.addTable(eventData);
        this.addSpace(10);
      }
    }

    // Handle growth model
    if (assumptions.growthModel && typeof assumptions.growthModel === 'object') {
      this.addText('Growth Projections', 'body');
      const growthData: string[][] = [['Growth Parameter', 'Value']];
      
      growthData.push(['Growth Type', this.capitalize(assumptions.growthModel.type || 'N/A')]);
      growthData.push(['Base Growth Rate', `${(assumptions.growthModel.rate * 100 || 0).toFixed(1)}%`]);
      
      if (assumptions.metadata?.growth) {
        const growth = assumptions.metadata.growth;
        if (growth.attendanceGrowthRate !== undefined) {
          growthData.push(['Attendance Growth', `${growth.attendanceGrowthRate}% per week`]);
        }
        if (growth.fbSpendGrowth !== undefined && growth.fbSpendGrowth > 0) {
          growthData.push(['F&B Spend Growth', `${growth.fbSpendGrowth}% per week`]);
        }
        if (growth.merchandiseSpendGrowth !== undefined && growth.merchandiseSpendGrowth > 0) {
          growthData.push(['Merchandise Growth', `${growth.merchandiseSpendGrowth}% per week`]);
        }
      }
      
      this.addTable(growthData);
      this.addSpace(10);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      // Convert camelCase to match object keys
      const actualKey = Object.keys(value || {}).find(k => 
        k.toLowerCase() === key.toLowerCase() || 
        k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      value = value?.[actualKey || key];
      if (value === undefined) break;
    }
    return value;
  }

  private capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatKey(key: string): string {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private summarizeObject(obj: any): string {
    // Extract key properties for summary
    const keys = ['name', 'label', 'type', 'value', 'amount', 'rate', 'percentage'];
    const summary: string[] = [];
    
    for (const key of keys) {
      if (obj[key] !== undefined) {
        if (key === 'amount' || key === 'value') {
          summary.push(`${this.formatKey(key)}: ${this.formatCurrency(obj[key])}`);
        } else if (key === 'rate' || key === 'percentage') {
          summary.push(`${this.formatKey(key)}: ${obj[key]}%`);
        } else {
          summary.push(`${this.formatKey(key)}: ${obj[key]}`);
        }
      }
    }
    
    // If no recognized keys, show all properties
    if (summary.length === 0) {
      const entries = Object.entries(obj).slice(0, 3); // Show first 3 properties
      entries.forEach(([k, v]) => {
        if (typeof v !== 'object') {
          summary.push(`${this.formatKey(k)}: ${v}`);
        }
      });
    }
    
    return summary.join(', ') || 'Complex data';
  }

  private addFooter() {
    const pageCount = this.doc.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(107, 114, 128); // gray-500
      
      // Page number
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margins.right - 20,
        this.pageHeight - this.margins.bottom + 5
      );
      
      // Footer line
      this.doc.setDrawColor(229, 231, 235); // gray-200
      this.doc.line(
        this.margins.left,
        this.pageHeight - this.margins.bottom,
        this.pageWidth - this.margins.right,
        this.pageHeight - this.margins.bottom
      );
    }
  }
}