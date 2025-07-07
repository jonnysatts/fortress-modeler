import { format } from 'date-fns';
import { Project, FinancialModel } from './db';
import { formatCurrency } from './utils';
import { EnhancedExportSystem } from './exports/EnhancedExportSystem';
import type { ProjectData } from './exports/core/EnhancedPDFGenerator';

export interface RichReportData {
  project: Project;
  model: FinancialModel;
  simulationResults: any; // The same simulation results from ModelOverview
}

// Legacy chart functions removed - now using enhanced chart renderer

// Transform data for enhanced export system
function transformToProjectData(data: RichReportData): ProjectData {
  const results = data.simulationResults;
  
  // Create scenario data from simulation results
  const scenarios = [{
    name: 'Base Scenario',
    label: 'Realistic' as const,
    projectedRevenue: results.totalRevenue,
    projectedExpenses: results.totalCosts,
    netProfit: results.totalProfit,
    roi: results.totalRevenue > 0 ? (results.totalProfit / results.totalRevenue) * 100 : 0,
    breakEvenMonth: results.breakEvenPoint || 0,
    cashFlow: results.periodicData?.map((p: any) => p.cumulativeProfit) || [],
    riskLevel: 'Medium' as const,
  }];

  return {
    id: data.project.id,
    name: data.project.name,
    description: `Financial model analysis for ${data.model.name}`,
    models: [data.model],
    scenarios,
    analysis: {
      totalRevenue: results.totalRevenue,
      totalCosts: results.totalCosts,
      netProfit: results.totalProfit,
      roi: results.totalRevenue > 0 ? (results.totalProfit / results.totalRevenue) * 100 : 0,
      breakEvenMonth: results.breakEvenPoint,
      totalAttendance: results.totalAttendance,
      initialMargin: results.initialMargin,
      finalMargin: results.finalWeekMargin,
      duration: results.duration,
      timeUnit: results.timeUnit,
      periodicData: results.periodicData,
    },
    summary: {
      overview: `Comprehensive financial analysis for ${data.project.name} showing ${formatCurrency(results.totalProfit)} projected profit over ${results.duration} ${results.timeUnit}s.`,
    },
    assumptions: data.model.assumptions,
  };
}

// Main export function with fallback to legacy
export async function exportRichPDF(data: RichReportData): Promise<void> {
  try {
    console.log('Attempting enhanced PDF export...');
    const exportSystem = new EnhancedExportSystem();
    const projectData = transformToProjectData(data);
    
    const results = await exportSystem.exportProject(projectData, {
      format: 'PDF',
      template: 'detailed',
      includeCharts: true,
      includeScenarioComparison: true,
      includeRiskAnalysis: false,
      colorScheme: 'fortress',
      pageSize: 'Letter',
      orientation: 'Portrait',
      companyName: 'Fortress Financial',
      author: 'Financial Analysis Team',
    });

    if (results.pdf?.success && results.pdf.data) {
      // Create download
      const blob = new Blob([results.pdf.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = results.pdf.filename || `${data.project.name}_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Enhanced PDF export successful');
    } else {
      throw new Error(results.pdf?.error || 'Enhanced PDF generation failed');
    }
    
    exportSystem.cleanup();
  } catch (error) {
    console.error('Enhanced PDF export failed, falling back to legacy:', error);
    // Fallback to legacy export
    return exportLegacyRichPDF(data);
  }
}

// Legacy export function as fallback
async function exportLegacyRichPDF(data: RichReportData): Promise<void> {
  console.log('Using legacy PDF export...');
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;
  const { format } = await import('date-fns');
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  
  // Simple title page
  doc.setFillColor(26, 41, 66); // fortress-blue
  doc.rect(0, 0, pageWidth, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('FINANCIAL MODEL REPORT', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(data.project.name, pageWidth / 2, 45, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Model: ${data.model.name}`, pageWidth / 2, 80, { align: 'center' });
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 95, { align: 'center' });
  
  // Executive Summary
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(26, 41, 66);
  doc.text('EXECUTIVE SUMMARY', margin, 30);
  
  const results = data.simulationResults;
  
  if (results) {
    // Key metrics table
    const summaryData = [
      ['Total Revenue Projection', formatCurrency(results.totalRevenue || 0)],
      ['Total Cost Projection', formatCurrency(results.totalCosts || 0)],
      ['Total Profit Projection', formatCurrency(results.totalProfit || 0)],
      ['Duration', `${results.duration || 0} ${results.timeUnit || 'months'}`],
      ['Break-even Point', results.breakEvenPoint ? `${results.timeUnit} ${results.breakEvenPoint}` : 'Not achieved'],
    ];
    
    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 6 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] }, // fortress-emerald
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 70 }
      }
    });
  }
  
  // Download
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Legacy_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
  console.log('Legacy PDF export completed');
}