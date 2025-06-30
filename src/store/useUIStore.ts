import { create } from 'zustand';
import { devLog } from '@/lib/devLog';

// UI-only state management - server state handled by React Query
interface UIState {
  // UI State
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  activeView: 'summary' | 'parameters' | 'scenarios' | 'charts';

  // UI Actions
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setIsCalculating: (isCalculating: boolean) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (isOpen: boolean) => void;
  setActiveView: (view: 'summary' | 'parameters' | 'scenarios' | 'charts') => void;
  
  // Client-side business logic
  recalculateForecast: () => Promise<void>;
  triggerFullExport: (format: 'pdf' | 'xlsx') => Promise<void>;
}

const useUIStore = create<UIState>((set, get) => ({
  // Initial State
  isLoading: false,
  isCalculating: false,
  error: null,
  isSidebarOpen: true,
  isCommandPaletteOpen: false,
  activeView: 'summary',

  // UI Actions
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setIsCalculating: (isCalculating) => set({ isCalculating }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setCommandPaletteOpen: (isOpen) => set({ isCommandPaletteOpen: isOpen }),
  setActiveView: (view) => set({ activeView: view }),

  // Client-side business logic
  recalculateForecast: async () => {
    const { setIsCalculating, setError } = get();
    setIsCalculating(true);
    try {
      devLog('🔄 Recalculating forecast...');
      // TODO: Implement forecast recalculation logic
      // This should work with React Query data, not store state
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
      devLog('✅ Forecast recalculation complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      setError(errorMessage);
      devLog('❌ Forecast recalculation failed:', errorMessage);
    } finally {
      setIsCalculating(false);
    }
  },

  triggerFullExport: async (format: 'pdf' | 'xlsx') => {
    const { setIsLoading, setError } = get();
    setIsLoading(true);
    try {
      devLog(`🔄 Starting ${format.toUpperCase()} export...`);
      // TODO: Implement export logic
      // This should work with React Query data, not store state
      await new Promise(resolve => setTimeout(resolve, 2000)); // Placeholder
      devLog(`✅ ${format.toUpperCase()} export complete`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setError(errorMessage);
      devLog(`❌ ${format.toUpperCase()} export failed:`, errorMessage);
    } finally {
      setIsLoading(false);
    }
  },
}));

export { useUIStore };