import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Import store slices
import { ProjectState, createProjectSlice } from './modules/projectStore';
import { ModelState, createModelSlice } from './modules/modelStore';
import { ActualsState, createActualsSlice } from './modules/actualsStore';
import { ExportState, createExportSlice } from './modules/exportStore';
import { UIState, createUISlice } from './modules/uiStore';
import { ScenarioState, createScenarioSlice } from './modules/scenarioStore';

// Define the combined store type
export type StoreState = ProjectState & ModelState & ActualsState & ExportState & UIState & ScenarioState;

// Create the combined store
export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...a) => ({
        ...createProjectSlice(...a),
        ...createModelSlice(...a),
        ...createActualsSlice(...a),
        ...createExportSlice(...a),
        ...createUISlice(...a),
        ...createScenarioSlice(...a),
      }),
      {
        name: 'fortress-store',
        // Only persist UI state to avoid issues with large data
        partialize: (state) => ({
          isSidebarCollapsed: state.isSidebarCollapsed,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: 'Fortress Store' }
  )
);

export default useStore;
