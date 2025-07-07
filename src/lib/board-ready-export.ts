import { format } from 'date-fns';
import { Project, FinancialModel } from './db';
import { formatCurrency } from './utils';
import { EnhancedExportSystem } from './exports/EnhancedExportSystem';
import type { ProjectData } from './exports/core/EnhancedPDFGenerator';

export interface RevenueProjection {
  period: number;
  amount: number;
  source: string;
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ProductReportData {
  project: Project;
  models: FinancialModel[];
  productSummary: ProductSummary;
  revenueProjections: RevenueProjection[];
  costBreakdown: CostBreakdown[];
}

export interface ProductSummary {
  productOverview: string;
  keyMetrics: string[];
  operationalInsights: string[];
  recommendations: string[];
  marketPosition: string;
  revenueAnalysis: string;
  costStructureInsights: string;
  resourceRequirements: string[];
}

// Helper function to create simple ASCII charts (for now)
function createSimpleChart(data: number[], labels: string[], title: string): string[] {
  const chartLines = [];
  chartLines.push(`${title}:`);
  chartLines.push('');
  
  const maxValue = Math.max(...data);
  const scale = maxValue > 0 ? 40 / maxValue : 1; // Scale to 40 characters width
  
  for (let i = 0; i < Math.min(data.length, labels.length); i++) {
    const barLength = Math.round(data[i] * scale);
    const bar = '█'.repeat(Math.max(0, barLength));
    const value = formatCurrency(data[i]);
    chartLines.push(`${labels[i].padEnd(12)} ${bar} ${value}`);
  }
  
  return chartLines;
}

// Generate product-focused summary with real data analysis
function generateProductSummary(
  project: Project, 
  models: FinancialModel[]
): ProductSummary {
  const primaryModel = models[0];
  if (!primaryModel?.assumptions) {
    throw new Error('No model data available for analysis');
  }
  
  // Analyze revenue streams
  const revenueStreams = primaryModel.assumptions.revenue || [];
  const totalInitialRevenue = revenueStreams.reduce((sum, stream) => sum + (stream.value || 0), 0);
  const largestStream = revenueStreams.reduce((max, stream) => 
    (stream.value || 0) > (max.value || 0) ? stream : max, revenueStreams[0] || { name: 'None', value: 0 });
  const revenueConcentration = totalInitialRevenue > 0 ? ((largestStream.value || 0) / totalInitialRevenue * 100) : 0;
  
  // Analyze cost structure
  const costs = primaryModel.assumptions.costs || [];
  const totalCosts = costs.reduce((sum, cost) => sum + (cost.value || 0), 0);
  const fixedCosts = costs.filter(cost => cost.type?.toLowerCase() === 'fixed');
  const variableCosts = costs.filter(cost => cost.type?.toLowerCase() === 'variable');
  const fixedCostRatio = totalCosts > 0 ? (fixedCosts.reduce((sum, cost) => sum + (cost.value || 0), 0) / totalCosts * 100) : 0;
  
  // Analyze growth assumptions
  const metadata = primaryModel.assumptions.metadata;
  const hasGrowthModel = metadata?.growth || primaryModel.assumptions.growthModel;
  const isWeeklyModel = metadata?.type === 'WeeklyEvent';
  
  // Product overview - data-driven analysis
  const productOverview = `${project.name} is a ${project.productType} with ${revenueStreams.length} revenue stream${revenueStreams.length !== 1 ? 's' : ''} generating ${formatCurrency(totalInitialRevenue)} in initial monthly revenue. The model ${hasGrowthModel ? 'includes growth projections' : 'assumes static performance'} and operates with ${costs.length} cost component${costs.length !== 1 ? 's' : ''} totaling ${formatCurrency(totalCosts)} monthly.`;
  
  // Key metrics - based on actual data
  const keyMetrics = [
    `${revenueStreams.length} revenue streams with ${formatCurrency(totalInitialRevenue)} monthly potential`,
    `Primary revenue driver: ${largestStream.name} (${revenueConcentration.toFixed(1)}% of total)`,
    `Cost structure: ${fixedCostRatio.toFixed(1)}% fixed costs, ${(100-fixedCostRatio).toFixed(1)}% variable`,
    `Initial margin: ${totalInitialRevenue > 0 ? ((totalInitialRevenue - totalCosts) / totalInitialRevenue * 100).toFixed(1) : 0}%`,
    isWeeklyModel && metadata?.initialWeeklyAttendance ? `Weekly attendance target: ${metadata.initialWeeklyAttendance.toLocaleString()}` : 'Monthly recurring model'
  ];
  
  // Operational insights - analyze the data patterns
  const operationalInsights = [];
  
  if (revenueConcentration > 70) {
    operationalInsights.push(`High revenue concentration risk: ${largestStream.name} represents ${revenueConcentration.toFixed(1)}% of revenue`);
  } else if (revenueConcentration < 40) {
    operationalInsights.push(`Well-diversified revenue model with balanced stream distribution`);
  }
  
  if (fixedCostRatio > 60) {
    operationalInsights.push(`High fixed cost structure (${fixedCostRatio.toFixed(1)}%) creates operational leverage but increases break-even risk`);
  } else if (fixedCostRatio < 30) {
    operationalInsights.push(`Variable cost structure (${(100-fixedCostRatio).toFixed(1)}% variable) provides operational flexibility`);
  }
  
  if (isWeeklyModel && metadata?.growth?.attendanceGrowthRate) {
    operationalInsights.push(`Event-based model with ${metadata.growth.attendanceGrowthRate}% weekly attendance growth projection`);
  }
  
  if (revenueStreams.some(stream => stream.name?.includes('F&B') || stream.name?.includes('Food'))) {
    operationalInsights.push(`Includes food & beverage revenue streams requiring inventory and staff management`);
  }
  
  // Recommendations based on data analysis
  const recommendations = [];
  
  if (revenueConcentration > 60) {
    recommendations.push(`Diversify revenue streams to reduce dependency on ${largestStream.name}`);
  }
  
  if (fixedCostRatio > 70) {
    recommendations.push('Consider variable cost alternatives to reduce operational risk');
  } else if (fixedCostRatio < 20) {
    recommendations.push('Evaluate fixed cost investments to achieve economies of scale');
  }
  
  if (totalInitialRevenue < totalCosts) {
    recommendations.push('Focus on revenue optimization or cost reduction to achieve positive margins');
  }
  
  if (hasGrowthModel) {
    recommendations.push('Monitor growth assumptions and adjust projections based on actual performance');
  }
  
  recommendations.push('Implement monthly performance tracking against model assumptions');
  
  // Market position analysis
  const marketPosition = `${project.name} targets ${project.targetAudience || 'defined market segments'} with a ${revenueStreams.length > 2 ? 'multi-revenue' : 'focused'} business model. The ${project.productType} category offers ${totalInitialRevenue > totalCosts ? 'positive initial margins' : 'path to profitability'} with ${hasGrowthModel ? 'growth-oriented' : 'steady-state'} projections.`;
  
  // Revenue analysis
  const topStreams = revenueStreams.sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 3);
  const revenueAnalysis = `Revenue is primarily driven by ${topStreams.map(s => s.name).join(', ')}. ${largestStream.name} contributes ${revenueConcentration.toFixed(1)}% of total revenue at ${formatCurrency(largestStream.value || 0)} monthly. ${revenueStreams.length > 3 ? `Additional streams provide ${(100 - revenueConcentration).toFixed(1)}% diversification.` : 'Revenue concentration requires monitoring.'}`;
  
