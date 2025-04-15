/**
 * Scenario Store Slice
 * 
 * This module contains the Zustand store slice for scenario management.
 */

import { StateCreator } from 'zustand';
import { FinancialModel } from '@/lib/db';
import { ForecastPeriodData, generateForecastTimeSeries } from '@/lib/financialCalculations';
import { toast } from '@/components/ui/use-toast';

import { 
  Scenario, 
  ScenarioParameterDeltas, 
  ScenarioState,
  CreateScenarioInput,
  UpdateScenarioInput
} from '../types/scenarioTypes';

import { 
  getScenarios, 
  getScenarioById, 
  createScenario as apiCreateScenario,
  updateScenario as apiUpdateScenario,
  deleteScenario as apiDeleteScenario,
  duplicateScenario as apiDuplicateScenario
} from '../api/scenarioApi';

import { applyScenarioDeltas } from '../utils/deltaCalculations';

/**
 * Create Scenario Store Slice
 * Factory function to create the scenario store slice
 */
export const createScenarioSlice: StateCreator<ScenarioState> = (set, get) => ({
  // Initial state
  scenarios: [],
  currentScenario: null,
  baselineModel: null,
  scenarioForecastData: [],
  baselineForecastData: [],
  isComparisonMode: false,
  lastUpdated: Date.now(),
  scenariosLoading: false,
  scenarioSaving: false,

  /**
   * Load scenarios for a project
   */
  loadScenarios: async (projectId: number) => {
    try {
      set({ scenariosLoading: true });
      const scenarios = await getScenarios(projectId);
      set({ scenarios, scenariosLoading: false });
      return scenarios;
    } catch (error) {
      console.error('Error loading scenarios:', error);
      set({ scenariosLoading: false });
      toast({
        title: 'Error',
        description: 'Failed to load scenarios',
        variant: 'destructive',
      });
      return [];
    }
  },

  /**
   * Create a new scenario
   */
  createScenario: async (projectId: number, baseModelId: number, name: string, description?: string) => {
    try {
      set({ scenarioSaving: true });
      
      const scenarioData: CreateScenarioInput = {
        projectId,
        baseModelId,
        name,
        description
      };
      
      const newScenario = await apiCreateScenario(scenarioData);
      
      // Update the scenarios list
      set(state => ({
        scenarios: [...state.scenarios, newScenario],
        scenarioSaving: false
      }));
      
      return newScenario;
    } catch (error) {
      console.error('Error creating scenario:', error);
      set({ scenarioSaving: false });
      toast({
        title: 'Error',
        description: 'Failed to create scenario',
        variant: 'destructive',
      });
      throw error;
    }
  },

  /**
   * Update an existing scenario
   */
  updateScenario: async (scenario: Scenario) => {
    try {
      set({ scenarioSaving: true });
      
      if (!scenario.id) {
        throw new Error('Scenario ID is required for update');
      }
      
      const updateData: UpdateScenarioInput = {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        parameterDeltas: scenario.parameterDeltas
      };
      
      const updatedScenario = await apiUpdateScenario(updateData);
      
      // Update the scenarios list and current scenario if needed
      set(state => {
        const updatedScenarios = state.scenarios.map(s => 
          s.id === updatedScenario.id ? updatedScenario : s
        );
        
        return {
          scenarios: updatedScenarios,
          currentScenario: state.currentScenario?.id === updatedScenario.id 
            ? updatedScenario 
            : state.currentScenario,
          scenarioSaving: false
        };
      });
      
      return updatedScenario;
    } catch (error) {
      console.error('Error updating scenario:', error);
      set({ scenarioSaving: false });
      toast({
        title: 'Error',
        description: 'Failed to update scenario',
        variant: 'destructive',
      });
      throw error;
    }
  },

  /**
   * Delete a scenario
   */
  deleteScenario: async (scenarioId: number) => {
    try {
      await apiDeleteScenario(scenarioId);
      
      // Update the scenarios list and clear current scenario if needed
      set(state => {
        const updatedScenarios = state.scenarios.filter(s => s.id !== scenarioId);
        const updatedCurrentScenario = state.currentScenario?.id === scenarioId 
          ? null 
          : state.currentScenario;
        
        return {
          scenarios: updatedScenarios,
          currentScenario: updatedCurrentScenario
        };
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete scenario',
        variant: 'destructive',
      });
      throw error;
    }
  },

  /**
   * Duplicate a scenario
   */
  duplicateScenario: async (scenarioId: number, newName: string) => {
    try {
      set({ scenarioSaving: true });
      
      const duplicatedScenario = await apiDuplicateScenario(scenarioId, newName);
      
      // Update the scenarios list
      set(state => ({
        scenarios: [...state.scenarios, duplicatedScenario],
        scenarioSaving: false
      }));
      
      return duplicatedScenario;
    } catch (error) {
      console.error('Error duplicating scenario:', error);
      set({ scenarioSaving: false });
      toast({
        title: 'Error',
        description: 'Failed to duplicate scenario',
        variant: 'destructive',
      });
      throw error;
    }
  },

  /**
   * Set the current scenario
   */
  setCurrentScenario: (scenario: Scenario | null) => {
    set({ currentScenario: scenario });

    // Calculate forecast if we have a baseline model
    if (scenario && get().baselineModel) {
      get().calculateScenarioForecast();
    }
  },

  /**
   * Set the baseline model
   */
  setBaselineModel: (model: FinancialModel | null) => {
    set({ baselineModel: model });

    // Calculate baseline forecast
    if (model) {
      const baselineForecastData = generateForecastTimeSeries(model);
      set({ baselineForecastData });

      // Calculate scenario forecast if we have a current scenario
      if (get().currentScenario) {
        get().calculateScenarioForecast();
      }
    }
  },

  /**
   * Update scenario parameter deltas
   */
  updateScenarioDeltas: (deltas: Partial<ScenarioParameterDeltas>) => {
    const { currentScenario } = get();
    
    if (!currentScenario) {
      console.error('No current scenario to update deltas');
      return;
    }
    
    // Update the current scenario with new deltas
    const updatedScenario = {
      ...currentScenario,
      parameterDeltas: {
        ...currentScenario.parameterDeltas,
        ...deltas
      },
      updatedAt: new Date()
    };
    
    // Update state with the updated scenario
    set({ 
      currentScenario: updatedScenario,
      lastUpdated: Date.now()
    });
    
    // Recalculate forecast
    get().calculateScenarioForecast();
  },

  /**
   * Calculate scenario forecast based on current state
   */
  calculateScenarioForecast: () => {
    const { baselineModel, currentScenario } = get();
    
    if (!baselineModel || !currentScenario) {
      console.error('Missing baseline model or current scenario');
      return;
    }
    
    try {
      // Update the lastUpdated timestamp to trigger a re-render
      set({ lastUpdated: Date.now() });
      
      console.log('Starting forecast recalculation...');
      
      // Create a modified model by applying deltas
      const modifiedModel = applyScenarioDeltas(baselineModel, currentScenario.parameterDeltas);
      console.log('Modified model created');
      
      // Generate forecast data using the modified model
      const scenarioForecastData = generateForecastTimeSeries(modifiedModel);
      console.log('Scenario forecast calculated:', scenarioForecastData.length);
      
      // Update state with the new forecast data
      set({ scenarioForecastData });
    } catch (error) {
      console.error('Error calculating scenario forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate scenario forecast',
        variant: 'destructive',
      });
    }
  },

  /**
   * Toggle comparison mode
   */
  toggleComparisonMode: (isEnabled: boolean) => {
    set({ isComparisonMode: isEnabled });
  },

  /**
   * Reset scenario deltas to zero
   */
  resetScenarioDeltas: () => {
    const { currentScenario, baselineModel } = get();
    
    if (!currentScenario || !baselineModel) {
      console.error('No current scenario or baseline model for reset');
      return;
    }
    
    // Reset all deltas to zero
    const resetDeltas: ScenarioParameterDeltas = {
      marketingSpendPercent: 0,
      marketingSpendByChannel: {},
      pricingPercent: 0,
      attendanceGrowthPercent: 0,
      cogsMultiplier: 0
    };
    
    // Update the current scenario with reset deltas
    const updatedScenario = {
      ...currentScenario,
      parameterDeltas: resetDeltas,
      updatedAt: new Date()
    };
    
    // Update state with the updated scenario
    set({ 
      currentScenario: updatedScenario,
      lastUpdated: Date.now()
    });
    
    // Generate baseline forecast data
    const baselineForecastData = generateForecastTimeSeries(baselineModel);
    set({ baselineForecastData });
    
    // Create a modified model with reset deltas
    const modifiedModel = applyScenarioDeltas(baselineModel, resetDeltas);
    
    // Generate scenario forecast data
    const scenarioForecastData = generateForecastTimeSeries(modifiedModel);
    set({ scenarioForecastData });
    
    console.log('Reset complete, forecast recalculated');
    
    toast({
      title: 'Reset Complete',
      description: 'Scenario parameters have been reset to baseline values',
    });
  }
});
