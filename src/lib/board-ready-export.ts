import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { Project, FinancialModel } from './db';
import { 
  performFinancialAnalysis, 
  generateCashFlowProjections, 
  performScenarioAnalysis,
  FinancialMetrics,
  CashFlowPeriod,
  ScenarioAnalysis 
} from './financial-calculations';
import { formatCurrency } from './utils';

// Register Chart.js components
Chart.register(...registerables);

export interface BoardReadyReportData {
  project: Project;
  models: FinancialModel[];
  financialMetrics: FinancialMetrics;
  cashFlows: CashFlowPeriod[];
  scenarioAnalysis: ScenarioAnalysis;
  executiveSummary: ExecutiveSummary;
}

export interface ExecutiveSummary {
  investmentThesis: string;
  keyHighlights: string[];
  riskFactors: string[];
  recommendations: string[];
  marketOpportunity: string;
}

// Helper function to create charts as images
async function createChartImage(config: ChartConfiguration, width: number = 400, height: number = 300): Promise<string> {
  return new Promise((resolve) => {
    // Create temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    
    const chart = new Chart(canvas, config);
    
    // Wait for chart to render then convert to image
    setTimeout(() => {
      const imageData = canvas.toDataURL('image/png');
      chart.destroy();
      document.body.removeChild(canvas);
      resolve(imageData);
    }, 500);
  });
}

// Generate executive summary based on financial data
function generateExecutiveSummary(
  project: Project, 
  metrics: FinancialMetrics, 
  scenarios: ScenarioAnalysis
): ExecutiveSummary {
  const npvPositive = metrics.npv > 0;
  const strongROI = metrics.roi > 15;
  const reasonablePayback = metrics.paybackPeriod < 24; // Less than 2 years
  
  // Investment thesis
  const investmentThesis = npvPositive && strongROI 
    ? `${project.name} represents a compelling investment opportunity with strong financial returns and manageable risk profile.`
    : `${project.name} shows potential but requires careful risk management and optimization strategies.`;
  
  // Key highlights
  const keyHighlights = [
    `Projected NPV of ${formatCurrency(metrics.npv)} with ${metrics.irr.toFixed(1)}% IRR`,
    `Total revenue potential of ${formatCurrency(metrics.totalRevenue)} over the projection period`,
    `${metrics.profitMargin.toFixed(1)}% profit margin with ${formatCurrency(metrics.totalProfit)} total profit`,
    reasonablePayback 
      ? `Payback period of ${metrics.paybackPeriod.toFixed(1)} months indicates strong cash flow recovery`
      : `Extended payback period of ${metrics.paybackPeriod.toFixed(1)} months requires sustained commitment`
  ];
  
  // Risk factors
  const riskFactors = [
    scenarios.worstCase.npv < 0 
      ? `Worst-case scenario shows negative NPV of ${formatCurrency(scenarios.worstCase.npv)}`
      : 'Downside scenarios remain profitable with manageable risk',
    `Revenue sensitivity: 10% revenue decline impacts NPV by ${Math.abs(scenarios.sensitivity.revenueImpact.find(r => r.change === -10)?.npvChange || 0).toFixed(1)}%`,
    `Cost sensitivity: 10% cost increase impacts NPV by ${Math.abs(scenarios.sensitivity.costImpact.find(c => c.change === 10)?.npvChange || 0).toFixed(1)}%`,
    'Market adoption and competitive response may impact projections'
  ];
  
  // Recommendations
  const recommendations = [
    npvPositive ? 'Proceed with implementation given positive financial projections' : 'Consider optimization strategies before proceeding',
    metrics.paybackPeriod > 18 ? 'Focus on accelerating revenue generation in early periods' : 'Maintain current revenue trajectory',
    'Monitor key assumptions and adjust projections quarterly',
    'Implement risk mitigation strategies for identified downside scenarios'
  ];
  
  // Market opportunity
  const marketOpportunity = `The ${project.productType} market presents significant opportunity with ${project.targetAudience || 'target customer segments'} showing strong demand indicators. Revenue projections are based on conservative market penetration assumptions with potential for upside in favorable conditions.`;
  
  return {
    investmentThesis,
    keyHighlights,
    riskFactors,
    recommendations,
    marketOpportunity
  };
}

