/**
 * Excel Export Functionality
 *
 * This module provides functions to generate structured Excel reports
 * from application data.
 */

import * as XLSX from 'xlsx';
import { ExportDataType /*, MarketingChannel, PerformancePeriod, PortfolioProject */ } from '@/store/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { getPortfolioExportData } from '@/lib/portfolioExport';

// Define inline types if specific ones aren't exported
type PortfolioProjectType = {
  name: string;
  productType?: string;
  totalRevenue?: number;
  totalProfit?: number;
  profitMargin?: number;
  healthScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  // Add other properties if needed
};

type PerformancePeriodType = {
  name?: string;
  attendanceForecast?: number;
  attendanceActual?: number;
  notes?: string;
  forecast?: number; // Assuming revenue forecast
  actual?: number;   // Assuming revenue actual
  // Add other properties if needed
};

type ChannelLikeType = {
  name: string;
  forecast?: number;
  actual?: number;
  totalForecast?: number; // From marketingChannels
  actualSpend?: number; // From marketingChannels
  type?: string; // From marketingChannels
  conversions?: number;
  costPerResult?: number;
  // Add other properties if needed
};

/**
 * Generate an Excel file from export data
 *
 * @param data The data to include in the Excel file
 * @param reportTitle The title of the report
 * @param projectId Optional project ID. If provided, generates a project-specific report. Otherwise, portfolio report.
 * @returns A promise that resolves when the Excel file is generated
 */
