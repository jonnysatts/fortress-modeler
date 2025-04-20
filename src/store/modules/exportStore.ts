import { StateCreator } from 'zustand';
import { BaseState, createInitialBaseState, ExportDataType, ExportFormat, ExportFunctionMap } from '../types';
import { generatePdfReport } from '@/lib/simplePdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import { getProductExportData } from '@/lib/dataExport';
import { getPortfolioExportData } from '@/lib/portfolioExport';

// Define the Export Store slice
export interface ExportState extends BaseState {
  // State
  exportFunctions: ExportFunctionMap;

  // Actions
  registerExportFunction: (key: string, fn: () => ExportDataType | Promise<ExportDataType>) => void;
  unregisterExportFunction: (key: string) => void;
  triggerExport: (reportKey: string, format: ExportFormat) => Promise<void>;
  triggerFullExport: (format: ExportFormat, projectId?: number | null) => Promise<void>;
}

// Create the export store slice
export const createExportSlice: StateCreator<ExportState> = (set, get) => ({
  // Initial state
  ...createInitialBaseState(),
  exportFunctions: {},

  // Actions
  registerExportFunction: (key: string, fn: () => ExportDataType | Promise<ExportDataType>) => {
    set(state => ({
      exportFunctions: {
        ...state.exportFunctions,
        [key]: fn
      }
    }));
    console.log(`[Store] Registering export function: ${key}`);
  },

  unregisterExportFunction: (key: string) => {
    set(state => {
      const newExportFunctions = { ...state.exportFunctions };
      delete newExportFunctions[key];
      return { exportFunctions: newExportFunctions };
    });
    console.log(`[Store] Unregistering export function: ${key}`);
  },

  triggerExport: async (reportKey: string, format: ExportFormat) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      console.log(`[Store] Triggering export for: ${reportKey} as ${format}`);

      const exportFn = get().exportFunctions[reportKey];
      if (!exportFn) {
        throw new Error(`Export function for ${reportKey} not found`);
      }

      // Get the data from the export function
      const data = await exportFn();
      console.log(`[Store] Data fetched for ${reportKey}:`, data);

      // Handle the export based on the format
      switch (format) {
        case 'pdf':
          await handlePdfExport(data, reportKey);
          break;
        case 'xlsx':
          await handleXlsxExport(data, reportKey, null);
          break;
        case 'json':
          handleJsonExport(data, reportKey);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error triggering export for ${reportKey}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to export ${reportKey}: ${error}` }
      }));
    }
  },

  triggerFullExport: async (format: ExportFormat, projectId?: number | null) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      let reportData: ExportDataType = {};
      let reportKey: string = "Export";

      if (projectId) {
        console.log(`[Store] Triggering export for project ID: ${projectId} as ${format}`);
        reportData = await getProductExportData(projectId);
        reportKey = reportData.projectName ? `${reportData.projectName} Export` : `Project_${projectId}_Export`;
        console.log(`[Store] Fetched data for project ${projectId}:`, reportData);
      } else {
        console.log(`[Store] Triggering portfolio export as ${format}`);
        reportData = await getPortfolioExportData();
        reportKey = 'Portfolio Export';
        console.log('[Store] Fetched portfolio data:', reportData);
      }

      if (!reportData || Object.keys(reportData).length === 0) {
         throw new Error('No data found for the export.');
      }

      switch (format) {
        case 'pdf':
          await handlePdfExport(reportData, reportKey);
          break;
        case 'xlsx':
          await handleXlsxExport(reportData, reportKey, projectId);
          break;
        case 'json':
          handleJsonExport(reportData, reportKey);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error triggering export:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to export: ${error}` }
      }));
    }
  }
});

