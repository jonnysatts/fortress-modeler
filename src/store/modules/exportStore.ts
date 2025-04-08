import { StateCreator } from 'zustand';
import { BaseState, createInitialBaseState, ExportDataType, ExportFormat, ExportFunctionMap } from '../types';
import { generatePdfReport } from '@/lib/simplePdfExport';
import { getProductExportData } from '@/lib/dataExport';

// Define the Export Store slice
export interface ExportState extends BaseState {
  // State
  exportFunctions: ExportFunctionMap;

  // Actions
  registerExportFunction: (key: string, fn: () => ExportDataType | Promise<ExportDataType>) => void;
  unregisterExportFunction: (key: string) => void;
  triggerExport: (reportKey: string, format: ExportFormat) => Promise<void>;
  triggerFullExport: (format: ExportFormat) => Promise<void>;
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
          await handleXlsxExport(data, reportKey);
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

  triggerFullExport: async (format: ExportFormat) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      console.log(`[Store] Triggering full export as ${format}`);

      // Get the current project ID
      const state = get();
      console.log('[Store] Current state:', state);

      const currentProject = state.currentProject;
      console.log('[Store] Current project from state:', currentProject);

      if (!currentProject) {
        console.error('[Store] No current project for full export');
        throw new Error('No current project selected');
      }

      console.log(`[Store] Getting data for project ${currentProject.id} (${currentProject.name})`);

      // Get real product data directly from the database
      const productData = await getProductExportData(currentProject.id);
      console.log('[Store] Got product data:', productData);

      // Collect data from all export functions as well
      const exportFunctions = get().exportFunctions;
      const allData: Record<string, ExportDataType> = {
        // Add the real product data first
        'Product Data': productData
      };

      console.log(`[Store] Found ${Object.keys(exportFunctions).length} export functions:`, Object.keys(exportFunctions));

      // Add data from other export functions
      for (const [key, fn] of Object.entries(exportFunctions)) {
        // Skip the 'Product Data' function since we already have real data
        if (key === 'Product Data') continue;

        console.log(`[Store] Collecting data for ${key}...`);
        try {
          const data = await fn();
          console.log(`[Store] Data collected for ${key}:`, data);
          allData[key] = data;
        } catch (error) {
          console.error(`[Store] Error collecting data for ${key}:`, error);
        }
      }

      console.log(`[Store] All data collected for full export:`, allData);