export async function generateExcelReport(data: ExportDataType, reportTitle: string, projectId?: number | null): Promise<void> {
  try {
    console.log('[ExcelExport][DEBUG] Called generateExcelReport with data:', data);
    // --- BEGIN DEEP DATA LOGGING ---
    try {
      console.log('[ExcelExport][DATA] Full export data:', JSON.stringify(data, null, 2));
      if (Array.isArray(data.scenarios)) {
        data.scenarios.forEach((scenario, idx) => {
          console.log(`[ExcelExport][DATA] Scenario ${idx} name:`, scenario.name);
          console.log(`[ExcelExport][DATA] Scenario ${idx} parameters:`, JSON.stringify(scenario.parameters, null, 2));
          console.log(`[ExcelExport][DATA] Scenario ${idx} assumptions:`, JSON.stringify(scenario.assumptions, null, 2));
          console.log(`[ExcelExport][DATA] Scenario ${idx} model:`, JSON.stringify(scenario.model, null, 2));
        });
      }
      console.log('[ExcelExport][DATA] Baseline model:', JSON.stringify(data.model, null, 2));
      console.log('[ExcelExport][DATA] Baseline assumptions:', JSON.stringify(data.assumptions, null, 2));
      console.log('[ExcelExport][DATA] Baseline parameters:', JSON.stringify(data.parameters, null, 2));
    } catch (logErr) {
      console.error('[ExcelExport][DATA] Logging error:', logErr);
    }
    // --- END DEEP DATA LOGGING ---
    console.log(`[Excel] Generating Excel report: ${reportTitle} (Project ID: ${projectId ?? 'N/A'})`);
    console.log('[Excel] Data:', data);

    const workbook = XLSX.utils.book_new();
    console.log('[ExcelExport][DEBUG] Step: Created new workbook');

    // Determine project name for file naming (from project data or portfolio data)
    let projectNameForFile = 'Fortress_Report';
    if (projectId && data.projectName) { // Project export
      projectNameForFile = data.projectName;
    } else if (!projectId && data.title) { // Portfolio export might use title
      projectNameForFile = data.title.includes('Overview') ? 'Portfolio_Overview' : data.title;
    } else if (data.projectName) { // Fallback
      projectNameForFile = data.projectName;
    }
    console.log('[ExcelExport][DEBUG] Step: Determined projectNameForFile', projectNameForFile);

    const exportDate = new Date();
    const formattedDate = exportDate.toISOString().split('T')[0];
    const fileName = `${projectNameForFile.replace(/\s+/g, '')}_${reportTitle.replace(/\s+/g, '')}_${formattedDate}.xlsx`;
    console.log('[ExcelExport][DEBUG] Step: Built fileName', fileName);

    // --- Enhanced Scenario Export ---
    if (Array.isArray(data.scenarios) && data.scenarios.length > 0) {
      const scenarios = data.scenarios;
      console.log('[ExcelExport][DEBUG] Step: Found scenarios', scenarios.map(s => s.name));
      scenarios.forEach((scenario, idx) => {
        const scenarioName = scenario.name || `Scenario ${idx + 1}`;
        const safeSheetName = `Scenario - ${scenarioName}`.substring(0, 31);
        const scenarioData = scenario;
        try {
          addSummarySheet(workbook, scenarioData, safeSheetName + ' Summary');
          console.log('[ExcelExport][DEBUG] Step: Added summary sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add summary sheet for', scenarioName, e);
        }
        try {
          addAssumptionsSheet(workbook, data, scenario);
          console.log('[ExcelExport][DEBUG] Step: Added assumptions sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add assumptions sheet for', scenarioName, e);
        }
        try {
          addScenarioParametersSheet(workbook, data, scenario);
          console.log('[ExcelExport][DEBUG] Step: Added scenario parameters sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add scenario parameters sheet for', scenarioName, e);
        }
        try {
          addForecastVsActualSheet(workbook, scenarioData);
          console.log('[ExcelExport][DEBUG] Step: Added forecast vs actual sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add forecast vs actual sheet for', scenarioName, e);
        }
        try {
          addForecastTableSheet(workbook, scenarioData, safeSheetName + ' Forecast');
          console.log('[ExcelExport][DEBUG] Step: Added forecast table sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add forecast table sheet for', scenarioName, e);
        }
        try {
          addMarketingSpendSheet(workbook, scenarioData);
          console.log('[ExcelExport][DEBUG] Step: Added marketing spend sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add marketing spend sheet for', scenarioName, e);
        }
        try {
          addAttendanceSheet(workbook, scenarioData);
          console.log('[ExcelExport][DEBUG] Step: Added attendance sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add attendance sheet for', scenarioName, e);
        }
        try {
          addRawDataSheet(workbook, scenarioData);
          console.log('[ExcelExport][DEBUG] Step: Added raw data sheet for', scenarioName);
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add raw data sheet for', scenarioName, e);
        }
      });
      try {
        addScenarioComparisonSheet(workbook, scenarios);
        console.log('[ExcelExport][DEBUG] Step: Added Scenario Comparison sheet');
      } catch (e) {
        console.error('[ExcelExport][ERROR] Failed to add Scenario Comparison sheet', e);
      }
    } else {
      console.log('[ExcelExport][DEBUG] Step: No scenarios found, using baseline export');
      if (!projectId) {
        try {
          addPortfolioOverviewSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added portfolio summary sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add portfolio summary sheet', e);
        }
      } else {
        try {
          addSummarySheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added baseline summary sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add baseline summary sheet', e);
        }
        try {
          addAssumptionsSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added assumptions sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add assumptions sheet', e);
        }
        try {
          addScenarioParametersSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added scenario parameters sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add scenario parameters sheet', e);
        }
        try {
          addForecastVsActualSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added forecast vs actual sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add forecast vs actual sheet', e);
        }
        try {
          addForecastTableSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added baseline forecast table sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add baseline forecast table sheet', e);
        }
        try {
          addMarketingSpendSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added marketing spend sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add marketing spend sheet', e);
        }
        try {
          addAttendanceSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added attendance sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add attendance sheet', e);
        }
        try {
          addRawDataSheet(workbook, data);
          console.log('[ExcelExport][DEBUG] Step: Added raw data sheet');
        } catch (e) {
          console.error('[ExcelExport][ERROR] Failed to add raw data sheet', e);
        }
      }
    }
    console.log('[ExcelExport][DEBUG] Finished building workbook, about to trigger download:', fileName);
    XLSX.writeFile(workbook, fileName);
    console.log('[ExcelExport][DEBUG] Excel file download triggered:', fileName);
    console.log('[ExcelExport][DEBUG] Excel report generated:', fileName);
  } catch (error) {
    console.error('[ExcelExport][ERROR] Failed to generate Excel report:', error);
    throw error;
  }
}

/**
 * Add the Portfolio Overview sheet to the workbook
 * (Only called for Portfolio exports)
 */
