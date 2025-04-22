import { StateCreator } from 'zustand';
import { BaseState, createInitialBaseState, ExportDataType, ExportFormat, ExportFunctionMap } from '../types';
import { generateExcelReport } from '@/lib/excelExport';
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
        // Restore data fetch for project export
        reportData = await import('@/lib/dataExport').then(m => m.getProductExportData(projectId));
        reportKey = 'Project Export';
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