  // Cost structure insights
  const costCategories = [...new Set(costs.map(c => c.category).filter(Boolean))];
  const costStructureInsights = `Operating costs total ${formatCurrency(totalCosts)} monthly across ${costCategories.length} categories${costCategories.length > 0 ? ` (${costCategories.join(', ')})` : ''}. Fixed costs represent ${fixedCostRatio.toFixed(1)}% of structure, providing ${fixedCostRatio > 50 ? 'operational leverage potential' : 'cost flexibility'}. ${variableCosts.length > 0 ? `Variable costs scale with ${variableCosts.map(c => c.name).join(', ')}.` : ''}`;
  
  // Only include factual resource data from the model
  const setupCosts = costs.filter(cost => cost.name?.toLowerCase().includes('setup')).reduce((sum, cost) => sum + (cost.value || 0), 0);
  const operatingCosts = totalCosts - setupCosts;
  
  const resourceRequirements = [];
  if (setupCosts > 0) {
    resourceRequirements.push(`Setup costs identified: ${formatCurrency(setupCosts)}`);
  }
  if (operatingCosts > 0) {
    resourceRequirements.push(`Monthly operating costs: ${formatCurrency(operatingCosts)}`);
  }
  if (totalCosts > 0) {
    resourceRequirements.push(`Total monthly budget requirement: ${formatCurrency(totalCosts)}`);
  }
  
  return {
    productOverview,
    keyMetrics,
    operationalInsights,
    recommendations,
    marketPosition,
    revenueAnalysis,
    costStructureInsights,
    resourceRequirements
  };
}