function addPortfolioOverviewSheet(workbook: XLSX.WorkBook, portfolioData: ExportDataType): void {
  console.log('[Excel] Adding Portfolio Overview sheet');
  // Use portfolioData directly
  const summary = portfolioData.summary || {};
  const formattedSummary = portfolioData.formattedSummary || {};
  const riskDistribution = portfolioData.riskDistribution || { highRisk: 0, mediumRisk: 0, lowRisk: 0 };
  const projects = (portfolioData.projects as PortfolioProjectType[]) || []; // Use defined type

  // Create the portfolio summary section
  const portfolioSummary = [
    ['FORTRESS MODELER - PORTFOLIO OVERVIEW', ''],
    ['Export Date', new Date().toLocaleDateString()],
    [''],
    ['KEY METRICS', ''],
    ['Total Products', formattedSummary.totalProducts || summary.totalProducts || '0'],
    ['Total Revenue', formattedSummary.totalRevenue || formatCurrency(summary.totalRevenue || 0)],
    ['Total Profit', formattedSummary.totalProfit || formatCurrency(summary.totalProfit || 0)],
    ['Average Profit Margin', formattedSummary.avgProfitMargin || `${(summary.avgProfitMargin || 0).toFixed(1)}%`],
    ['Products Requiring Attention', formattedSummary.projectsWithWarnings || summary.projectsWithWarnings || '0'],
    [''],
    ['PERFORMANCE METRICS', ''],
    ['Average Profit Margin', formattedSummary.avgProfitMargin || `${(summary.avgProfitMargin || 0).toFixed(1)}%`],
    ['Average Growth Rate', formattedSummary.avgGrowthRate || `${(summary.avgGrowthRate || 0).toFixed(1)}%`],
    ['Portfolio Health Score', formattedSummary.avgHealthScore || summary.avgHealthScore || '0'],
    [''],
    ['RISK DISTRIBUTION', ''],
    ['Low Risk', riskDistribution.lowRisk || 0],
    ['Medium Risk', riskDistribution.mediumRisk || 0],
    ['High Risk', riskDistribution.highRisk || 0],
    ['']
  ];

  // Create the projects table header
  const projectsHeader = [
    ['PRODUCT PERFORMANCE', '', '', '', '', '', ''],
    ['Product', 'Type', 'Revenue', 'Profit', 'Margin', 'Health', 'Risk Level']
  ];

  // Use defined type for project
  const projectRows = projects.map((project: PortfolioProjectType) => [
    project.name,
    project.productType || '',
    formatCurrency(project.totalRevenue || 0),
    formatCurrency(project.totalProfit || 0),
    `${(project.profitMargin || 0).toFixed(1)}%`,
    project.healthScore || 0,
    project.riskLevel || 'medium'
  ]);

  // Combine all sections
  const worksheetData = [...portfolioSummary, ...projectsHeader, ...projectRows];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = [
    { wch: 25 },  // A
    { wch: 15 },  // B
    { wch: 15 },  // C
    { wch: 15 },  // D
    { wch: 10 },  // E
    { wch: 10 },  // F
    { wch: 12 }   // G
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Portfolio Overview');
}

/**
 * Add the Summary sheet to the workbook
 * (Now relies purely on input data, no hardcoding)
 */
function addSummarySheet(workbook: XLSX.WorkBook, productData: ExportDataType, sheetName?: string): void {
  console.log('[Excel] Adding Summary sheet using dynamic data');

  // --- PATCH: If this is a scenario, check for scenario-specific fields ---
  const forecastTableData = productData.forecastTableData || [];
  const summary = productData.summary || {};
  let totalForecastRevenue = summary.totalForecast || 0;
  let totalForecastProfit = summary.totalForecastProfit || 0;
  let totalForecastCost = summary.totalForecastCost || 0;
  let profitMargin = 0;

  if (forecastTableData.length > 0) {
    totalForecastRevenue = forecastTableData.reduce((sum: number, period: any) => sum + (period.revenue || 0), 0);
    totalForecastCost = forecastTableData.reduce((sum: number, period: any) => sum + (period.totalCost ?? period.cost ?? 0), 0);
    totalForecastProfit = forecastTableData.reduce((sum: number, period: any) => sum + (period.profit || 0), 0);
    profitMargin = totalForecastRevenue !== 0 ? (totalForecastProfit / totalForecastRevenue) * 100 : 0;
  } else if (totalForecastRevenue !== 0) {
    profitMargin = (totalForecastProfit / totalForecastRevenue) * 100;
  }

  // --- PATCH: Prefer scenario/projectName if present, fallback to parent data ---
  const productName = productData.projectName || productData.productName || productData.title || '';
  const productType = productData.productType || (productData.model?.assumptions?.metadata?.type ?? '');
  const exportDate = productData.exportDate ? new Date(productData.exportDate).toLocaleDateString() : '';

  const summaryData = [
    ['FORTRESS MODELER - PROJECT SUMMARY'],
    [''],
    ['PROJECT INFORMATION'],
    ['Product Name', productName],
    ['Project Name', productName],
    ['Export Date', exportDate],
    ['Product Type', productType],
    [''],
    ['FINANCIAL SUMMARY'],
    ['Total Forecast Revenue', formatCurrency(totalForecastRevenue)],
    ['Total Forecast Profit', formatCurrency(totalForecastProfit)],
    ['Forecast Profit Margin', `${profitMargin.toFixed(1)}%`],
    ['Actual Revenue (if available)', formatCurrency(summary.totalActual || 0)],
    ['Actual Profit (if available)', formatCurrency(summary.totalActualProfit || 0)],
    ['Variance ($)', formatCurrency((summary.totalActual || 0) - totalForecastRevenue)],
    ['Variance (%)', totalForecastRevenue !== 0 ? `${(((summary.totalActual || 0) - totalForecastRevenue) / totalForecastRevenue * 100).toFixed(1)}%` : 'N/A'],
    ['Breakeven Point', 'N/A'],
    [''],
    ['PERFORMANCE INDICATORS'],
    ['Growth Rate', 'N/A'],
    ['Health Score', 'N/A'],
    ['Risk Level', 'N/A'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
  worksheet['!cols'] = [{ wch: 30 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Summary');
}

/**
 * Add the Assumptions sheet to the workbook
 * (Now relies purely on input data, no hardcoding)
 */
function addAssumptionsSheet(workbook: XLSX.WorkBook, productData: ExportDataType, scenario?: any): void {
  console.log('[Excel] Adding Assumptions sheet using dynamic data');
  // Always use scenario-specific assumptions if present, otherwise fallback to baseline assumptions
  let assumptions = scenario?.assumptions;
  if (!assumptions || Object.keys(assumptions).length === 0) {
    assumptions = productData.model?.assumptions || {};
  }
  let model = productData.model || productData;
  let metadata = assumptions.metadata || productData.metadata || {};
  let growth = metadata.growth || productData.growth || {};
  let perCustomer = metadata.perCustomer || productData.perCustomer || {};
  let costs = metadata.costs || productData.costs || {};
  let marketing = assumptions.marketing || productData.marketing || {};

  // Dynamic assumptions data build
  const assumptionsData = [
    ['FORTRESS MODELER - MODEL ASSUMPTIONS', ''],
    [''],
    ['GROWTH ASSUMPTIONS', ''],
    ['Growth Model', metadata.growthModelType || growth.type || 'N/A'],
    ['Weekly Growth Rate', growth.rate != null ? formatPercent(growth.rate) : 'N/A'],
    ['Initial Weekly Attendance', metadata.initialWeeklyAttendance?.toString() || 'N/A'],
    ['Weeks in Model', metadata.weeks?.toString() || 'N/A'],
    [''],
    ['REVENUE ASSUMPTIONS', ''],
    ['Ticket Price per Attendee', perCustomer.ticketPrice != null ? formatCurrency(perCustomer.ticketPrice) : 'N/A'],
    ['F&B Spend per Attendee', perCustomer.fbSpend != null ? formatCurrency(perCustomer.fbSpend) : 'N/A'],
    ['Merchandise Spend per Attendee', perCustomer.merchandiseSpend != null ? formatCurrency(perCustomer.merchandiseSpend) : 'N/A'],
    [''],
    ['COST ASSUMPTIONS', ''],
    ['F&B COGS', costs.fbCOGSPercent != null ? formatPercent(costs.fbCOGSPercent) : 'N/A'],
    ['Merchandise COGS', costs.merchandiseCogsPercent != null ? formatPercent(costs.merchandiseCogsPercent) : 'N/A'],
    ['Staff Count', costs.staffCount?.toString() || 'N/A'],
    ['Staff Cost per Person', costs.staffCostPerPerson != null ? formatCurrency(costs.staffCostPerPerson) : 'N/A'],
    ['Management Fee', costs.managementFee != null ? formatCurrency(costs.managementFee) : 'N/A'],
    [''],
    ['MARKETING ASSUMPTIONS', ''],
    ['Weekly Marketing Budget',
      marketing?.allocationMode === 'channels'
        ? formatCurrency((marketing.channels || []).reduce((sum: number, ch: any) => sum + (ch.weeklyBudget || 0), 0))
        : 'N/A'
    ],
    ['Total Marketing Budget',
      marketing?.allocationMode === 'highLevel'
        ? formatCurrency(marketing.totalBudget || 0)
        : marketing?.allocationMode === 'channels'
        ? formatCurrency((marketing.channels || []).reduce((sum: number, ch: any) => sum + (ch.weeklyBudget || 0), 0) * (metadata?.weeks || 12))
        : '$0'
    ]
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(assumptionsData);
  worksheet['!cols'] = [ { wch: 30 }, { wch: 20 } ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assumptions');
}

/**
 * Add the Scenario Parameters sheet to the workbook
 */
function addScenarioParametersSheet(workbook: XLSX.WorkBook, data: ExportDataType, scenario?: any): void {
  console.log('[Excel] Adding Scenario Parameters sheet');
  // Use scenario parameters if present, else fallback to empty
  const parameters = scenario?.parameters || {};
  // Use baseline parameters for comparison if needed
  const baselineParameters = data.model?.parameters || {};

  const scenarioParams: any[] = [];

  if (Object.keys(parameters).length > 0) {
    scenarioParams.push(['Parameter Name', 'Original Value', 'Scenario Value', 'Delta %']);
    Object.entries(parameters).forEach(([name, values]: [string, any]) => {
      const originalValue = values.original ?? '';
      const scenarioValue = values.scenario ?? '';
      let deltaPercent = '';
      if (typeof originalValue === 'number' && typeof scenarioValue === 'number' && originalValue !== 0) {
        deltaPercent = (((scenarioValue - originalValue) / originalValue) * 100).toFixed(2) + '%';
      } else if (originalValue !== '' && scenarioValue !== '' && originalValue !== scenarioValue) {
        deltaPercent = 'Changed';
      } else {
        deltaPercent = '0%';
      }
      scenarioParams.push([
        name,
        originalValue,
        scenarioValue,
        deltaPercent
      ]);
    });
  } else {
    // If baseline has parameters, show them simply
    scenarioParams.push(['Parameter Name', 'Value']);
    Object.entries(baselineParameters).forEach(([name, values]: [string, any]) => {
      const value = values.original ?? values.value ?? '';
      scenarioParams.push([name, value]);
    });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(scenarioParams);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scenario Parameters');
}

/**
 * Add the Forecast vs Actual sheet to the workbook
 * (Now relies purely on input data, no hardcoding)
 */
function addForecastVsActualSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Forecast vs Actual sheet using dynamic data');

  const summary = productData.summary || {};
  const performanceData = productData.performanceData || {};
  const periodPerformance = (productData.performanceData?.periodPerformance as PerformancePeriodType[]) || []; // Use defined type

  const forecastVsActualData = [
    ['FORTRESS MODELER - FORECAST VS ACTUAL', '', '', '', ''],
    [''],
    ['Metric', 'Forecast Value', 'Actual Value', 'Variance ($)', 'Variance (%)']
  ];

  // Revenue
  const totalForecast = summary.totalForecast || 0;
  const totalActual = summary.totalActual || 0;
  const revenueVariance = totalActual - totalForecast;
  const revenueVariancePercent = totalForecast !== 0 ? (revenueVariance / totalForecast) * 100 : 0;

  // Remove Trivia/Mead hardcoded overrides
  /*
  if (projectName === 'Trivia' || projectName.toLowerCase().includes('trivia')) {
     // ... removed
  }
  else if (projectName === 'Mead & Minis' || projectName.toLowerCase().includes('mead')) {
     // ... removed
  }
  */

  forecastVsActualData.push([
    'Revenue',
    formatCurrency(totalForecast),
    formatCurrency(totalActual),
    formatCurrency(revenueVariance),
    `${revenueVariancePercent.toFixed(2)}%`
  ]);

  // Marketing Spend
  const marketingChannels = (productData.marketingChannels as ChannelLikeType[]) || [];
  const channelPerformance = (productData.performanceData?.channelPerformance as ChannelLikeType[]) || [];
  const marketingDataSource: ChannelLikeType[] = marketingChannels.length > 0 ? marketingChannels : channelPerformance;

  const totalMarketingForecast = marketingDataSource.reduce((sum: number, channel: ChannelLikeType) => sum + (channel.forecast || channel.totalForecast || 0), 0);
  const totalMarketingActual = marketingDataSource.reduce((sum: number, channel: ChannelLikeType) => sum + (channel.actual || channel.actualSpend || 0), 0);

  // Remove Trivia/Mead hardcoded overrides
  /*
  if (projectName === 'Trivia' || projectName.toLowerCase().includes('trivia')) {
      // ... removed
  }
  else if (projectName === 'Mead & Minis' || projectName.toLowerCase().includes('mead')) {
     // ... removed
  }
  */

  if (totalMarketingForecast > 0 || totalMarketingActual > 0) {
    const marketingVariance = totalMarketingActual - totalMarketingForecast;
    const marketingVariancePercent = totalMarketingForecast !== 0
      ? (marketingVariance / totalMarketingForecast) * 100
      : 0;
    forecastVsActualData.push([
      'Marketing Spend',
      formatCurrency(totalMarketingForecast),
      formatCurrency(totalMarketingActual),
      formatCurrency(marketingVariance),
      `${marketingVariancePercent.toFixed(2)}%`
    ]);
  }

  // Attendance
  const totalAttendanceForecast = periodPerformance.reduce((sum: number, period: PerformancePeriodType) => sum + (period.attendanceForecast || 0), 0);
  const totalAttendanceActual = periodPerformance.reduce((sum: number, period: PerformancePeriodType) => sum + (period.attendanceActual || 0), 0);

  // Remove Trivia/Mead hardcoded overrides
  /*
  if (projectName === 'Trivia' || projectName.toLowerCase().includes('trivia')) {
      // ... removed
  }
  else if (projectName === 'Mead & Minis' || projectName.toLowerCase().includes('mead')) {
      // ... removed
  }
  */

  if (totalAttendanceForecast > 0 || totalAttendanceActual > 0) {
    const attendanceVariance = totalAttendanceActual - totalAttendanceForecast;
    const attendanceVariancePercent = totalAttendanceForecast !== 0
      ? (attendanceVariance / totalAttendanceForecast) * 100
      : 0;
    forecastVsActualData.push([
      'Attendance',
      totalAttendanceForecast.toString(),
      totalAttendanceActual.toString(),
      attendanceVariance.toString(),
      `${attendanceVariancePercent.toFixed(2)}%`
    ]);
  }

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(forecastVsActualData);

  // Set column widths
  const columnWidths = [
    { wch: 20 },  // A - Metric
    { wch: 15 },  // B - Forecast Value
    { wch: 15 },  // C - Actual Value
    { wch: 15 },  // D - Variance ($)
    { wch: 15 }   // E - Variance (%)
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Forecast vs Actual');
}

/**
 * Add the Marketing Spend sheet to the workbook
 * This version uses forecastTableData (from the UI) as the source of truth for channel spend.
 */
function addMarketingSpendSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Marketing Spend sheet using forecastTableData');
  const forecastTableData = productData.forecastTableData || [];
  const marketingChannels = (productData.marketingChannels as ChannelLikeType[]) || [];

  // Build a map of channelId/name to total forecasted spend from forecastTableData
  // Assume each period in forecastTableData has marketingSpendByChannel: { [channelId]: number }
  const channelSpendMap: Record<string, number> = {};
  forecastTableData.forEach((period: any) => {
    if (period.marketingSpendByChannel) {
      Object.entries(period.marketingSpendByChannel).forEach(([channelId, spend]) => {
        channelSpendMap[channelId] = (channelSpendMap[channelId] || 0) + (spend || 0);
      });
    }
  });

  // Build the rows for the sheet
  const marketingSpendData = [
    ['Channel Name', 'Forecast Spend', 'Actual Spend', 'Variance ($)', 'Variance (%)']
  ];

  marketingChannels.forEach((channel: ChannelLikeType & { id?: string }) => {
    const channelId = channel.id || channel.name;
    const forecast = channelSpendMap[channelId] || 0;
    const actual = channel.actual || channel.actualSpend || 0;
    const variance = actual - forecast;
    const variancePercent = forecast !== 0 ? (variance / forecast) * 100 : 0;
    marketingSpendData.push([
      channel.name,
      formatCurrency(forecast),
      formatCurrency(actual),
      formatCurrency(variance),
      `${variancePercent.toFixed(2)}%`
    ]);
  });

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(marketingSpendData);

  // Set reasonable column widths
  worksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Marketing Spend');
}

/**
 * Add the Attendance sheet to the workbook
 */
function addAttendanceSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Attendance sheet using dynamic data');
  const performanceData = productData.performanceData || {};
  const periodPerformance = (productData.performanceData?.periodPerformance as PerformancePeriodType[]) || []; // Use defined type

  const attendanceData = [
    ['Period', 'Forecast Attendance', 'Actual Attendance', 'Variance', 'Notes'] // Changed 'Week' to 'Period'
  ];

  if (periodPerformance.length > 0) {
      periodPerformance.forEach((period: PerformancePeriodType, index: number) => {
        const forecastAttendance = period.attendanceForecast || 0;
        const actualAttendance = period.attendanceActual || 0;
        const variance = actualAttendance - forecastAttendance;
        attendanceData.push([
          period.name || `Period ${index + 1}`, // Use period name if available
          forecastAttendance.toString(),
          actualAttendance.toString(),
          variance.toString(),
          period.notes || ''
        ]);
      });
  } else {
    // Optional: Add placeholder if no data exists
    attendanceData.push(['No attendance data available', '', '', '', '']);
  }

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(attendanceData);

  // Set column widths
  worksheet['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }];

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
}

/**
 * Add the Raw Data sheet to the workbook
 */
function addRawDataSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Raw Data sheet using dynamic data');

  const rawData: any[][] = [
    ['Date', 'Metric Name', 'Value', 'Data Type', 'Source', 'Project', 'Category']
  ];

  const exportDate = new Date();
  const dateStr = exportDate.toISOString().split('T')[0];
  const projectName = productData.projectName || 'Unknown Project';

  // Add summary metrics
  if (productData.summary) {
    const summary = productData.summary;
    const addMetric = (name: string, value: any, type: string, category: string) => {
      if (value != null) { // Add only if value exists
          rawData.push([dateStr, name, value, type, 'System-calculated', projectName, category]);
      }
    };

    addMetric('Total Forecast Revenue', summary.totalForecast, 'Forecast', 'Revenue');
    addMetric('Total Actual Revenue', summary.totalActual, 'Actual', 'Revenue');
    // Add profit metrics if they exist (using profitMetrics structure)
    if (productData.profitMetrics) {
        addMetric('Total Forecast Profit', productData.profitMetrics.forecastProfit, 'Forecast', 'Profit');
        addMetric('Total Actual Profit', productData.profitMetrics.actualProfit, 'Actual', 'Profit');
    }
    addMetric('Utilization Percentage', summary.percentUtilized, 'Calculated', 'Performance');
    addMetric('Marketing Forecast Spend', summary.marketingForecast, 'Forecast', 'Marketing');
    addMetric('Marketing Actual Spend', summary.marketingActual, 'Actual', 'Marketing');
  }

  // Add marketing channel data
  const marketingChannels = (productData.marketingChannels as ChannelLikeType[]) || []; // Use defined type
  marketingChannels.forEach((channel: ChannelLikeType) => { // Add type
      rawData.push([dateStr, `Marketing: ${channel.name} Forecast`, channel.forecast || channel.totalForecast || 0, 'Forecast', 'System-calculated', projectName, 'Marketing']);
      rawData.push([dateStr, `Marketing: ${channel.name} Actual`, channel.actual || channel.actualSpend || 0, 'Actual', 'User input', projectName, 'Marketing']);
      if (channel.conversions != null) rawData.push([dateStr, `Marketing: ${channel.name} Conversions`, channel.conversions, 'Actual', 'User input', projectName, 'Marketing']);
      if (channel.costPerResult != null) rawData.push([dateStr, `Marketing: ${channel.name} Cost Per Result`, channel.costPerResult, 'Calculated', 'System-calculated', projectName, 'Marketing']);
  });

  // Add period performance data
  const periodPerformance = (productData.performanceData?.periodPerformance as PerformancePeriodType[]) || []; // Use defined type
  periodPerformance.forEach((period: PerformancePeriodType) => { // Add type
       const periodName = period.name || 'Unknown Period';
       if (period.forecast != null) rawData.push([dateStr, `Period: ${periodName} Forecast Revenue`, period.forecast, 'Forecast', 'System-calculated', projectName, 'Period Performance']);
       if (period.actual != null) rawData.push([dateStr, `Period: ${periodName} Actual Revenue`, period.actual, 'Actual', 'User input', projectName, 'Period Performance']);
       if (period.attendanceForecast != null) rawData.push([dateStr, `Period: ${periodName} Forecast Attendance`, period.attendanceForecast, 'Forecast', 'System-calculated', projectName, 'Attendance']);
       if (period.attendanceActual != null) rawData.push([dateStr, `Period: ${periodName} Actual Attendance`, period.attendanceActual, 'Actual', 'User input', projectName, 'Attendance']);
  });

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rawData);

  // Set column widths
  worksheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 15 }];

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Data');
}

/**
 * Add the Forecast Table sheet to the workbook
 * Uses the new forecastTableData (same as UI) for detailed period-by-period export
 */
function addForecastTableSheet(workbook: XLSX.WorkBook, productData: ExportDataType, sheetName?: string): void {
  console.log('[Excel] Adding Forecast Table sheet using forecastTableData');
  const forecastTableData = productData.forecastTableData || [];
  if (!forecastTableData.length) {
    console.warn('[Excel] No forecastTableData found for export');
    return;
  }

  // Dynamically determine columns to show, matching ForecastDataTable logic
  const showTicket = forecastTableData.some((p: any) => typeof p.ticketRevenue === 'number');
  const showFB = forecastTableData.some((p: any) => typeof p.fbRevenue === 'number');
  const showMerch = forecastTableData.some((p: any) => typeof p.merchRevenue === 'number');
  const revenueKeys: { key: keyof typeof forecastTableData[0]; label: string }[] = [
    ...(showTicket ? [{ key: 'ticketRevenue', label: 'Ticket Sales' }] : []),
    ...(showFB ? [{ key: 'fbRevenue', label: 'F&B Sales' }] : []),
    ...(showMerch ? [{ key: 'merchRevenue', label: 'Merchandise Sales' }] : [])
  ];

  // Collect all unique cost keys with nonzero totals
  const allCostKeysRaw = Array.from(
    forecastTableData.reduce((acc: Set<string>, period: any) => {
      Object.keys(period.costBreakdown || {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  const costKeyTotals = Object.fromEntries(
    allCostKeysRaw.map(costKey => [costKey, forecastTableData.reduce((sum: number, period: any) => sum + (period.costBreakdown && typeof period.costBreakdown[costKey] === 'number' ? period.costBreakdown[costKey] : 0), 0)])
  );
  const allCostKeys = allCostKeysRaw.filter(costKey => costKeyTotals[costKey] !== 0);

  // Build header row
  const header = [
    'Period',
    'Attendance',
    ...revenueKeys.map(k => k.label),
    'Revenue',
    ...allCostKeys.map(k => k),
    'Total Cost',
    'Profit',
    'Cumulative Revenue',
    'Cumulative Cost',
    'Cumulative Profit'
  ];

  // Build data rows
  const rows = forecastTableData.map((period: any) => {
    const costBreakdown: Record<string, number> = period.costBreakdown && typeof period.costBreakdown === 'object' ? period.costBreakdown : {};
    return [
      period.point || `Period ${period.period}`,
      period.attendance ?? '',
      ...revenueKeys.map(k => period[k.key] ?? 0),
      period.revenue ?? 0,
      ...allCostKeys.map(k => costBreakdown[k] ?? 0),
      period.totalCost ?? period.cost ?? 0,
      period.profit ?? 0,
      period.cumulativeRevenue ?? 0,
      period.cumulativeCost ?? 0,
      period.cumulativeProfit ?? 0
    ];
  });

  // Add totals row
  const totals = {
    revenue: 0,
    profit: 0,
    totalCost: 0,
    costBreakdown: {} as Record<string, number>,
    revenueBreakdown: {} as Record<string, number>,
  };
  forecastTableData.forEach((period: any) => {
    const costBreakdown: Record<string, number> = period.costBreakdown && typeof period.costBreakdown === 'object' ? period.costBreakdown : {};
    totals.revenue += period.revenue || 0;
    totals.profit += period.profit || 0;
    totals.totalCost += period.totalCost || period.cost || 0;
    allCostKeys.forEach((costKey) => {
      totals.costBreakdown[costKey] = (totals.costBreakdown[costKey] || 0) + (costBreakdown[costKey] ?? 0);
    });
    revenueKeys.forEach(({ key }) => {
      const val = period[key] ?? 0;
      totals.revenueBreakdown[key as string] = (totals.revenueBreakdown[key as string] || 0) + (typeof val === 'number' ? val : 0);
    });
  });
  const totalsRow = [
    'TOTAL',
    '',
    ...revenueKeys.map(k => totals.revenueBreakdown[k.key as string] || 0),
    totals.revenue,
    ...allCostKeys.map(k => totals.costBreakdown[k] || 0),
    totals.totalCost,
    totals.profit,
    '', '', ''
  ];

  // Combine all rows
  const sheetData = [header, ...rows, totalsRow];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = header.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Forecast Table');
}

/**
 * Add the Scenario Comparison sheet to the workbook
 */
function addScenarioComparisonSheet(workbook: XLSX.WorkBook, scenarios: any[]): void {
  // Build the header row
  const header = [
    'Scenario Name',
    'Total Forecast Revenue',
    'Total Forecast Cost',
    'Total Forecast Profit',
    'Profit Margin',
    'Key Parameters'
  ];
  // Build rows for each scenario
  const rows = scenarios.map((scenario: any) => {
    const s = scenario.summary || {};
    // Serialize key parameters for readability
    let params = '';
    if (scenario.parameters) {
      try {
        params = Object.entries(scenario.parameters)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('; ');
      } catch (e) {
        params = JSON.stringify(scenario.parameters);
      }
    }
    return [
      scenario.name || '',
      s.totalForecast || '',
      s.totalForecastCost || '',
      s.totalForecastProfit || '',
      s.profitMargin !== undefined ? `${s.profitMargin.toFixed(1)}%` : '',
      params
    ];
  });
  const sheetData = [header, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!cols'] = header.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Scenario Comparison');
}