// Helper functions for export handling
export async function handlePdfExport(data: ExportDataType, reportKey: string) {
  try {
    console.log(`[Store] PDF Export for ${reportKey} started with data:`, data);

    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      console.warn(`[Store] Warning: Empty data for ${reportKey} PDF export`);
      // Create a simple document with a warning message
      const warningDoc = {
        content: [
          {
            text: 'Fortress Modeler',
            fontSize: 10,
            color: '#666666',
            alignment: 'right'
          },
          {
            text: `No data available for ${reportKey}`,
            fontSize: 16,
            color: '#EF4444',
            bold: true,
            margin: [0, 40, 0, 0],
            alignment: 'center'
          },
          {
            text: 'Please check your project data and try again.',
            fontSize: 12,
            margin: [0, 0, 0, 20]
          }
        ]
      };
      await generatePdfReport(warningDoc, reportKey);
      return;
    }

    console.log(`[Store] Generating PDF for ${reportKey}...`);
    // Generate the document definition using the helper
    const docDefinition = createDocDefinition(data, reportKey);
    await generatePdfReport(docDefinition, reportKey);
    console.log(`[Store] PDF generation for ${reportKey} completed successfully`);
  } catch (error) {
    console.error(`[Store] Error generating PDF for ${reportKey}:`, error);
    throw error;
  }
}

async function handleXlsxExport(data: ExportDataType, reportKey: string, projectId?: number | null) {
  try {
    console.log(`[Store] XLSX Export started for ${reportKey} (Project ID: ${projectId ?? 'N/A'})`);
    console.log('[Store] XLSX Export Data:', data);

    await generateExcelReport(data, reportKey, projectId);
    console.log(`[Store] XLSX generation for ${reportKey} completed successfully`);
  } catch (error) {
    console.error('[Store] Error generating XLSX:', error);
    throw error;
  }
}

function handleJsonExport(data: ExportDataType, reportKey: string) {
  try {
    console.log('JSON Export Data:', data);

    const jsonString = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportKey.replace(/\\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating JSON:', error);
    throw error;
  }
}

// Helper function to create a PDF table from forecastTableData
function createForecastTable(forecastTableData: any[]): any {
  if (!forecastTableData || forecastTableData.length === 0) {
    return { text: 'No forecast data available', italics: true, margin: [0, 5, 0, 15] };
  }
  const body = [
    [
      { text: 'Period', style: 'tableHeader' },
      { text: 'Revenue', style: 'tableHeader' },
      { text: 'Cost', style: 'tableHeader' },
      { text: 'Profit', style: 'tableHeader' },
      { text: 'Attendance', style: 'tableHeader' }
    ]
  ];
  forecastTableData.forEach(row => {
    body.push([
      { text: row.point || row.period, alignment: 'left' },
      { text: `$${(row.revenue || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(row.cost || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(row.proft || 0).toLocaleString()}`, alignment: 'right', color: (row.proft || 0) >= 0 ? '#10B981' : '#EF4444' },
      { text: row.attendance != null ? row.attendance.toLocaleString() : '', alignment: 'right' }
    ]);
  });
  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      body: body
    },
    layout: 'lightHorizontalLines',
    margin: [0, 5, 0, 15]
  };
}

function createMarketingChannelsTable(marketingChannels: any[]): any {
  if (!marketingChannels || marketingChannels.length === 0) {
    return { text: 'No marketing channel data available', italics: true, margin: [0, 5, 0, 15] };
  }
  const body = [
    [
      { text: 'Channel', style: 'tableHeader' },
      { text: 'Type', style: 'tableHeader' },
      { text: 'Forecast', style: 'tableHeader' },
      { text: 'Actual', style: 'tableHeader' },
      { text: 'Variance', style: 'tableHeader' },
      { text: 'Variance %', style: 'tableHeader' }
    ]
  ];
  marketingChannels.forEach(row => {
    body.push([
      { text: row.name, alignment: 'left' },
      { text: row.type, alignment: 'left' },
      { text: `$${(row.forecast || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(row.actual || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(row.variance || 0).toLocaleString()}`, alignment: 'right', color: (row.variance || 0) >= 0 ? '#10B981' : '#EF4444' },
      { text: `${row.variancePercent != null ? row.variancePercent.toFixed(1) : '0'}%`, alignment: 'right', color: (row.variancePercent || 0) >= 0 ? '#10B981' : '#EF4444' }
    ]);
  });
  return {
    table: {
      headerRows: 1,
      widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'],
      body: body
    },
    layout: 'lightHorizontalLines',
    margin: [0, 5, 0, 15]
  };
}

