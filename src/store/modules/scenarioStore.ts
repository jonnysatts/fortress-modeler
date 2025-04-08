import { StateCreator } from 'zustand';
import { db, FinancialModel } from '@/lib/db';
import { Scenario, ScenarioParameterDeltas } from '@/types/scenarios';
import { ForecastPeriodData, generateForecastTimeSeries } from '@/lib/financialCalculations';
import { toast } from '@/components/ui/use-toast';

/**
 * Scenario State
 * State for managing scenarios
 */
export interface ScenarioState {
  // Data
  scenarios: Scenario[];
  currentScenario: Scenario | null;
  baselineModel: FinancialModel | null;
  scenarioForecastData: ForecastPeriodData[];
  baselineForecastData: ForecastPeriodData[];
  isComparisonMode: boolean;
  lastUpdated?: number; // Timestamp to force re-renders

  // Loading states
  scenariosLoading: boolean;
  scenarioSaving: boolean;

  // Actions
  loadScenarios: (projectId: number) => Promise<Scenario[]>;
  createScenario: (projectId: number, baseModelId: number, name: string, description?: string) => Promise<Scenario>;
  updateScenario: (scenario: Scenario) => Promise<Scenario>;
  deleteScenario: (scenarioId: number) => Promise<void>;
  duplicateScenario: (scenarioId: number, newName: string) => Promise<Scenario>;
  setCurrentScenario: (scenario: Scenario | null) => void;
  setBaselineModel: (model: FinancialModel | null) => void;
  updateScenarioDeltas: (deltas: Partial<ScenarioParameterDeltas>) => void;
  calculateScenarioForecast: () => void;
  toggleComparisonMode: (isEnabled: boolean) => void;
  resetScenarioDeltas: () => void;
}

