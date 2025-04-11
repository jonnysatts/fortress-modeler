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
async function handlePdfExport(data: ExportDataType, reportKey: string) {
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
            text: reportKey,
            fontSize: 24,
            bold: true,
            color: '#1A2942',
            margin: [0, 10, 0, 20]
          },
          {
            text: `Generated: ${new Date().toLocaleString()}`,
            fontSize: 12,
            margin: [0, 0, 0, 20]
          },
          {
            text: 'No Data Available',
            fontSize: 16,
            bold: true,
            color: '#EF4444',
            margin: [0, 0, 0, 10]
          },
          {
            text: 'There is no data available for this report. Please make sure you have created and configured your products correctly.',
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

// Helper function to create PDF document definition
function createDocDefinition(data: ExportDataType, reportKey: string): any { // Return type any for flexibility with pdfmake
  console.log("Creating pdfmake doc definition for:", reportKey, data);

  // Base structure
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
        text: reportKey,
        style: 'title',
        margin: [0, 20, 0, 20]
      }
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

  // Add data content based on report type
  if (reportKey === 'Marketing Analysis') {
    if (data.summary) {
      docDefinition.content.push(
        { text: 'Executive Summary', style: 'subheader' },
        { // Corrected structure for columns
          columns: [
            {
              width: '33%',
              text: [
                { text: 'Total Forecast: ', bold: true },
                { text: data.formattedSummary?.totalForecast || '$0' }
              ]
            },
            {
              width: '33%',
              text: [
                { text: 'Total Actual: ', bold: true },
                { text: data.formattedSummary?.totalActual || '$0' }
              ]
            },
            {
              width: '33%',
              text: [
                { text: 'Utilization: ', bold: true },
                { text: data.formattedSummary?.percentUtilized || '0%' }
              ]
            }
          ],
          margin: [0, 10, 0, 20]
        }
      );
    }

    if (data.marketingChannels && Array.isArray(data.marketingChannels)) {
      docDefinition.content.push(
        { text: 'Marketing Channels', style: 'subheader', margin: [0, 10, 0, 10] },
        createMarketingChannelsTable(data.marketingChannels) // Assuming this returns valid pdfmake content
      );
    }

    if (data.performanceData && data.performanceData.channelPerformance) {
      docDefinition.content.push(
        // Use empty text element for pageBreak
        { text: '', pageBreak: 'before' },
        { text: 'Channel Performance', style: 'subheader', margin: [0, 20, 0, 10] },
        createPerformanceTable(data.performanceData.channelPerformance) // Assuming this returns valid pdfmake content
      );
    }

    if (data.performanceData && data.performanceData.periodPerformance) {
      docDefinition.content.push(
        { text: 'Period Performance', style: 'subheader', margin: [0, 20, 0, 10] },
        createPerformanceTable(data.performanceData.periodPerformance) // Assuming this returns valid pdfmake content
      );
    }
  } else if (reportKey === 'Full Export' || reportKey.endsWith('Export')) { // Handle Portfolio or Project Exports
    const reportData = (reportKey === 'Portfolio Export') ? data : { 'Project Data': data };

    let isFirstSection = true;
    for (const [sectionKey, sectionData] of Object.entries(reportData)) {
      if (sectionData && typeof sectionData === 'object' && Object.keys(sectionData).length > 0) {

        // Add page break before sections (except the first)
        if (!isFirstSection) {
           docDefinition.content.push({ text: '', pageBreak: 'before' });
        }

        docDefinition.content.push(
          {
            text: sectionKey, // Like 'Project Data' or 'Portfolio Overview'
            style: 'subheader', // Keep main sections as subheader
            margin: [0, 20, 0, 15]
          }
        );
        isFirstSection = false; // Subsequent sections will get a page break

        if (sectionData.projectName) {
          docDefinition.content.push({
            text: `Project: ${sectionData.projectName}`,
            margin: [0, 0, 0, 10]
          });
        }

        if (sectionData.summary) {
          docDefinition.content.push(
            { text: 'Executive Summary', style: 'subsubheader', margin: [0, 15, 0, 10] }
          );
          docDefinition.content.push({
            columns: [
              {
                width: '33%',
                text: [
                  { text: 'Total Forecast: ', bold: true },
                  { text: sectionData.formattedSummary?.totalForecast || `$${sectionData.summary.totalForecast?.toLocaleString() || '0'}` }
                ]
              },
              {
                width: '33%',
                text: [
                  { text: 'Total Actual: ', bold: true },
                  { text: sectionData.formattedSummary?.totalActual || `$${sectionData.summary.totalActual?.toLocaleString() || '0'}` }
                ]
              },
              {
                width: '33%',
                text: [
                  { text: 'Utilization: ', bold: true },
                  {
                    text: sectionData.formattedSummary?.percentUtilized || `${sectionData.summary.percentUtilized || '0'}%`,
                    color: sectionData.summary.percentUtilized >= 90 ? '#10B981' :
                           sectionData.summary.percentUtilized >= 75 ? '#FBBF24' : '#EF4444'
                  }
                ]
              }
            ],
            margin: [0, 5, 0, 15]
          });
        }

        // Check for projects array (Portfolio)
        if (sectionData.projects && Array.isArray(sectionData.projects)) {
           docDefinition.content.push(
             { text: 'Product Performance', style: 'subsubheader', margin: [0, 15, 0, 10] },
             createProjectsTable(sectionData.projects)
           );
           docDefinition.content.push(
             { text: 'Risk Distribution', style: 'subsubheader', margin: [0, 15, 0, 10] },
             createRiskDistributionTable(sectionData.riskDistribution)
           );
        }

        // Marketing Channels (Project)
        if (sectionData.marketingChannels && Array.isArray(sectionData.marketingChannels)) {
          docDefinition.content.push(
            { text: 'Marketing Channels', style: 'subsubheader', margin: [0, 15, 0, 10] },
            createMarketingChannelsTable(sectionData.marketingChannels)
          );
        }

        // Performance Data (Project)
        if (sectionData.performanceData) {
          if (sectionData.performanceData.channelPerformance && sectionData.performanceData.channelPerformance.length > 0) {
            docDefinition.content.push(
              { text: 'Channel Performance', style: 'subsubheader', margin: [0, 15, 0, 10] },
              createPerformanceTable(sectionData.performanceData.channelPerformance)
            );
          }
          if (sectionData.performanceData.periodPerformance && sectionData.performanceData.periodPerformance.length > 0) {
            docDefinition.content.push(
              { text: 'Period Performance', style: 'subsubheader', margin: [0, 15, 0, 10] },
              createPerformanceTable(sectionData.performanceData.periodPerformance)
            );
          }
        }
      }
    }
  } else {
    // Generic fallback
    docDefinition.content.push(
      { text: 'Report Data', style: 'subheader', margin: [0, 10, 0, 10] },
      { text: JSON.stringify(data, null, 2) }
    );
  }

  // Add footer
  docDefinition.content.push(
    { text: 'Generated by Fortress Modeler', style: 'footer', margin: [0, 30, 0, 0] }
  );

  return docDefinition;
}

// --- PDF Table Helper Functions ---

// Corrected return type for table helpers to 'any' for pdfmake compatibility
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
    let displayValue = formattedValue ? formattedValue.toString() : (value != null ? value.toString() : '');
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

function createMarketingChannelsTable(channels: any[]): any {
  if (!channels || channels.length === 0) {
    return { text: 'No marketing channel data available', italics: true, margin: [0, 5, 0, 15] };
  }
  const body = [
    ['Channel', 'Type', 'Forecast', 'Actual', 'Variance', 'Var %'].map(h => ({ text: h, style: 'tableHeader' }))
  ];
  channels.forEach(channel => {
    const variance = (channel.actual || 0) - (channel.forecast || 0);
    const variancePercent = (channel.forecast || 0) !== 0 ? (variance / channel.forecast) * 100 : 0;
    body.push([
      { text: channel.name, bold: true },
      { text: channel.type || '' },
      { text: `$${(channel.forecast || 0).toLocaleString()}`, alignment: 'right' },
      { text: `$${(channel.actual || 0).toLocaleString()}`, alignment: 'right' },
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
      widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'],
      body: body
    },
    layout: 'lightHorizontalLines',
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