function createDocDefinition(data: any, reportKey: string): any {
  // DEBUG: Log the summary values being rendered in the PDF
  console.log('[PDF DocDefinition] Summary values:', {
    totalRevenue: data.totalRevenue,
    totalCosts: data.totalCosts,
    totalProfit: data.totalProfit,
    profitMargin: data.profitMargin,
    breakEvenLabel: data.breakEvenLabel,
    breakEvenAchieved: data.breakEvenAchieved,
    averageMetrics: data.averageMetrics
  });

  // Professional header and summary
  const docDefinition: any = {
    content: [
      {
        columns: [
          {
            text: 'Fortress Modeler',
            style: 'header',
            margin: [0, 0, 0, 10]
          },
          {
            text: new Date().toLocaleDateString(),
            alignment: 'right',
            margin: [0, 10, 0, 0]
          }
        ]
      },
      {
        text: data.title || reportKey,
        style: 'title',
        margin: [0, 20, 0, 10]
      },
      {
        columns: [
          { text: `Project: ${data.projectName || ''}`, width: '50%' },
          { text: `Exported: ${(data.exportDate ? new Date(data.exportDate) : new Date()).toLocaleString()}`, alignment: 'right', width: '50%' }
        ],
        margin: [0, 0, 0, 10]
      },
      { text: 'Executive Summary', style: 'subheader', margin: [0, 10, 0, 5] },
      {
        columns: [
          {
            width: '33%',
            text: [
              { text: 'Total Revenue: ', bold: true },
              { text: (typeof data.totalRevenue === 'number') ? `$${data.totalRevenue.toLocaleString()}` : (data.totalRevenue || '$0') }
            ]
          },
          {
            width: '33%',
            text: [
              { text: 'Total Costs: ', bold: true },
              { text: (typeof data.totalCosts === 'number') ? `$${data.totalCosts.toLocaleString()}` : (data.totalCosts || '$0') }
            ]
          },
          {
            width: '33%',
            text: [
              { text: 'Total Profit: ', bold: true },
              { text: (typeof data.totalProfit === 'number') ? `$${data.totalProfit.toLocaleString()}` : (data.totalProfit || '$0'), color: (data.totalProfit || 0) >= 0 ? '#10B981' : '#EF4444' }
            ]
          }
        ],
        margin: [0, 0, 0, 10]
      },
      {
        columns: [
          {
            width: '33%',
            text: [
              { text: 'Profit Margin: ', bold: true },
              { text: (typeof data.profitMargin === 'number') ? `${data.profitMargin.toFixed(1)}%` : (data.profitMargin || '0%') }
            ]
          },
          {
            width: '33%',
            text: [
              { text: 'Breakeven Point: ', bold: true },
              { text: data.breakEvenLabel || 'N/A', color: data.breakEvenAchieved ? '#10B981' : '#EF4444' }
            ]
          },
          {
            width: '33%',
            text: [
              { text: 'Avg. Revenue: ', bold: true },
              { text: (data.averageMetrics && typeof data.averageMetrics.avgRevenue === 'number') ? `$${data.averageMetrics.avgRevenue.toLocaleString()}` : '$0' }
            ]
          }
        ],
        margin: [0, 0, 0, 10]
      },
      { text: 'Forecast by Period', style: 'subheader', margin: [0, 15, 0, 5] },
      createForecastTable(data.forecastTableData),
      { text: 'Marketing Channels', style: 'subheader', margin: [0, 15, 0, 5] },
      createMarketingChannelsTable(data.marketingChannels)
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#1A2942'
      },
      title: {
        fontSize: 24,
        bold: true,
        color: '#1A2942',
        alignment: 'center'
      },
      subheader: {
        fontSize: 14,
        bold: true,
        color: '#1A2942',
        margin: [0, 10, 0, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: '#1A2942'
      },
      footer: {
        fontSize: 10,
        color: '#666666',
        alignment: 'center',
        italics: true
      },
      subsubheader: {
        fontSize: 12,
        bold: true,
        color: '#1A2942',
        margin: [0, 5, 0, 3]
      }
    },
    defaultStyle: {
      fontSize: 10
    }
  };
  return docDefinition;
}

