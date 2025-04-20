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
    console.log(`[Excel] Generating Excel report: ${reportTitle} (Project ID: ${projectId ?? 'N/A'})`);
    console.log('[Excel] Data:', data);

    const workbook = XLSX.utils.book_new();

    // Determine project name for file naming (from project data or portfolio data)
    let projectNameForFile = 'Fortress_Report';
    if (projectId && data.projectName) { // Project export
      projectNameForFile = data.projectName;
    } else if (!projectId && data.title) { // Portfolio export might use title
      projectNameForFile = data.title.includes('Overview') ? 'Portfolio_Overview' : data.title;
    } else if (data.projectName) { // Fallback
      projectNameForFile = data.projectName;
    }

    const exportDate = new Date();
    const formattedDate = exportDate.toISOString().split('T')[0];
    const fileName = `${projectNameForFile.replace(/\s+/g, '')}_${reportTitle.replace(/\s+/g, '')}_${formattedDate}.xlsx`;

    // --- Conditionally add sheets based on export type ---

    if (!projectId) {
      // Portfolio Export: Add Portfolio Overview first
      console.log('[Excel] Adding Portfolio Overview sheet (Portfolio Export)');
      addPortfolioOverviewSheet(workbook, data); // Portfolio data is passed directly
    } else {
      // Project Export: Add project-specific sheets
      console.log(`[Excel] Adding sheets for project ID: ${projectId}`);

      // Ensure we have project data (it might be nested under 'Product Data')
      const projectData = data['Product Data'] || data;

      // Add project-specific sheets using the fetched projectData
      addSummarySheet(workbook, projectData);
      addAssumptionsSheet(workbook, projectData);
      addScenarioParametersSheet(workbook, projectData); // Might need adjustment if scenarios are project-specific
      addForecastVsActualSheet(workbook, projectData);
      addForecastTableSheet(workbook, projectData); // NEW: Add forecast table sheet (matches UI)
      addMarketingSpendSheet(workbook, projectData);
      addAttendanceSheet(workbook, projectData);
      addRawDataSheet(workbook, projectData); // Add raw data sheet for project
    }

    XLSX.writeFile(workbook, fileName);
    console.log('[Excel] Excel report generated:', fileName);
  } catch (error) {
    console.error('[Excel] Error generating Excel report:', error);
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
function addSummarySheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Summary sheet using dynamic data:', productData);

  const projectName = productData.projectName || 'Unknown Project';
  const productType = productData.productType || 'Unknown Type';
  const productTitle = productData.title || ''; // Might be report title
  const exportDate = new Date();

  const summary = productData.summary || {};
  const profitMetrics = productData.profitMetrics || {}; // Use profitMetrics if available
  const formattedSummary = productData.formattedSummary || {}; // Use formatted if available

  const totalForecastRevenue = summary.totalForecast || 0;
  const totalActualRevenue = summary.totalActual || 0;

  // Calculate profit dynamically
  const totalForecastProfit = profitMetrics.forecastProfit ?? (summary.totalForecastProfit || 0); // Prefer profitMetrics
  const totalActualProfit = profitMetrics.actualProfit ?? (summary.totalActualProfit || 0);
  const forecastProfitMargin = totalForecastRevenue > 0
    ? (totalForecastProfit / totalForecastRevenue) * 100
    : 0;

  const revenueVariance = totalActualRevenue - totalForecastRevenue;
  const revenueVariancePercent = totalForecastRevenue > 0
    ? (revenueVariance / totalForecastRevenue) * 100
    : 0;

  // Get breakeven point from data, fallback to 'N/A'
  const breakevenPoint = productData.breakevenPoint || 'N/A'; // Remove hardcoding

  // Get performance indicators from data, fallback to 'N/A'
  const growthRate = productData.growthRate != null ? `${productData.growthRate}%` : 'N/A';
  const healthScore = productData.healthScore ?? 'N/A';
  const riskLevel = productData.riskLevel || 'N/A';

  const summaryData = [
    ['FORTRESS MODELER - PROJECT SUMMARY', ''],
    [''],
    ['PROJECT INFORMATION', ''],
    ['Product Name', productTitle || projectName], // Use title if available, else project name
    ['Project Name', projectName],
    ['Export Date', exportDate.toLocaleDateString()],
    ['Product Type', productType],
    [''],
    ['FINANCIAL SUMMARY', ''],
    ['Total Forecast Revenue', formattedSummary.totalForecast || formatCurrency(totalForecastRevenue)],
    ['Total Forecast Profit', formattedSummary.totalForecastProfit || formatCurrency(totalForecastProfit)],
    ['Forecast Profit Margin', formattedSummary.forecastProfitMargin || `${forecastProfitMargin.toFixed(1)}%`],
    ['Actual Revenue (if available)', formattedSummary.totalActual || formatCurrency(totalActualRevenue)],
    ['Actual Profit (if available)', formattedSummary.totalActualProfit || formatCurrency(totalActualProfit)],
    ['Variance ($)', formattedSummary.revenueVariance || formatCurrency(revenueVariance)],
    ['Variance (%)', formattedSummary.revenueVariancePercent || `${revenueVariancePercent.toFixed(1)}%`],
    ['Breakeven Point', breakevenPoint],
    [''],
    ['PERFORMANCE INDICATORS', ''],
    ['Growth Rate', growthRate],
    ['Health Score', healthScore],
    ['Risk Level', riskLevel]
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  const columnWidths = [
    { wch: 25 },  // A
    { wch: 25 }   // B
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
}

/**
 * Add the Assumptions sheet to the workbook
 * (Now relies purely on input data, no hardcoding)
 */
function addAssumptionsSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Assumptions sheet using dynamic data');

  // Extract data for the assumptions sheet (should be project data)
  const model = productData.model || {};
  const assumptions = model.assumptions || {};
  const metadata = assumptions.metadata || {};
  const growth = metadata.growth || {};
  const perCustomer = metadata.perCustomer || {}; // Corrected: Was 'revenue'
  const costs = metadata.costs || {};
  const marketing = assumptions.marketing || {};

  // Default dynamic assumptions data build
  const assumptionsData = [
    ['FORTRESS MODELER - MODEL ASSUMPTIONS', ''],
    [''],
    ['GROWTH ASSUMPTIONS', ''],
    ['Growth Model', metadata.growthModelType || growth.type || 'N/A'], // Use metadata or growth obj
    ['Weekly Growth Rate', growth.rate != null ? formatPercent(growth.rate) : 'N/A'], // Use growth obj
    ['Initial Weekly Attendance', metadata.initialWeeklyAttendance?.toString() || 'N/A'],
    ['Weeks in Model', metadata.weeks?.toString() || 'N/A'],
    [''],
    ['REVENUE ASSUMPTIONS', ''],
    ['Ticket Price per Attendee', perCustomer.ticketPrice != null ? formatCurrency(perCustomer.ticketPrice) : 'N/A'],
    ['F&B Spend per Attendee', perCustomer.fbSpend != null ? formatCurrency(perCustomer.fbSpend) : 'N/A'],
    ['Merchandise Spend per Attendee', perCustomer.merchandiseSpend != null ? formatCurrency(perCustomer.merchandiseSpend) : 'N/A'], // Corrected name
    // Calculate total per attendee dynamically if possible
    // ['Total Revenue per Attendee', formatCurrency(...) ],
    [''],
    ['COST ASSUMPTIONS', ''],
    ['F&B COGS', costs.fbCOGSPercent != null ? formatPercent(costs.fbCOGSPercent) : 'N/A'], // Corrected name
    ['Merchandise COGS', costs.merchandiseCogsPercent != null ? formatPercent(costs.merchandiseCogsPercent) : 'N/A'], // Was already correct
    ['Staff Count', costs.staffCount?.toString() || 'N/A'],
    ['Staff Cost per Person', costs.staffCostPerPerson != null ? formatCurrency(costs.staffCostPerPerson) : 'N/A'],
    ['Management Fee', costs.managementFee != null ? formatCurrency(costs.managementFee) : 'N/A'],
    // Add other fixed costs if available in data model
    [''],
    ['MARKETING ASSUMPTIONS', ''],
    ['Weekly Marketing Budget', 
      marketing?.allocationMode === 'channels' 
        ? formatCurrency((marketing.channels || []).reduce((sum: number, ch: any) => sum + (ch.weeklyBudget || 0), 0))
        : 'N/A' // Weekly budget only relevant for channels mode in this context
    ],
    ['Total Marketing Budget', 
      marketing?.allocationMode === 'highLevel' 
        ? formatCurrency(marketing.totalBudget || 0) 
        : marketing?.allocationMode === 'channels'
        ? formatCurrency((marketing.channels || []).reduce((sum: number, ch: any) => sum + (ch.weeklyBudget || 0), 0) * (metadata?.weeks || 12))
        : '$0' // Default to $0 if mode is 'none' or unrecognized
    ]
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(assumptionsData);

  // Set column widths
  const columnWidths = [
    { wch: 30 },  // A
    { wch: 20 }   // B
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assumptions');
}

/**
 * Add the Scenario Parameters sheet to the workbook
 */
function addScenarioParametersSheet(workbook: XLSX.WorkBook, data: ExportDataType): void {
  console.log('[Excel] Adding Scenario Parameters sheet');

  // Extract scenario data if available
  const scenarioData = data['Scenario Data'] || {};
  const isScenario = !!scenarioData.isScenario;

  const scenarioParams: any[] = [];

  if (isScenario && scenarioData.parameters) {
    // Create header row
    scenarioParams.push(['Parameter Name', 'Original Value', 'Scenario Value', 'Delta %']);

    // Add each parameter
    Object.entries(scenarioData.parameters).forEach(([name, values]: [string, any]) => {
      const originalValue = values.original;
      const scenarioValue = values.scenario;
      const deltaPercent = originalValue !== 0
        ? ((scenarioValue - originalValue) / originalValue) * 100
        : 0;

      scenarioParams.push([
        name,
        originalValue,
        scenarioValue,
        `${deltaPercent.toFixed(2)}%`
      ]);
    });
  } else {
    // If not a scenario, just mark as baseline
    scenarioParams.push(['This is the Baseline Forecast']);
  }

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(scenarioParams);

  // Add the worksheet to the workbook
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
 */
function addMarketingSpendSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
  console.log('[Excel] Adding Marketing Spend sheet using dynamic data');
  const marketingChannels = (productData.marketingChannels as ChannelLikeType[]) || [];
  const channelPerformance = (productData.performanceData?.channelPerformance as ChannelLikeType[]) || [];
  const combinedChannels: ChannelLikeType[] = marketingChannels.length > 0 ? marketingChannels : channelPerformance;

  const marketingSpendData = [
    ['Channel Name', 'Forecast Spend', 'Actual Spend', 'Variance ($)', 'Variance (%)']
  ];

  // Add explicit type for channel parameter in forEach
  combinedChannels.forEach((channel: ChannelLikeType) => {
    const forecast = channel.forecast || channel.totalForecast || 0;
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
function addForecastTableSheet(workbook: XLSX.WorkBook, productData: ExportDataType): void {
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
    allCostKeysRaw.map(costKey => [costKey, forecastTableData.reduce((sum: number, period: any) => sum + (period.costBreakdown?.[costKey as keyof typeof period.costBreakdown] || 0), 0)])
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
  const rows = forecastTableData.map((period: any) => [
    period.point || `Period ${period.period}`,
    period.attendance ?? '',
    ...revenueKeys.map(k => period[k.key] ?? 0),
    period.revenue ?? 0,
    ...allCostKeys.map(k => period.costBreakdown?.[k] ?? 0),
    period.totalCost ?? period.cost ?? 0,
    period.profit ?? 0,
    period.cumulativeRevenue ?? 0,
    period.cumulativeCost ?? 0,
    period.cumulativeProfit ?? 0
  ]);

  // Add totals row
  const totals = {
    revenue: 0,
    profit: 0,
    totalCost: 0,
    costBreakdown: {} as Record<string, number>,
    revenueBreakdown: {} as Record<string, number>,
  };
  forecastTableData.forEach((period: any) => {
    totals.revenue += period.revenue || 0;
    totals.profit += period.profit || 0;
    totals.totalCost += period.totalCost || period.cost || 0;
    allCostKeys.forEach((costKey) => {
      totals.costBreakdown[costKey] = (totals.costBreakdown[costKey] || 0) + (period.costBreakdown?.[costKey as keyof typeof period.costBreakdown] || 0);
    });
    revenueKeys.forEach(({ key }) => {
      const val = period[key] ?? 0;
      totals.revenueBreakdown[key as string] = (totals.revenueBreakdown[key as string] || 0) + (val || 0);
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Forecast Table');
}
