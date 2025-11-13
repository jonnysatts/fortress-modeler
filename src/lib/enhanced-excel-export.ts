import { Project, FinancialModel } from './db';
import { format } from 'date-fns';
import { formatCurrency } from './utils';
import { EnhancedExportSystem } from './exports/EnhancedExportSystem';
import type { ExcelProjectData } from './exports/core/EnhancedExcelGenerator';

export interface EnhancedExportData {
  project: Project;
  models: FinancialModel[];
  includeScenarios?: boolean;
  includeSensitivity?: boolean;
  periods?: number;
  discountRate?: number;
}

// Transform data for enhanced export system
function transformEnhancedDataToProject(data: EnhancedExportData): ExcelProjectData {
  const { project, models } = data;
  
  // Create scenarios from models if available
  const scenarios = models.map((model, index) => ({
    name: model.name,
    label: index === 0 ? 'Realistic' as const : 'Custom' as const,
    projectedRevenue: model.assumptions?.revenue?.reduce((sum, rev) => sum + (rev.value || 0), 0) || 0,
    projectedExpenses: model.assumptions?.costs?.reduce((sum, cost) => sum + (cost.value || 0), 0) || 0,
    netProfit: 0, // Will be calculated
    roi: 0, // Will be calculated
    breakEvenMonth: 0,
    cashFlow: [],
    riskLevel: 'Medium' as const,
  }));

  // Calculate derived metrics
  scenarios.forEach(scenario => {
    scenario.netProfit = scenario.projectedRevenue - scenario.projectedExpenses;
    scenario.roi = scenario.projectedRevenue > 0 ? 
      (scenario.netProfit / scenario.projectedRevenue) * 100 : 0;
  });

  return {
    id: project.id,
    name: project.name,
    description: `Enhanced financial analysis for ${project.productType}`,
    models,
    scenarios,
    analysis: {
      totalRevenue: scenarios[0]?.projectedRevenue || 0,
      totalCosts: scenarios[0]?.projectedExpenses || 0,
      netProfit: scenarios[0]?.netProfit || 0,
      roi: scenarios[0]?.roi || 0,
      breakEvenMonth: 0,
    },
    summary: {
      overview: `Comprehensive financial model analysis for ${project.name}`,
    },
    assumptions: models[0]?.assumptions,
  };
}

// Enhanced Excel export function with fallback
export const exportEnhancedExcel = async (data: EnhancedExportData): Promise<void> => {
  try {
    console.log('Attempting enhanced Excel export...');
    const exportSystem = new EnhancedExportSystem();
    const projectData = transformEnhancedDataToProject(data);
    
    const results = await exportSystem.exportProject(projectData, {
      format: 'Excel',
      template: 'detailed',
      includeCharts: data.includeScenarios !== false,
      includeScenarioComparison: data.includeScenarios !== false,
      includeRiskAnalysis: data.includeSensitivity !== false,
      colorScheme: 'fortress',
      companyName: 'Fortress Financial',
      author: 'Financial Analysis Team',
      embedImages: false,
    });

    if (results.excel?.success && results.excel.data) {
      // Create download
      const blob = new Blob([results.excel.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = results.excel.filename || `${data.project.name}_Enhanced_Analysis.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('Enhanced Excel export successful');
    } else {
      throw new Error(results.excel?.error || 'Enhanced Excel generation failed');
    }
    
    exportSystem.cleanup();
  } catch (error) {
    console.error('Enhanced Excel export failed, falling back to legacy:', error);
    // Fallback to legacy Excel export
    return exportLegacyExcel(data);
  }
};

// Legacy Excel export as fallback
async function exportLegacyExcel(data: EnhancedExportData): Promise<void> {
  console.log('Using legacy Excel export...');
  const XLSX = await import('xlsx');
  const { format } = await import('date-fns');
  
  const workbook = XLSX.utils.book_new();
  
  // Create basic summary sheet
  const summaryData = [
    ['FORTRESS FINANCIAL MODELER - EXCEL EXPORT'],
    [],
    ['Project Name:', data.project.name],
    ['Product Type:', data.project.productType],
    ['Generated:', format(new Date(), 'PPP')],
    [],
    ['MODELS INCLUDED'],
  ];
  
  data.models.forEach((model, index) => {
    summaryData.push([`Model ${index + 1}:`, model.name]);
    if (model.assumptions?.revenue) {
      summaryData.push(['Revenue Streams:', model.assumptions.revenue.length]);
    }
    if (model.assumptions?.costs) {
      summaryData.push(['Cost Categories:', model.assumptions.costs.length]);
    }
    summaryData.push([]);
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  
  // Add model details if available
  if (data.models[0]?.assumptions?.revenue) {
    const revenueData = data.models[0].assumptions.revenue.map(rev => ({
      'Revenue Stream': rev.name,
      'Value': rev.value,
      'Type': rev.type || 'N/A',
      'Frequency': rev.frequency || 'Monthly'
    }));
    
    const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Streams');
  }
  
  if (data.models[0]?.assumptions?.costs) {
    const costData = data.models[0].assumptions.costs.map(cost => ({
      'Cost Item': cost.name,
      'Value': cost.value,
      'Type': cost.type || 'N/A',
      'Category': cost.category || 'General'
    }));
    
    const costSheet = XLSX.utils.json_to_sheet(costData);
    XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Structure');
  }
  
  // Download the file
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Legacy_Excel_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  console.log('Legacy Excel export completed');
}