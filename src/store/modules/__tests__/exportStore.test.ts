import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createExportSlice } from '../exportStore';
import { ExportDataType } from '@/store/types';
import { AppError, ErrorCode } from '@/lib/errorHandling';

// Mock pdfmake
vi.mock('pdfmake/build/pdfmake', () => {
  return {
    default: {
      createPdf: vi.fn().mockReturnValue({
        download: vi.fn()
      }),
      vfs: {}
    }
  };
});

// Mock pdfFonts
vi.mock('pdfmake/build/vfs_fonts', () => {
  return {
    pdfMake: {
      vfs: {}
    }
  };
});

// Mock xlsx
vi.mock('xlsx', () => {
  return {
    utils: {
      json_to_sheet: vi.fn(),
      book_new: vi.fn(),
      book_append_sheet: vi.fn()
    },
    writeFile: vi.fn()
  };
});

// Mock error handling
vi.mock('@/lib/errorHandling', () => {
  return {
    AppError: class AppError extends Error {
      code: string;
      details?: Record<string, any>;
      constructor(message: string, code: string, details?: Record<string, any>) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
      }
    },
    ErrorCode: {
      DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
      DB_QUERY_ERROR: 'DB_QUERY_ERROR',
      DB_TRANSACTION_ERROR: 'DB_TRANSACTION_ERROR',
      INVALID_DATA: 'INVALID_DATA',
      MISSING_DATA: 'MISSING_DATA',
      DATA_NOT_FOUND: 'DATA_NOT_FOUND',
      EXPORT_ERROR: 'EXPORT_ERROR',
      PDF_GENERATION_ERROR: 'PDF_GENERATION_ERROR',
      CALCULATION_ERROR: 'CALCULATION_ERROR',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR',
      NETWORK_ERROR: 'NETWORK_ERROR',
      TIMEOUT_ERROR: 'TIMEOUT_ERROR'
    },
    handleError: vi.fn((error) => ({ message: error.message || 'Error', code: error.code || 'UNKNOWN_ERROR' })),
    logErrorToMonitoring: vi.fn()
  };
});

// Mock URL and document
global.URL = {
  createObjectURL: vi.fn(() => 'blob:url'),
  revokeObjectURL: vi.fn()
} as any;

global.document = {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn(),
    appendChild: vi.fn()
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
} as any;

describe('exportStore', () => {
  // Create mock set and get functions for the store
  const set = vi.fn();
  const get = vi.fn();
  let store: ReturnType<typeof createExportSlice>;
  
  // Sample export data
  const sampleExportData: ExportDataType = {
    title: 'Test Export',
    data: [{ id: 1, name: 'Test' }]
  };
  
  // Sample export function
  const sampleExportFunction = vi.fn().mockResolvedValue(sampleExportData);
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a fresh store for each test
    store = createExportSlice(set, get);
    
    // Setup default get return value
    get.mockReturnValue({
      exportFunctions: {
        'Test Export': sampleExportFunction
      }
    });
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('registerExportFunction', () => {
    it('should register an export function', () => {
      // Call the function
      store.registerExportFunction('New Export', sampleExportFunction);
      
      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set
      const setFn = set.mock.calls[0][0];
      const newState = setFn({
        exportFunctions: {}
      });
      
      // Check the new state
      expect(newState.exportFunctions).toEqual({
        'New Export': sampleExportFunction
      });
    });
  });
  
  describe('unregisterExportFunction', () => {
    it('should unregister an export function', () => {
      // Call the function
      store.unregisterExportFunction('Test Export');
      
      // Check that set was called with the correct state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set
      const setFn = set.mock.calls[0][0];
      const newState = setFn({
        exportFunctions: {
          'Test Export': sampleExportFunction,
          'Other Export': vi.fn()
        }
      });
      
      // Check the new state
      expect(newState.exportFunctions).toEqual({
        'Other Export': expect.any(Function)
      });
    });
  });
  
  describe('triggerExport', () => {
    it('should trigger a PDF export', async () => {
      // Call the function
      await store.triggerExport('Test Export', 'pdf');
      
      // Check that the export function was called
      expect(sampleExportFunction).toHaveBeenCalled();
      
      // Check that set was called with the correct loading state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set for loading state
      const loadingSetFn = set.mock.calls[0][0];
      const loadingState = loadingSetFn({});
      
      // Check the loading state
      expect(loadingState).toEqual({
        loading: { isLoading: true }
      });
      
      // Get the function passed to set for success state
      const successSetFn = set.mock.calls[1][0];
      const successState = successSetFn({});
      
      // Check the success state
      expect(successState).toEqual({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      });
    });
    
    it('should handle errors when export function fails', async () => {
      // Mock the export function to throw an error
      const error = new Error('Export error');
      get.mockReturnValue({
        exportFunctions: {
          'Test Export': vi.fn().mockRejectedValue(error)
        }
      });
      
      // Call the function
      await store.triggerExport('Test Export', 'pdf');
      
      // Check that set was called with the correct error state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set for error state
      const errorSetFn = set.mock.calls[1][0];
      const errorState = errorSetFn({});
      
      // Check the error state
      expect(errorState).toEqual({
        loading: { isLoading: false },
        error: { isError: true, message: expect.any(String) }
      });
    });
    
    it('should handle missing export function', async () => {
      // Call the function with a non-existent export key
      await store.triggerExport('Non-existent Export', 'pdf');
      
      // Check that set was called with the correct error state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set for error state
      const errorSetFn = set.mock.calls[1][0];
      const errorState = errorSetFn({});
      
      // Check the error state
      expect(errorState).toEqual({
        loading: { isLoading: false },
        error: { isError: true, message: expect.stringContaining('not found') }
      });
    });
  });
  
  describe('triggerFullExport', () => {
    it('should trigger a full export with all export functions', async () => {
      // Mock multiple export functions
      get.mockReturnValue({
        exportFunctions: {
          'Export 1': vi.fn().mockResolvedValue({ data: 'Export 1 data' }),
          'Export 2': vi.fn().mockResolvedValue({ data: 'Export 2 data' })
        }
      });
      
      // Call the function
      await store.triggerFullExport('pdf');
      
      // Check that set was called with the correct loading state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set for loading state
      const loadingSetFn = set.mock.calls[0][0];
      const loadingState = loadingSetFn({});
      
      // Check the loading state
      expect(loadingState).toEqual({
        loading: { isLoading: true }
      });
      
      // Get the function passed to set for success state
      const successSetFn = set.mock.calls[1][0];
      const successState = successSetFn({});
      
      // Check the success state
      expect(successState).toEqual({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      });
    });
    
    it('should handle errors during full export', async () => {
      // Mock one export function to throw an error
      get.mockReturnValue({
        exportFunctions: {
          'Export 1': vi.fn().mockResolvedValue({ data: 'Export 1 data' }),
          'Export 2': vi.fn().mockRejectedValue(new Error('Export 2 error'))
        }
      });
      
      // Call the function
      await store.triggerFullExport('pdf');
      
      // Check that set was called with the correct error state
      expect(set).toHaveBeenCalledWith(expect.any(Function));
      
      // Get the function passed to set for error state
      const errorSetFn = set.mock.calls[1][0];
      const errorState = errorSetFn({});
      
      // Check the error state
      expect(errorState).toEqual({
        loading: { isLoading: false },
        error: { isError: true, message: expect.any(String) }
      });
    });
  });
});