      // Handle the export based on the format
      switch (format) {
        case 'pdf':
          await handlePdfExport(allData, 'Full Export');
          break;
        case 'xlsx':
          await handleXlsxExport(allData, 'Full Export');
          break;
        case 'json':
          handleJsonExport(allData, 'Full Export');
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error triggering full export:`, error);
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

    // Check if data is empty
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

    // Use our simplified PDF export implementation
    console.log(`[Store] Generating PDF for ${reportKey}...`);
    await generatePdfReport(data, reportKey);
    console.log(`[Store] PDF generation for ${reportKey} completed successfully`);
  } catch (error) {
    console.error(`[Store] Error generating PDF for ${reportKey}:`, error);
    throw error;
  }
}

async function handleXlsxExport(data: ExportDataType, reportKey: string) {
  try {
    console.log('XLSX Export Data:', data);

    // Dynamically import xlsx to reduce initial bundle size
    const XLSX = await import('xlsx');

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, reportKey);

    // Generate and download XLSX
    XLSX.writeFile(workbook, `${reportKey.replace(/\s+/g, '_')}.xlsx`);
  } catch (error) {
    console.error('Error generating XLSX:', error);
    throw error;
  }
}

function handleJsonExport(data: ExportDataType, reportKey: string) {
  try {
    console.log('JSON Export Data:', data);

    // Convert data to JSON string
    const jsonString = JSON.stringify(data, null, 2);

    // Create blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportKey.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating JSON:', error);
    throw error;
  }
}

// Helper function to create PDF document definition
function createDocDefinition(data: ExportDataType, reportKey: string) {
  console.log("Creating pdfmake doc definition for:", reportKey, data);

  // Create a professional document definition
  const docDefinition = {
    content: [
      // Header with logo placeholder
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
      // Title
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
        color: '#1A2942' // Fortress Blue
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
    // Add executive summary
    if (data.summary) {
      docDefinition.content.push(
        { text: 'Executive Summary', style: 'subheader' },
        {
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

    // Add marketing channels table
    if (data.marketingChannels && Array.isArray(data.marketingChannels)) {
      docDefinition.content.push(
        { text: 'Marketing Channels', style: 'subheader', margin: [0, 10, 0, 10] },
        createMarketingChannelsTable(data.marketingChannels)
      );
    }

    // Add performance data
    if (data.performanceData && data.performanceData.channelPerformance) {
      docDefinition.content.push(
        { text: 'Channel Performance', style: 'subheader', margin: [0, 20, 0, 10], pageBreak: 'before' },
        createPerformanceTable(data.performanceData.channelPerformance)
      );
    }

    // Add period performance data
    if (data.performanceData && data.performanceData.periodPerformance) {
      docDefinition.content.push(
        { text: 'Period Performance', style: 'subheader', margin: [0, 20, 0, 10] },
        createPerformanceTable(data.performanceData.periodPerformance)
      );
    }
  } else if (reportKey === 'Full Export') {
    // Handle the full export with multiple sections
    // Each section represents a different report
    for (const [sectionKey, sectionData] of Object.entries(data)) {
      if (sectionData && typeof sectionData === 'object' && Object.keys(sectionData).length > 0) {
        // Add a section header with page break (except for the first section)
        docDefinition.content.push(
          {
            text: sectionKey,
            style: 'subheader',
            fontSize: 18,
            color: '#1A2942',
            margin: [0, 20, 0, 15],
            pageBreak: docDefinition.content.length > 2 ? 'before' : undefined
          }
        );

        // Add project name and date if available
        if (sectionData.projectName) {
          docDefinition.content.push({
            text: `Project: ${sectionData.projectName}`,
            fontSize: 12,
            margin: [0, 0, 0, 10]
          });
        }

        // Add executive summary section
        if (sectionData.summary) {
          docDefinition.content.push(
            { text: 'Executive Summary', style: 'subsubheader', margin: [0, 15, 0, 10] }
          );

          // Create a summary row with key metrics
          docDefinition.content.push({
            columns: [
              {
                width: '33%',
                text: [
                  { text: 'Total Forecast: ', bold: true },
                  { text: sectionData.formattedSummary?.totalForecast || `$${sectionData.summary.totalForecast.toLocaleString()}` }
                ]
              },
              {
                width: '33%',
                text: [
                  { text: 'Total Actual: ', bold: true },
                  { text: sectionData.formattedSummary?.totalActual || `$${sectionData.summary.totalActual.toLocaleString()}` }
                ]
              },
              {
                width: '33%',
                text: [
                  { text: 'Utilization: ', bold: true },
                  {
                    text: sectionData.formattedSummary?.percentUtilized || `${sectionData.summary.percentUtilized}%`,
                    color: sectionData.summary.percentUtilized >= 90 ? '#10B981' :
                           sectionData.summary.percentUtilized >= 75 ? '#FBBF24' : '#EF4444'
                  }
                ]
              }
            ],
            margin: [0, 5, 0, 15]
          });
        }

        // Add marketing channels if available
        if (sectionData.marketingChannels && Array.isArray(sectionData.marketingChannels)) {
          docDefinition.content.push(
            { text: 'Marketing Channels', style: 'subsubheader', margin: [0, 15, 0, 10] }
          );

          // Create a table for marketing channels
          const channelTableBody = [
            // Header row
            [
              { text: 'Channel', style: 'tableHeader' },
              { text: 'Type', style: 'tableHeader' },
              { text: 'Forecast', style: 'tableHeader', alignment: 'right' },
              { text: 'Actual', style: 'tableHeader', alignment: 'right' },
              { text: 'Variance', style: 'tableHeader', alignment: 'right' }
            ]
          ];

          // Add data rows
          sectionData.marketingChannels.forEach(channel => {
            channelTableBody.push([
              { text: channel.name, bold: true },
              { text: channel.type },
              { text: `$${channel.forecast.toLocaleString()}`, alignment: 'right' },
              { text: `$${channel.actual.toLocaleString()}`, alignment: 'right' },
              {
                text: `$${channel.variance.toLocaleString()}`,
                alignment: 'right',
                color: channel.variance >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
              }
            ]);
          });

          docDefinition.content.push({
            table: {
              headerRows: 1,
              widths: ['*', '*', 'auto', 'auto', 'auto'],
              body: channelTableBody
            },
            layout: {
              fillColor: function(rowIndex) {
                return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
              }
            },
            margin: [0, 0, 0, 15]
          });
        }

        // Add performance data if available
        if (sectionData.performanceData) {
          // Add channel performance
          if (sectionData.performanceData.channelPerformance && sectionData.performanceData.channelPerformance.length > 0) {
            docDefinition.content.push(
              { text: 'Channel Performance', style: 'subsubheader', margin: [0, 15, 0, 10] }
            );

            // Create a table for channel performance
            const channelPerfTableBody = [
              // Header row
              [
                { text: 'Channel', style: 'tableHeader' },
                { text: 'Forecast', style: 'tableHeader', alignment: 'right' },
                { text: 'Actual', style: 'tableHeader', alignment: 'right' },
                { text: 'Variance', style: 'tableHeader', alignment: 'right' },
                { text: 'Variance %', style: 'tableHeader', alignment: 'right' }
              ]
            ];

            // Add data rows
            sectionData.performanceData.channelPerformance.forEach(item => {
              const variancePercent = item.forecast > 0 ? (item.variance / item.forecast) * 100 : 0;

              channelPerfTableBody.push([
                { text: item.name, bold: true },
                { text: `$${item.forecast.toLocaleString()}`, alignment: 'right' },
                { text: `$${item.actual.toLocaleString()}`, alignment: 'right' },
                {
                  text: `$${item.variance.toLocaleString()}`,
                  alignment: 'right',
                  color: item.variance >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                },
                {
                  text: `${variancePercent.toFixed(1)}%`,
                  alignment: 'right',
                  color: variancePercent >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                }
              ]);
            });

            docDefinition.content.push({
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                body: channelPerfTableBody
              },
              layout: {
                fillColor: function(rowIndex) {
                  return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
                }
              },
              margin: [0, 0, 0, 15]
            });
          }

          // Add period performance
          if (sectionData.performanceData.periodPerformance && sectionData.performanceData.periodPerformance.length > 0) {
            docDefinition.content.push(
              { text: 'Period Performance', style: 'subsubheader', margin: [0, 15, 0, 10] }
            );

            // Create a table for period performance
            const periodPerfTableBody = [
              // Header row
              [
                { text: 'Period', style: 'tableHeader' },
                { text: 'Forecast', style: 'tableHeader', alignment: 'right' },
                { text: 'Actual', style: 'tableHeader', alignment: 'right' },
                { text: 'Variance', style: 'tableHeader', alignment: 'right' },
                { text: 'Variance %', style: 'tableHeader', alignment: 'right' }
              ]
            ];

            // Add data rows
            sectionData.performanceData.periodPerformance.forEach(item => {
              const variancePercent = item.forecast > 0 ? (item.variance / item.forecast) * 100 : 0;

              periodPerfTableBody.push([
                { text: item.name, bold: true },
                { text: `$${item.forecast.toLocaleString()}`, alignment: 'right' },
                { text: `$${item.actual.toLocaleString()}`, alignment: 'right' },
                {
                  text: `$${item.variance.toLocaleString()}`,
                  alignment: 'right',
                  color: item.variance >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                },
                {
                  text: `${variancePercent.toFixed(1)}%`,
                  alignment: 'right',
                  color: variancePercent >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                }
              ]);
            });

            docDefinition.content.push({
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                body: periodPerfTableBody
              },
              layout: {
                fillColor: function(rowIndex) {
                  return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
                }
              },
              margin: [0, 0, 0, 15]
            });
          }
        }
      }
    }
  } else {
    // Generic data display for other report types
    docDefinition.content.push(
      { text: 'Report Data', style: 'subheader', margin: [0, 10, 0, 10] },
      { text: JSON.stringify(data, null, 2), fontSize: 10 }
    );
  }

  // Add footer
  docDefinition.content.push(
    { text: 'Generated by Fortress Modeler', style: 'footer', margin: [0, 30, 0, 0] }
  );

  return docDefinition;
}



// Helper function to create a summary table
function createSummaryTable(summary: any, formattedSummary?: any) {
  if (!summary) {
    return { text: 'No summary data available', italics: true };
  }

  // Get the keys from the summary object
  const keys = Object.keys(summary);

  // Create table body
  const body = [];

  // Add data rows
  keys.forEach(key => {
    const value = summary[key];
    const formattedValue = formattedSummary && formattedSummary[key] ? formattedSummary[key] : value;

    // Format the key for display
    const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');

    // Format the value based on its type
    let displayValue;
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('percent')) {
        displayValue = `${value.toFixed(2)}%`;
      } else {
        displayValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    } else {
      displayValue = formattedValue ? formattedValue.toString() : (value ? value.toString() : '');
    }

    body.push([{ text: displayKey, bold: true }, { text: displayValue, alignment: 'right' }]);
  });

  return {
    table: {
      widths: ['*', 'auto'],
      body: body
    },
    layout: {
      fillColor: function(rowIndex: number) {
        return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
      },
      hLineWidth: function() { return 0; },
      vLineWidth: function() { return 0; }
    },
    margin: [0, 5, 0, 15]
  };
}

// Helper function to create a table for marketing channels
function createMarketingChannelsTable(channels: any[]) {
  if (!channels || channels.length === 0) {
    return { text: 'No marketing channels data available', italics: true };
  }

  // Create table headers based on the first channel's properties
  const firstChannel = channels[0];
  const headers = Object.keys(firstChannel).filter(key =>
    typeof firstChannel[key] !== 'object' && key !== 'id'
  );

  // Create table body
  const body = [
    // Header row
    headers.map(header => ({
      text: header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
      style: 'tableHeader'
    }))
  ];

  // Add data rows
  channels.forEach(channel => {
    const row = headers.map(key => {
      const value = channel[key];
      // Format numbers and currency values
      if (typeof value === 'number') {
        if (key.toLowerCase().includes('budget') || key.toLowerCase().includes('cost')) {
          return { text: `$${value.toFixed(2)}` };
        }
        return { text: value.toString() };
      }
      return { text: value ? value.toString() : '' };
    });
    body.push(row);
  });

  return {
    table: {
      headerRows: 1,
      widths: Array(headers.length).fill('*'),
      body: body
    },
    layout: {
      fillColor: function(rowIndex: number) {
        return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
      }
    },
    margin: [0, 5, 0, 15]
  };
}

// Helper function to create a performance data table
function createPerformanceTable(performanceData: any[]) {
  if (!performanceData || performanceData.length === 0) {
    return { text: 'No performance data available', italics: true };
  }

  // Define the columns we want to show
  const columns = ['name', 'forecast', 'actual', 'variance'];
  const columnTitles = {
    name: 'Name',
    forecast: 'Forecast',
    actual: 'Actual',
    variance: 'Variance'
  };

  // Create table body
  const body = [
    // Header row
    columns.map(col => ({ text: columnTitles[col as keyof typeof columnTitles], style: 'tableHeader' }))
  ];

  // Add data rows
  performanceData.forEach(item => {
    const row = columns.map(col => {
      const key = col as keyof typeof item;
      const value = item[key];

      // Format based on column type
      if (col === 'name') {
        return { text: value ? value.toString() : '', bold: true };
      } else if (typeof value === 'number') {
        // Format currency values
        const formattedValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Color variances based on positive/negative
        if (col === 'variance') {
          return {
            text: formattedValue,
            alignment: 'right',
            color: value >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
          };
        }

        return { text: formattedValue, alignment: 'right' };
      }

      return { text: value ? value.toString() : '', alignment: 'right' };
    });

    body.push(row);
  });

  return {
    table: {
      headerRows: 1,
      widths: ['*', 'auto', 'auto', 'auto'],
      body: body
    },
    layout: {
      fillColor: function(rowIndex: number) {
        return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
      }
    },
    margin: [0, 5, 0, 15]
  };
}

// Helper function to load fonts from CDN
async function loadFontsFromCDN() {
  return new Promise<void>((resolve, reject) => {
    // Load Roboto fonts from Google Fonts
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap';

    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load fonts from CDN'));

    document.head.appendChild(link);
  });
}
