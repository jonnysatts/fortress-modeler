// Common types for the store modules

// Export data types
export type ExportDataType = Record<string, any>;

export type ExportFunctionMap = {
    [key: string]: () => ExportDataType | Promise<ExportDataType>;
};

export type ExportFormat = 'json' | 'pdf' | 'xlsx';

// Error handling types
export interface ErrorState {
  isError: boolean;
  message: string | null;
}

// Loading state type
export interface LoadingState {
  isLoading: boolean;
}

// Common state for all store slices
export interface BaseState {
  error: ErrorState;
  loading: LoadingState;
}

// Helper function to create initial base state
export const createInitialBaseState = (): BaseState => ({
  error: { isError: false, message: null },
  loading: { isLoading: false }
});