// --- PDF Table Helper Functions ---

function createProjectsTable(projects: any[]): any {
  if (!projects || projects.length === 0) {
    return { text: 'No project data available', italics: true, margin: [0, 5, 0, 15] };
  }
  const body = [
    ['Product', 'Type', 'Revenue', 'Profit', 'Margin', 'Health', 'Risk'].map(h => ({ text: h, style: 'tableHeader' }))
  ];
  projects.forEach(p => {
    body.push([
      { text: p.name, bold: true },
      { text: p.productType || '' },
      { text: `$${(p.totalRevenue || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(p.totalProfit || 0).toLocaleString()}`, alignment: 'right' },
      { text: `${(p.profitMargin || 0).toFixed(1)}%`, alignment: 'right' },
      { text: (p.healthScore || 0).toString(), alignment: 'center' },
      { text: p.riskLevel || 'medium', alignment: 'center' }
    ]);
  });
  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
      body: body
    },
    layout: 'lightHorizontalLines',
    margin: [0, 5, 0, 15]
  };
}

function createRiskDistributionTable(distribution: any): any {
   if (!distribution) {
      return { text: 'No risk data available', italics: true, margin: [0, 5, 0, 15] };
   }
   const body = [
      ['Risk Level', 'Count'].map(h => ({ text: h, style: 'tableHeader' })),
      ['Low', { text: (distribution.lowRisk || 0).toString(), alignment: 'right' }],
      ['Medium', { text: (distribution.mediumRisk || 0).toString(), alignment: 'right' }],
      ['High', { text: (distribution.highRisk || 0).toString(), alignment: 'right' }]
   ];
   return {
      table: {
         headerRows: 1,
         widths: ['*', 'auto'],
         body: body
      },
      layout: 'lightHorizontalLines',
      margin: [0, 5, 0, 15]
   };
}

function createSummaryTable(summary: any, formattedSummary?: any): any {
  if (!summary) {
    return { text: 'No summary data available', italics: true, margin: [0, 5, 0, 15] };
  }
  const keys = Object.keys(summary);
  const body = keys.map(key => {
    const value = summary[key];
    const formattedValue = formattedSummary && formattedSummary[key] ? formattedSummary[key] : value;
    const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    const displayValue = formattedValue ? formattedValue.toString() : (value != null ? value.toString() : '');
    return [{ text: displayKey, bold: true }, { text: displayValue, alignment: 'right' }];
  });
  return {
    table: {
      widths: ['*', 'auto'],
      body: body
    },
    layout: 'noBorders',
    margin: [0, 5, 0, 15]
  };
}

function createPerformanceTable(performanceData: any[]): any {
  if (!performanceData || performanceData.length === 0) {
    return { text: 'No performance data available', italics: true, margin: [0, 5, 0, 15] };
  }
  const body = [
    ['Name', 'Forecast', 'Actual', 'Variance', 'Var %'].map(h => ({ text: h, style: 'tableHeader' }))
  ];
  performanceData.forEach(item => {
    const variance = (item.actual || 0) - (item.forecast || 0);
    const variancePercent = (item.forecast || 0) !== 0 ? (variance / item.forecast) * 100 : 0;
    body.push([
      { text: item.name, bold: true },
      { text: `$${(item.forecast || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(item.actual || 0).toLocaleString()}`, alignment: 'right' },
      {
        text: `$${variance.toLocaleString()}`,
        alignment: 'right',
        color: variance >= 0 ? '#10B981' : '#EF4444'
      },
      {
        text: `${variancePercent.toFixed(1)}%`,
        alignment: 'right',
        color: variancePercent >= 0 ? '#10B981' : '#EF4444'
      }
    ]);
  });
  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      body: body
    },
    layout: 'lightHorizontalLines',
    margin: [0, 5, 0, 15]
  };
}

async function loadFontsFromCDN() {
  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap';

    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load fonts from CDN'));

    document.head.appendChild(link);
  });
}
