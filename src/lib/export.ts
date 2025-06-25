import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, FinancialModel } from './db';
import { format } from 'date-fns';

export interface ExportData {
  project: Project;
  models: FinancialModel[];
  cashFlows?: CashFlowStatement[];
  metrics?: FinancialMetrics;
}

export interface CashFlowStatement {
  period: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface FinancialMetrics {
  npv: number;
  irr: number;
  breakEvenUnits?: number;
  breakEvenRevenue?: number;
  paybackPeriod: number;
  roi: number;
}

// Excel Export Functions
export const exportToExcel = async (data: ExportData): Promise<void> => {
  const workbook = XLSX.utils.book_new();

  // Project Summary Sheet
  const projectSummary = [
    ['Project Name', data.project.name],
    ['Description', data.project.description || ''],
    ['Product Type', data.project.productType],
    ['Created', format(data.project.createdAt, 'MMM dd, yyyy')],
    ['Updated', format(data.project.updatedAt, 'MMM dd, yyyy')],
    ['Target Audience', data.project.targetAudience || ''],
  ];

  const projectSheet = XLSX.utils.aoa_to_sheet(projectSummary);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Summary');

  // Financial Models Sheet
  if (data.models.length > 0) {
    const modelsData = data.models.map(model => ({
      'Model Name': model.name,
      'Created': format(model.createdAt, 'MMM dd, yyyy'),
      'Revenue Streams': model.assumptions?.revenue?.length || 0,
      'Cost Categories': model.assumptions?.costs?.length || 0,
      'Growth Model': model.assumptions?.growthModel?.type || 'N/A',
    }));

    const modelsSheet = XLSX.utils.json_to_sheet(modelsData);
    XLSX.utils.book_append_sheet(workbook, modelsSheet, 'Financial Models');

    // Revenue Details Sheet
    const allRevenue = data.models.flatMap(model => 
      model.assumptions?.revenue?.map(rev => ({
        'Model': model.name,
        'Revenue Stream': rev.name,
        'Value': rev.value,
        'Type': rev.type,
        'Frequency': rev.frequency || 'N/A',
      })) || []
    );

    if (allRevenue.length > 0) {
      const revenueSheet = XLSX.utils.json_to_sheet(allRevenue);
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Streams');
    }

    // Cost Details Sheet
    const allCosts = data.models.flatMap(model =>
      model.assumptions?.costs?.map(cost => ({
        'Model': model.name,
        'Cost Item': cost.name,
        'Value': cost.value,
        'Type': cost.type,
        'Category': cost.category,
      })) || []
    );

    if (allCosts.length > 0) {
      const costsSheet = XLSX.utils.json_to_sheet(allCosts);
      XLSX.utils.book_append_sheet(workbook, costsSheet, 'Cost Structure');
    }
  }

  // Cash Flow Sheet
  if (data.cashFlows && data.cashFlows.length > 0) {
    const cashFlowSheet = XLSX.utils.json_to_sheet(data.cashFlows.map(cf => ({
      'Period': cf.period,
      'Operating Cash Flow': cf.operatingCashFlow,
      'Investing Cash Flow': cf.investingCashFlow,
      'Financing Cash Flow': cf.financingCashFlow,
      'Net Cash Flow': cf.netCashFlow,
      'Cumulative Cash Flow': cf.cumulativeCashFlow,
    })));
    XLSX.utils.book_append_sheet(workbook, cashFlowSheet, 'Cash Flow Statement');
  }

  // Financial Metrics Sheet
  if (data.metrics) {
    const metricsData = [
      ['Metric', 'Value', 'Unit'],
      ['Net Present Value (NPV)', data.metrics.npv, '$'],
      ['Internal Rate of Return (IRR)', data.metrics.irr, '%'],
      ['Break-even Units', data.metrics.breakEvenUnits || 'N/A', 'units'],
      ['Break-even Revenue', data.metrics.breakEvenRevenue || 'N/A', '$'],
      ['Payback Period', data.metrics.paybackPeriod, 'months'],
      ['Return on Investment (ROI)', data.metrics.roi, '%'],
    ];

    const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Financial Metrics');
  }

  // Download the file
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Financial_Analysis_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// PDF Export Functions
export const exportToPDF = async (data: ExportData): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;

  // Title
  doc.setFontSize(20);
  doc.text('Financial Analysis Report', margin, 30);
  
  // Project Info
  doc.setFontSize(16);
  doc.text('Project Summary', margin, 50);
  
  doc.setFontSize(12);
  const projectInfo = [
    ['Project Name', data.project.name],
    ['Description', data.project.description || 'N/A'],
    ['Product Type', data.project.productType],
    ['Created', format(data.project.createdAt, 'MMM dd, yyyy')],
    ['Target Audience', data.project.targetAudience || 'N/A'],
  ];

  autoTable(doc, {
    startY: 60,
    head: [['Property', 'Value']],
    body: projectInfo,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Financial Models Summary
  if (data.models.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    
    doc.setFontSize(16);
    doc.text('Financial Models', margin, finalY + 20);

    const modelsData = data.models.map(model => [
      model.name,
      format(model.createdAt, 'MMM dd, yyyy'),
      (model.assumptions?.revenue?.length || 0).toString(),
      (model.assumptions?.costs?.length || 0).toString(),
      model.assumptions?.growthModel?.type || 'N/A',
    ]);

    autoTable(doc, {
      startY: finalY + 30,
      head: [['Model Name', 'Created', 'Revenue Streams', 'Cost Items', 'Growth Model']],
      body: modelsData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });
  }

  // Financial Metrics
  if (data.metrics) {
    const finalY = (doc as any).lastAutoTable.finalY || 180;
    
    doc.setFontSize(16);
    doc.text('Key Financial Metrics', margin, finalY + 20);

    const metricsData = [
      ['Net Present Value (NPV)', formatCurrency(data.metrics.npv)],
      ['Internal Rate of Return (IRR)', `${data.metrics.irr.toFixed(2)}%`],
      ['Break-even Units', data.metrics.breakEvenUnits?.toLocaleString() || 'N/A'],
      ['Break-even Revenue', data.metrics.breakEvenRevenue ? formatCurrency(data.metrics.breakEvenRevenue) : 'N/A'],
      ['Payback Period', `${data.metrics.paybackPeriod.toFixed(1)} months`],
      ['Return on Investment (ROI)', `${data.metrics.roi.toFixed(2)}%`],
    ];

    autoTable(doc, {
      startY: finalY + 30,
      head: [['Metric', 'Value']],
      body: metricsData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 160, 133] },
    });
  }

  // Cash Flow Statement (if available)
  if (data.cashFlows && data.cashFlows.length > 0) {
    doc.addPage();
    
    doc.setFontSize(16);
    doc.text('Cash Flow Statement', margin, 30);

    const cashFlowData = data.cashFlows.map(cf => [
      cf.period,
      formatCurrency(cf.operatingCashFlow),
      formatCurrency(cf.investingCashFlow),
      formatCurrency(cf.financingCashFlow),
      formatCurrency(cf.netCashFlow),
      formatCurrency(cf.cumulativeCashFlow),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Period', 'Operating CF', 'Investing CF', 'Financing CF', 'Net CF', 'Cumulative CF']],
      body: cashFlowData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [155, 89, 182] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
    });
  }

  // Download the PDF
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Financial_Analysis_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

// Utility function to format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

// Utility function to format percentage
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};