/**
 * Create Scenario Store
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
      const scenarios = await db.scenarios
        .where('projectId')
        .equals(projectId)
        .toArray();

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

      // Create default parameter deltas
      const defaultDeltas: ScenarioParameterDeltas = {
        marketingSpendPercent: 0,
        marketingSpendByChannel: {},
        pricingPercent: 0,
        attendanceGrowthPercent: 0,
        cogsMultiplier: 0
      };

      // Create the new scenario
      const newScenario: Scenario = {
        projectId,
        baseModelId,
        name,
        description,
        parameterDeltas: defaultDeltas,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const id = await db.scenarios.add(newScenario);
      const createdScenario = { ...newScenario, id };

      // Update state
      set(state => ({
        scenarios: [...state.scenarios, createdScenario],
        currentScenario: createdScenario,
        scenarioSaving: false
      }));

      toast({
        title: 'Success',
        description: `Scenario "${name}" created`,
      });

      return createdScenario;
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
      console.log('Updating scenario in store:', scenario);
      set({ scenarioSaving: true });

      // Update timestamp
      const updatedScenario = {
        ...scenario,
        updatedAt: new Date()
      };

      // Save to database
      await db.scenarios.update(scenario.id!, updatedScenario);
      console.log('Scenario saved to database');

      // Update state
      set(state => ({
        scenarios: state.scenarios.map(s =>
          s.id === scenario.id ? updatedScenario : s
        ),
        currentScenario: state.currentScenario?.id === scenario.id
          ? updatedScenario
          : state.currentScenario,
        scenarioSaving: false,
        lastUpdated: Date.now() // Force a re-render
      }));

      // Recalculate forecast with the updated scenario
      const baselineModel = get().baselineModel;
      if (baselineModel) {
        console.log('Recalculating forecast after scenario update');

        // Create a modified model with updated deltas
        const modifiedModel = applyScenarioDeltas(baselineModel, updatedScenario.parameterDeltas);

        // Generate scenario forecast data
        const scenarioForecastData = generateForecastTimeSeries(modifiedModel);

        // Update state with scenario data
        set({ scenarioForecastData });
      }

      toast({
        title: 'Success',
        description: `Scenario "${scenario.name}" updated`,
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
      set({ scenarioSaving: true });

      // Delete from database
      await db.scenarios.delete(scenarioId);

      // Update state
      set(state => ({
        scenarios: state.scenarios.filter(s => s.id !== scenarioId),
        currentScenario: state.currentScenario?.id === scenarioId
          ? null
          : state.currentScenario,
        scenarioSaving: false
      }));

      toast({
        title: 'Success',
        description: 'Scenario deleted',
      });
    } catch (error) {
      console.error('Error deleting scenario:', error);
      set({ scenarioSaving: false });
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

      // Find the scenario to duplicate
      const scenarioToDuplicate = get().scenarios.find(s => s.id === scenarioId);

      if (!scenarioToDuplicate) {
        throw new Error('Scenario not found');
      }

      // Create a new scenario based on the existing one
      const newScenario: Scenario = {
        projectId: scenarioToDuplicate.projectId,
        baseModelId: scenarioToDuplicate.baseModelId,
        name: newName,
        description: `Copy of: ${scenarioToDuplicate.description || scenarioToDuplicate.name}`,
        parameterDeltas: { ...scenarioToDuplicate.parameterDeltas },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const id = await db.scenarios.add(newScenario);
      const createdScenario = { ...newScenario, id };

      // Update state
      set(state => ({
        scenarios: [...state.scenarios, createdScenario],
        currentScenario: createdScenario,
        scenarioSaving: false
      }));

      toast({
        title: 'Success',
        description: `Scenario duplicated as "${newName}"`,
      });

      return createdScenario;
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
    const currentScenario = get().currentScenario;

    if (!currentScenario) {
      console.error('No current scenario to update');
      return;
    }

    console.log('Updating scenario deltas:', deltas);

    // Update the current scenario with new deltas
    const updatedScenario = {
      ...currentScenario,
      parameterDeltas: {
        ...currentScenario.parameterDeltas,
        ...deltas
      },
      updatedAt: new Date()
    };

    console.log('Updated scenario:', {
      before: currentScenario.parameterDeltas,
      after: updatedScenario.parameterDeltas
    });

    // Update state with a force flag to ensure UI updates
    set({
      currentScenario: updatedScenario,
      lastUpdated: Date.now() // Force a re-render
    });

    // Recalculate forecast
    get().calculateScenarioForecast();
  },

  /**
   * Calculate scenario forecast based on current deltas
   */
  calculateScenarioForecast: () => {
    const { baselineModel, currentScenario } = get();

    console.log('Calculating forecast with:', {
      baselineModel: !!baselineModel,
      currentScenario: currentScenario ? currentScenario.name : null,
      deltas: currentScenario?.parameterDeltas
    });

    if (!baselineModel || !currentScenario) {
      console.error('Missing baseline model or current scenario');
      return;
    }

    try {
      // Create a modified model by applying deltas
      const modifiedModel = applyScenarioDeltas(baselineModel, currentScenario.parameterDeltas);
      console.log('Modified model created');

      // Generate forecast data using the modified model
      const scenarioForecastData = generateForecastTimeSeries(modifiedModel);
      console.log('Scenario forecast calculated:', scenarioForecastData.length);

      // Make sure we have baseline forecast data
      let baselineForecastData = get().baselineForecastData;
      if (!baselineForecastData || baselineForecastData.length === 0) {
        console.log('Calculating baseline forecast');
        baselineForecastData = generateForecastTimeSeries(baselineModel);
      }

      // Update state with both datasets to ensure UI updates
      console.log('Updating state with new forecast data');
      set({
        scenarioForecastData,
        baselineForecastData
      });

      console.log('Forecast recalculated:', {
        scenarioForecastData: scenarioForecastData.length,
        baselineForecastData: baselineForecastData.length
      });

      // Force a re-render by updating a timestamp
      set(state => ({
        ...state,
        lastUpdated: new Date().getTime()
      }));
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
    const currentScenario = get().currentScenario;
    const baselineModel = get().baselineModel;

    console.log('Resetting scenario deltas in store');

    if (!currentScenario) {
      console.error('No current scenario to reset');
      return;
    }

    if (!baselineModel) {
      console.error('No baseline model for reset');
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

    // Update state with a force flag to ensure UI updates
    set({
      currentScenario: updatedScenario,
      lastUpdated: Date.now() // Force a re-render
    });

    // Generate baseline forecast data
    const baselineForecastData = generateForecastTimeSeries(baselineModel);

    // Update state with baseline data
    set({ baselineForecastData });

    // Create a modified model with reset deltas
    const modifiedModel = applyScenarioDeltas(baselineModel, resetDeltas);

    // Generate scenario forecast data
    const scenarioForecastData = generateForecastTimeSeries(modifiedModel);

    // Update state with scenario data
    set({ scenarioForecastData });

    console.log('Reset complete, forecast recalculated');

    toast({
      title: 'Reset Complete',
      description: 'Scenario parameters have been reset to baseline values',
    });
  }
});