// Create product-focused PDF report
export async function exportProductPDF(data: ProductReportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  // Title Page
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('PRODUCT ANALYSIS REPORT', pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(18);
  doc.text(data.project.name, pageWidth / 2, 55, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Prepared on ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(`Product Type: ${data.project.productType}`, pageWidth / 2, 115, { align: 'center' });
  doc.text(`Target Audience: ${data.project.targetAudience || 'Not specified'}`, pageWidth / 2, 130, { align: 'center' });
  
  // Product Overview Section
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('PRODUCT OVERVIEW', margin, 30);
  
  let yPos = 50;
  
  // Product Overview
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const overviewLines = doc.splitTextToSize(data.productSummary.productOverview, pageWidth - 2 * margin);
  doc.text(overviewLines, margin, yPos);
  yPos += overviewLines.length * 6 + 20;
  
  // Key Metrics
  doc.setFontSize(14);
  doc.text('Key Performance Metrics', margin, yPos);
  yPos += 15;
  
  data.productSummary.keyMetrics.forEach((metric, index) => {
    doc.setFontSize(11);
    doc.text(`• ${metric}`, margin + 5, yPos);
    yPos += 12;
  });
  
  yPos += 15;
  
  // Operational Insights
  if (data.productSummary.operationalInsights.length > 0) {
    doc.setFontSize(14);
    doc.text('Operational Insights', margin, yPos);
    yPos += 15;
    
    data.productSummary.operationalInsights.forEach((insight, index) => {
      doc.setFontSize(11);
      doc.text(`• ${insight}`, margin + 5, yPos);
      yPos += 12;
    });
  }
  
  // Revenue & Market Analysis
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('REVENUE & MARKET ANALYSIS', margin, 30);
  
  yPos = 50;
  
  // Revenue Analysis
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Revenue Structure', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  const revenueLines = doc.splitTextToSize(data.productSummary.revenueAnalysis, pageWidth - 2 * margin);
  doc.text(revenueLines, margin, yPos);
  yPos += revenueLines.length * 6 + 20;
  
  // Cost Structure
  doc.setFontSize(14);
  doc.text('Cost Structure Analysis', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  const costLines = doc.splitTextToSize(data.productSummary.costStructureInsights, pageWidth - 2 * margin);
  doc.text(costLines, margin, yPos);
  yPos += costLines.length * 6 + 20;
  
  // Market Position
  doc.setFontSize(14);
  doc.text('Market Position', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  const marketLines = doc.splitTextToSize(data.productSummary.marketPosition, pageWidth - 2 * margin);
  doc.text(marketLines, margin, yPos);
  yPos += marketLines.length * 6 + 15;
  
  // Implementation & Resource Planning
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('IMPLEMENTATION PLAN & RESOURCES', margin, 30);
  
  yPos = 50;
  
  // Skip implementation timeline - no factual data available
  
  // Resource Requirements
  doc.setFontSize(14);
  doc.text('Resource Requirements', margin, yPos);
  yPos += 15;
  
  data.productSummary.resourceRequirements.forEach((requirement, index) => {
    doc.setFontSize(11);
    doc.text(`• ${requirement}`, margin + 5, yPos);
    yPos += 12;
  });
  
  yPos += 20;
  
  // Recommendations
  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.text('STRATEGIC RECOMMENDATIONS', margin, yPos);
  yPos += 20;
  
  data.productSummary.recommendations.forEach((recommendation, index) => {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${index + 1}. ${recommendation}`, margin, yPos);
    yPos += 15;
  });
  
  // Business Model Fundamentals
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('BUSINESS MODEL FUNDAMENTALS', margin, 30);
  
  yPos = 50;
  
  // Extract key business model data from the first model
  const primaryModel = data.models[0];
  if (primaryModel && primaryModel.assumptions) {
    // Revenue Model
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Revenue Model', margin, yPos);
    yPos += 15;
    
    if (primaryModel.assumptions.revenue) {
      const revenueModelData = primaryModel.assumptions.revenue.map(stream => [
        stream.name,
        formatCurrency(stream.value),
        stream.type || 'N/A',
        stream.frequency || 'Monthly'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Revenue Stream', 'Value', 'Type', 'Frequency']],
        body: revenueModelData,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Cost Structure
    doc.setFontSize(14);
    doc.text('Cost Structure', margin, yPos);
    yPos += 15;
    
    if (primaryModel.assumptions.costs) {
      const costModelData = primaryModel.assumptions.costs.map(cost => [
        cost.name,
        formatCurrency(cost.value),
        cost.type || 'N/A',
        cost.category || 'General'
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Cost Item', 'Value', 'Type', 'Category']],
        body: costModelData,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 20;
    }
    
    // Unit Economics (if available)
    if (primaryModel.assumptions.metadata) {
      doc.setFontSize(14);
      doc.text('Key Unit Economics', margin, yPos);
      yPos += 15;
      
      const unitEconomics = [];
      const metadata = primaryModel.assumptions.metadata;
      
      if (metadata.initialWeeklyAttendance) {
        unitEconomics.push(['Initial Weekly Attendance', metadata.initialWeeklyAttendance.toLocaleString()]);
      }
      if (metadata.perCustomer?.fbSpend) {
        unitEconomics.push(['F&B Spend per Customer', formatCurrency(metadata.perCustomer.fbSpend)]);
      }
      if (metadata.perCustomer?.merchandiseSpend) {
        unitEconomics.push(['Merchandise Spend per Customer', formatCurrency(metadata.perCustomer.merchandiseSpend)]);
      }
      if (metadata.costs?.fbCOGSPercent) {
        unitEconomics.push(['F&B Cost of Goods Sold', `${metadata.costs.fbCOGSPercent}%`]);
      }
      if (metadata.growth?.attendanceGrowthRate) {
        unitEconomics.push(['Attendance Growth Rate', `${metadata.growth.attendanceGrowthRate}% weekly`]);
      }
      
      if (unitEconomics.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Metric', 'Value']],
          body: unitEconomics,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 5 },
          headStyles: { fillColor: [155, 89, 182], textColor: [255, 255, 255] },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right', fontStyle: 'bold' }
          }
        });
      }
    }
  }
  
  // Download the PDF
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Product_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// Prepare data for product report
export async function prepareProductReportData(
  project: Project,
  models: FinancialModel[]
): Promise<ProductReportData> {
  if (!models || models.length === 0) {
    throw new Error('No financial model available for analysis');
  }
  
  // Generate product-focused analysis
  const productSummary = generateProductSummary(project, models);
  
  // Prepare simplified revenue and cost data
  const primaryModel = models[0];
  const revenueProjections = primaryModel.assumptions?.revenue || [];
  const costBreakdown = primaryModel.assumptions?.costs || [];
  
  return {
    project,
    models,
    productSummary,
    revenueProjections,
    costBreakdown
  };
}

// Legacy function name for backward compatibility
export async function prepareBoardReadyData(
  project: Project,
  models: FinancialModel[],
  periods: number = 36,
  discountRate: number = 0.1
): Promise<ProductReportData> {
  return prepareProductReportData(project, models);
}

// Transform data for enhanced export system
function transformProductDataToProject(data: ProductReportData): ProjectData {
  const primaryModel = data.models[0];
  
  // Create a scenario from the product data
  const scenarios = [{
    name: 'Primary Model',
    label: 'Realistic' as const,
    projectedRevenue: data.revenueProjections.reduce((sum, proj) => sum + proj.amount, 0),
    projectedExpenses: data.costBreakdown.reduce((sum, cost) => sum + cost.amount, 0),
    netProfit: data.revenueProjections.reduce((sum, proj) => sum + proj.amount, 0) - 
              data.costBreakdown.reduce((sum, cost) => sum + cost.amount, 0),
    roi: 0, // Will be calculated
    breakEvenMonth: 0,
    cashFlow: [],
    riskLevel: 'Medium' as const,
  }];

  // Calculate ROI
  scenarios[0].roi = scenarios[0].projectedRevenue > 0 ? 
    (scenarios[0].netProfit / scenarios[0].projectedRevenue) * 100 : 0;

  return {
    id: data.project.id,
    name: data.project.name,
    description: data.productSummary.productOverview,
    models: data.models,
    scenarios,
    analysis: {
      totalRevenue: scenarios[0].projectedRevenue,
      totalCosts: scenarios[0].projectedExpenses,
      netProfit: scenarios[0].netProfit,
      roi: scenarios[0].roi,
      breakEvenMonth: scenarios[0].breakEvenMonth,
    },
    summary: {
      overview: data.productSummary.productOverview,
      keyMetrics: data.productSummary.keyMetrics,
      recommendations: data.productSummary.recommendations,
    },
    assumptions: primaryModel?.assumptions,
  };
}

// Enhanced board-ready export with fallback
export async function exportBoardReadyPDF(data: ProductReportData): Promise<void> {
  try {
    console.log('Attempting enhanced board PDF export...');
    const exportSystem = new EnhancedExportSystem();
    const projectData = transformProductDataToProject(data);
    
    const results = await exportSystem.exportProject(projectData, {
      format: 'PDF',
      template: 'board',
      includeCharts: true,
      includeScenarioComparison: true,
      includeRiskAnalysis: false,
      colorScheme: 'fortress',
      pageSize: 'Letter',
      orientation: 'Portrait',
      companyName: 'Fortress Financial',
      author: 'Product Analysis Team',
    });

    if (results.pdf?.success && results.pdf.data) {
      // Create download
      const blob = new Blob([results.pdf.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = results.pdf.filename || `${data.project.name}_Board_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Enhanced board PDF export successful');
    } else {
      throw new Error(results.pdf?.error || 'Enhanced board PDF generation failed');
    }
    
    exportSystem.cleanup();
  } catch (error) {
    console.error('Enhanced board PDF export failed, falling back to legacy:', error);
    // Fallback to legacy export
    return exportProductPDF(data);
  }
}