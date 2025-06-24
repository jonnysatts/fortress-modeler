import * as XLSX from 'xlsx';
import { Project, FinancialModel } from './db';
import { format } from 'date-fns';
import { 
  performFinancialAnalysis, 
  generateCashFlowProjections, 
  performScenarioAnalysis 
} from './financial-calculations';
import { formatCurrency } from './utils';

export interface EnhancedExportData {
  project: Project;
  models: FinancialModel[];
  includeScenarios?: boolean;
  includeSensitivity?: boolean;
  periods?: number;
  discountRate?: number;
}

export const exportEnhancedExcel = async (data: EnhancedExportData): Promise<void> => {
  const {
    project,
    models,
    includeScenarios = true,
    includeSensitivity = true,
    periods = 36,
    discountRate = 0.1
  } = data;

  const workbook = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const executiveSummary = [];
  executiveSummary.push(['FORTRESS FINANCIAL MODELER - EXECUTIVE SUMMARY']);
  executiveSummary.push([]);
  executiveSummary.push(['Report Generated:', format(new Date(), 'PPP')]);
  executiveSummary.push(['Project Name:', project.name]);
  executiveSummary.push(['Product Type:', project.productType]);
  executiveSummary.push(['Target Audience:', project.targetAudience || 'Not specified']);
  executiveSummary.push(['Created:', format(project.createdAt, 'PPP')]);
  executiveSummary.push(['Last Updated:', format(project.updatedAt, 'PPP')]);
  executiveSummary.push([]);
  
  if (models.length > 0) {
    const primaryModel = models[0];
    const metrics = performFinancialAnalysis(primaryModel, periods, discountRate, false);
    
    executiveSummary.push(['KEY FINANCIAL METRICS']);
    executiveSummary.push(['Net Present Value (NPV):', formatCurrency(metrics.npv)]);
    executiveSummary.push(['Internal Rate of Return (IRR):', `${metrics.irr.toFixed(2)}%`]);
    executiveSummary.push(['Return on Investment (ROI):', `${metrics.roi.toFixed(2)}%`]);
    executiveSummary.push(['Payback Period:', `${metrics.paybackPeriod.toFixed(1)} months`]);
    executiveSummary.push(['Total Revenue Projection:', formatCurrency(metrics.totalRevenue)]);
    executiveSummary.push(['Total Costs:', formatCurrency(metrics.totalCosts)]);
    executiveSummary.push(['Total Profit:', formatCurrency(metrics.totalProfit)]);
    executiveSummary.push(['Profit Margin:', `${metrics.profitMargin.toFixed(1)}%`]);
    
    if (metrics.breakEvenUnits) {
      executiveSummary.push(['Break-even Units:', metrics.breakEvenUnits.toLocaleString()]);
    }
    if (metrics.breakEvenRevenue) {
      executiveSummary.push(['Break-even Revenue:', formatCurrency(metrics.breakEvenRevenue)]);
    }
  }
  
  const summarySheet = XLSX.utils.aoa_to_sheet(executiveSummary);
  
  // Set column widths
  summarySheet['!cols'] = [
    { width: 25 },
    { width: 20 }
  ];
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // 2. Financial Models Overview
  if (models.length > 0) {
    const modelsData = models.map(model => ({
      'Model Name': model.name,
      'Created': format(model.createdAt, 'MM/dd/yyyy'),
      'Revenue Streams': model.assumptions?.revenue?.length || 0,
      'Cost Categories': model.assumptions?.costs?.length || 0,
      'Growth Model': model.assumptions?.growthModel?.type || 'N/A',
      'Growth Rate': model.assumptions?.growthModel?.rate ? `${(model.assumptions.growthModel.rate * 100).toFixed(1)}%` : 'N/A',
    }));

    const modelsSheet = XLSX.utils.json_to_sheet(modelsData);
    modelsSheet['!cols'] = [
      { width: 25 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, modelsSheet, 'Financial Models');

    // 3. Detailed Revenue Analysis
    const revenueAnalysis = [];
    models.forEach(model => {
      if (model.assumptions?.revenue) {
        model.assumptions.revenue.forEach(rev => {
          revenueAnalysis.push({
            'Model': model.name,
            'Revenue Stream': rev.name,
            'Base Value': formatCurrency(rev.value),
            'Type': rev.type,
            'Frequency': rev.frequency || 'Monthly',
            'Annual Value': formatCurrency(rev.value * (rev.frequency === 'weekly' ? 52 : rev.frequency === 'quarterly' ? 4 : rev.frequency === 'annually' ? 1 : 12))
          });
        });
      }
    });

    if (revenueAnalysis.length > 0) {
      const revenueSheet = XLSX.utils.json_to_sheet(revenueAnalysis);
      revenueSheet['!cols'] = [
        { width: 20 },
        { width: 25 },
        { width: 15 },
        { width: 12 },
        { width: 12 },
        { width: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Analysis');
    }

    // 4. Detailed Cost Analysis
    const costAnalysis = [];
    models.forEach(model => {
      if (model.assumptions?.costs) {
        model.assumptions.costs.forEach(cost => {
          costAnalysis.push({
            'Model': model.name,
            'Cost Item': cost.name,
            'Value': formatCurrency(cost.value),
            'Type': cost.type,
            'Category': cost.category,
            'Annual Cost': formatCurrency(cost.value * 12) // Assuming monthly base
          });
        });
      }
    });

    if (costAnalysis.length > 0) {
      const costSheet = XLSX.utils.json_to_sheet(costAnalysis);
      costSheet['!cols'] = [
        { width: 20 },
        { width: 25 },
        { width: 15 },
        { width: 12 },
        { width: 15 },
        { width: 15 }
      ];
      XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Analysis');
    }

    // 5. Cash Flow Projections (Detailed)
    const primaryModel = models[0];
    const cashFlows = generateCashFlowProjections(primaryModel, periods, false);
    
    const cashFlowData = cashFlows.map(cf => ({
      'Period': cf.periodName,
      'Revenue': cf.revenue,
      'Costs': cf.costs,
      'Net Income': cf.netIncome,
      'Operating CF': cf.operatingCashFlow,
      'Investing CF': cf.investingCashFlow,
      'Financing CF': cf.financingCashFlow,
      'Net CF': cf.netCashFlow,
      'Cumulative CF': cf.cumulativeCashFlow
    }));

    const cashFlowSheet = XLSX.utils.json_to_sheet(cashFlowData);
    cashFlowSheet['!cols'] = [
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, cashFlowSheet, 'Cash Flow Projections');

    // 6. Scenario Analysis (if requested)
    if (includeScenarios) {
      const scenarioAnalysis = performScenarioAnalysis(primaryModel, periods, discountRate, false);
      
      const scenarioData = [
        {
          'Scenario': 'Worst Case',
          'NPV': formatCurrency(scenarioAnalysis.worstCase.npv),
          'IRR': `${scenarioAnalysis.worstCase.irr.toFixed(2)}%`,
          'ROI': `${scenarioAnalysis.worstCase.roi.toFixed(2)}%`,
          'Total Revenue': formatCurrency(scenarioAnalysis.worstCase.totalRevenue),
          'Total Profit': formatCurrency(scenarioAnalysis.worstCase.totalProfit),
          'Profit Margin': `${scenarioAnalysis.worstCase.profitMargin.toFixed(1)}%`
        },
        {
          'Scenario': 'Base Case',
          'NPV': formatCurrency(scenarioAnalysis.baseCase.npv),
          'IRR': `${scenarioAnalysis.baseCase.irr.toFixed(2)}%`,
          'ROI': `${scenarioAnalysis.baseCase.roi.toFixed(2)}%`,
          'Total Revenue': formatCurrency(scenarioAnalysis.baseCase.totalRevenue),
          'Total Profit': formatCurrency(scenarioAnalysis.baseCase.totalProfit),
          'Profit Margin': `${scenarioAnalysis.baseCase.profitMargin.toFixed(1)}%`
        },
        {
          'Scenario': 'Best Case',
          'NPV': formatCurrency(scenarioAnalysis.bestCase.npv),
          'IRR': `${scenarioAnalysis.bestCase.irr.toFixed(2)}%`,
          'ROI': `${scenarioAnalysis.bestCase.roi.toFixed(2)}%`,
          'Total Revenue': formatCurrency(scenarioAnalysis.bestCase.totalRevenue),
          'Total Profit': formatCurrency(scenarioAnalysis.bestCase.totalProfit),
          'Profit Margin': `${scenarioAnalysis.bestCase.profitMargin.toFixed(1)}%`
        }
      ];

      const scenarioSheet = XLSX.utils.json_to_sheet(scenarioData);
      scenarioSheet['!cols'] = [
        { width: 12 },
        { width: 15 },
        { width: 10 },
        { width: 10 },
        { width: 15 },
        { width: 15 },
        { width: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, scenarioSheet, 'Scenario Analysis');

      // 7. Sensitivity Analysis (if requested)
      if (includeSensitivity) {
        const sensitivityData = [];
        
        // Revenue sensitivity
        scenarioAnalysis.sensitivity.revenueImpact.forEach(impact => {
          sensitivityData.push({
            'Variable': 'Revenue',
            'Change %': `${impact.change}%`,
            'NPV Impact %': `${impact.npvChange.toFixed(2)}%`,
            'Type': 'Revenue Sensitivity'
          });
        });
        
        // Cost sensitivity
        scenarioAnalysis.sensitivity.costImpact.forEach(impact => {
          sensitivityData.push({
            'Variable': 'Costs',
            'Change %': `${impact.change}%`,
            'NPV Impact %': `${impact.npvChange.toFixed(2)}%`,
            'Type': 'Cost Sensitivity'
          });
        });

        const sensitivitySheet = XLSX.utils.json_to_sheet(sensitivityData);
        sensitivitySheet['!cols'] = [
          { width: 15 },
          { width: 12 },
          { width: 15 },
          { width: 20 }
        ];
        XLSX.utils.book_append_sheet(workbook, sensitivitySheet, 'Sensitivity Analysis');
      }
    }

    // 8. Assumptions Summary
    const assumptionsData = [];
    models.forEach(model => {
      assumptionsData.push({
        'Model': model.name,
        'Analysis Periods': periods,
        'Discount Rate': `${(discountRate * 100).toFixed(1)}%`,
        'Growth Model': model.assumptions?.growthModel?.type || 'None',
        'Growth Rate': model.assumptions?.growthModel?.rate ? `${(model.assumptions.growthModel.rate * 100).toFixed(1)}%` : 'N/A',
        'Revenue Streams': model.assumptions?.revenue?.length || 0,
        'Cost Categories': model.assumptions?.costs?.length || 0
      });
    });

    const assumptionsSheet = XLSX.utils.json_to_sheet(assumptionsData);
    assumptionsSheet['!cols'] = [
      { width: 20 },
      { width: 15 },
      { width: 12 },
      { width: 15 },
      { width: 12 },
      { width: 15 },
      { width: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, assumptionsSheet, 'Assumptions');
  }

  // Download the enhanced Excel file
  const fileName = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Enhanced_Financial_Analysis_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};