/**
 * Apply scenario deltas to a baseline model
 * Creates a new model with the deltas applied
 */
function applyScenarioDeltas(
  baselineModel: FinancialModel,
  deltas: ScenarioParameterDeltas
): FinancialModel {
  console.log('Applying scenario deltas:', deltas);

  // Create a deep copy of the baseline model
  const modifiedModel: FinancialModel = JSON.parse(JSON.stringify(baselineModel));

  // Apply marketing spend percent delta
  if (deltas.marketingSpendPercent !== 0) {
    console.log(`Applying marketing spend delta: ${deltas.marketingSpendPercent}%`);

    // If we have marketing channels, adjust each channel's budget
    if (modifiedModel.assumptions.marketing?.channels) {
      console.log('Adjusting marketing channels budgets');

      modifiedModel.assumptions.marketing.channels = modifiedModel.assumptions.marketing.channels.map(channel => {
        // Apply the overall marketing spend adjustment
        const adjustedBudget = channel.weeklyBudget * (1 + deltas.marketingSpendPercent / 100);

        // Apply any channel-specific adjustments
        const channelSpecificDelta = deltas.marketingSpendByChannel[channel.id] || 0;
        const finalBudget = adjustedBudget * (1 + channelSpecificDelta / 100);

        console.log(`Channel ${channel.id}: ${channel.weeklyBudget} -> ${Math.round(finalBudget)}`);

        return {
          ...channel,
          weeklyBudget: Math.round(finalBudget)
        };
      });
    }

    // If we have a high-level marketing budget, adjust it
    if (modifiedModel.assumptions.marketing?.totalBudget) {
      const oldBudget = modifiedModel.assumptions.marketing.totalBudget;
      const newBudget = oldBudget * (1 + deltas.marketingSpendPercent / 100);

      console.log(`Total marketing budget: ${oldBudget} -> ${newBudget}`);

      modifiedModel.assumptions.marketing.totalBudget = newBudget;
    }
  }

  // Apply pricing percent delta
  if (deltas.pricingPercent !== 0 && modifiedModel.assumptions.metadata?.perCustomer?.ticketPrice) {
    modifiedModel.assumptions.metadata.perCustomer.ticketPrice =
      modifiedModel.assumptions.metadata.perCustomer.ticketPrice * (1 + deltas.pricingPercent / 100);
  }

  // Apply attendance growth rate delta
  if (deltas.attendanceGrowthPercent !== 0 && modifiedModel.assumptions.metadata?.growth?.attendanceGrowthRate) {
    // Add the delta to the existing growth rate (not multiply)
    modifiedModel.assumptions.metadata.growth.attendanceGrowthRate += deltas.attendanceGrowthPercent;
  }

  // Apply COGS multiplier delta
  if (deltas.cogsMultiplier !== 0) {
    // Adjust F&B COGS percentage
    if (modifiedModel.assumptions.metadata?.costs?.fbCOGSPercent) {
      modifiedModel.assumptions.metadata.costs.fbCOGSPercent =
        modifiedModel.assumptions.metadata.costs.fbCOGSPercent * (1 + deltas.cogsMultiplier / 100);
    }

    // Adjust merchandise COGS percentage
    if (modifiedModel.assumptions.metadata?.costs?.merchandiseCogsPercent) {
      modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent =
        modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent * (1 + deltas.cogsMultiplier / 100);
    }
  }

  return modifiedModel;
}
