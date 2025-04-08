import { StateCreator } from 'zustand';
import { BaseState, createInitialBaseState, ExportDataType, ExportFormat, ExportFunctionMap } from '../types';

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
      
      // Collect data from all export functions
      const exportFunctions = get().exportFunctions;
      const allData: Record<string, ExportDataType> = {};
      
      for (const [key, fn] of Object.entries(exportFunctions)) {
        allData[key] = await fn();
      }
      
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
    console.log('PDF Export Data:', data);
    
    // Dynamically import pdfmake to reduce initial bundle size
    const pdfMake = await import('pdfmake/build/pdfmake');
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    
    console.log('pdfMake object:', pdfMake);
    console.log('pdfFontsModule object:', pdfFonts);
    
    // Set virtual file system for fonts
    if (pdfMake.default) {
      pdfMake.default.vfs = pdfFonts.pdfMake.vfs;
    } else {
      console.log('VFS fonts not loaded, attempting to load fonts directly');
      
      // Try to load fonts from CDN
      try {
        await loadFontsFromCDN();
        console.log('Fonts loaded from CDN');
      } catch (fontError) {
        console.error('Error loading fonts from CDN:', fontError);
      }
    }
    
    // Create document definition
    const docDefinition = createDocDefinition(data, reportKey);
    
    // Generate and download PDF
    if (pdfMake.default) {
      console.log('[Store] pdfmake PDF download triggered.');
      pdfMake.default.createPdf(docDefinition).download(`${reportKey.replace(/\s+/g, '_')}.pdf`);
    } else {
      console.error('pdfMake not properly initialized');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
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
  
  // This is a simplified version - we'll implement a more robust version later
  return {
    content: [
      {
        text: reportKey,
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 20]
      },
      {
        text: `Generated: ${new Date().toLocaleString()}`,
        fontSize: 12,
        margin: [0, 0, 0, 20]
      },
      {
        text: 'Data:',
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      {
        text: JSON.stringify(data, null, 2),
        fontSize: 10
      }
    ]
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