// Create board-ready PDF report
export async function exportBoardReadyPDF(data: BoardReadyReportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  // Title Page
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('EXECUTIVE FINANCIAL ANALYSIS', pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(18);
  doc.text(data.project.name, pageWidth / 2, 55, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Prepared on ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(`Product Type: ${data.project.productType}`, pageWidth / 2, 115, { align: 'center' });
  
  // Executive Summary Section
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('EXECUTIVE SUMMARY', margin, 30);
  
  let yPos = 50;
  
  // Investment Thesis
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Investment Thesis', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  const thesisLines = doc.splitTextToSize(data.executiveSummary.investmentThesis, pageWidth - 2 * margin);
  doc.text(thesisLines, margin, yPos);
  yPos += thesisLines.length * 6 + 15;
  
  // Key Highlights
  doc.setFontSize(14);
  doc.text('Key Financial Highlights', margin, yPos);
  yPos += 15;
  
  data.executiveSummary.keyHighlights.forEach((highlight, index) => {
    doc.setFontSize(11);
    doc.text(`• ${highlight}`, margin + 5, yPos);
    yPos += 12;
  });
  
  yPos += 10;
  
  // Risk Factors
  doc.setFontSize(14);
  doc.text('Key Risk Factors', margin, yPos);
  yPos += 15;
  
  data.executiveSummary.riskFactors.forEach((risk, index) => {
    doc.setFontSize(11);
    doc.text(`• ${risk}`, margin + 5, yPos);
    yPos += 12;
  });
  
  // Financial Metrics Overview
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('KEY FINANCIAL METRICS', margin, 30);
  
  // Metrics table
  const metricsData = [
    ['Net Present Value (NPV)', formatCurrency(data.financialMetrics.npv), data.financialMetrics.npv > 0 ? 'Positive' : 'Negative'],
    ['Internal Rate of Return (IRR)', `${data.financialMetrics.irr.toFixed(1)}%`, data.financialMetrics.irr > 15 ? 'Strong' : 'Moderate'],
    ['Return on Investment (ROI)', `${data.financialMetrics.roi.toFixed(1)}%`, data.financialMetrics.roi > 20 ? 'Excellent' : 'Good'],
    ['Payback Period', `${data.financialMetrics.paybackPeriod.toFixed(1)} months`, data.financialMetrics.paybackPeriod < 18 ? 'Fast' : 'Extended'],
    ['Total Revenue Projection', formatCurrency(data.financialMetrics.totalRevenue), 'Over projection period'],
    ['Total Profit Projection', formatCurrency(data.financialMetrics.totalProfit), `${data.financialMetrics.profitMargin.toFixed(1)}% margin`],
  ];
  
  autoTable(doc, {
    startY: 50,
    head: [['Metric', 'Value', 'Assessment']],
    body: metricsData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' }
    }
  });
  
  // Create cash flow chart
  const cashFlowData = data.cashFlows.slice(0, 12).map(cf => ({
    period: cf.periodName,
    netCashFlow: cf.netCashFlow,
    cumulativeCashFlow: cf.cumulativeCashFlow
  }));
  
  const chartConfig: ChartConfiguration = {
    type: 'line',
    data: {
      labels: cashFlowData.map(d => d.period),
      datasets: [
        {
          label: 'Net Cash Flow',
          data: cashFlowData.map(d => d.netCashFlow),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Cumulative Cash Flow',
          data: cashFlowData.map(d => d.cumulativeCashFlow),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Cash Flow Projections (First 12 Periods)',
          font: { size: 16 }
        },
        legend: {
          display: true,
          position: 'bottom'
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Amount ($)'
          },
          ticks: {
            callback: function(value: any) {
              return '$' + (value / 1000).toFixed(0) + 'K';
            }
          }
        }
      }
    }
  };
  
  try {
    const chartImage = await createChartImage(chartConfig, 500, 300);
    
    // Add chart to PDF
    doc.addPage();
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('CASH FLOW ANALYSIS', margin, 30);
    
    doc.addImage(chartImage, 'PNG', margin, 50, pageWidth - 2 * margin, 120);
    
  } catch (error) {
    console.warn('Chart generation failed, skipping chart:', error);
  }
  
  // Scenario Analysis
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('SCENARIO ANALYSIS', margin, 30);
  
  const scenarioData = [
    ['Worst Case', formatCurrency(data.scenarioAnalysis.worstCase.npv), `${data.scenarioAnalysis.worstCase.irr.toFixed(1)}%`, `${data.scenarioAnalysis.worstCase.roi.toFixed(1)}%`],
    ['Base Case', formatCurrency(data.scenarioAnalysis.baseCase.npv), `${data.scenarioAnalysis.baseCase.irr.toFixed(1)}%`, `${data.scenarioAnalysis.baseCase.roi.toFixed(1)}%`],
    ['Best Case', formatCurrency(data.scenarioAnalysis.bestCase.npv), `${data.scenarioAnalysis.bestCase.irr.toFixed(1)}%`, `${data.scenarioAnalysis.bestCase.roi.toFixed(1)}%`],
  ];
  
  autoTable(doc, {
    startY: 50,
    head: [['Scenario', 'NPV', 'IRR', 'ROI']],
    body: scenarioData,
    theme: 'grid',
    styles: { fontSize: 12, cellPadding: 8 },
    headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });
  
  // Recommendations
  let recommendationsY = (doc as any).lastAutoTable.finalY + 30;
  
  doc.setFontSize(16);
  doc.setTextColor(41, 128, 185);
  doc.text('RECOMMENDATIONS', margin, recommendationsY);
  recommendationsY += 20;
  
  data.executiveSummary.recommendations.forEach((recommendation, index) => {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`${index + 1}. ${recommendation}`, margin, recommendationsY);
    recommendationsY += 15;
  });
  
  // Appendix: Detailed Cash Flow Table
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('APPENDIX: DETAILED CASH FLOW', margin, 30);
  
  const cashFlowTableData = data.cashFlows.slice(0, 24).map(cf => [
    cf.periodName,
    formatCurrency(cf.operatingCashFlow),
    formatCurrency(cf.investingCashFlow),
    formatCurrency(cf.financingCashFlow),
    formatCurrency(cf.netCashFlow),
    formatCurrency(cf.cumulativeCashFlow)
  ]);
  
  autoTable(doc, {
    startY: 50,
    head: [['Period', 'Operating CF', 'Investing CF', 'Financing CF', 'Net CF', 'Cumulative CF']],
    body: cashFlowTableData,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [155, 89, 182], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });
  
  // Download the PDF
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Executive_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// Prepare data for board-ready report
export async function prepareBoardReadyData(
  project: Project,
  models: FinancialModel[],
  periods: number = 36,
  discountRate: number = 0.1
): Promise<BoardReadyReportData> {
  // Use the first model for primary analysis
  const primaryModel = models[0];
  
  if (!primaryModel) {
    throw new Error('No financial model available for analysis');
  }
  
  // Generate comprehensive analysis
  const financialMetrics = performFinancialAnalysis(primaryModel, periods, discountRate, false);
  const cashFlows = generateCashFlowProjections(primaryModel, periods, false);
  const scenarioAnalysis = performScenarioAnalysis(primaryModel, periods, discountRate, false);
  const executiveSummary = generateExecutiveSummary(project, financialMetrics, scenarioAnalysis);
  
  return {
    project,
    models,
    financialMetrics,
    cashFlows,
    scenarioAnalysis,
    executiveSummary
  };
}