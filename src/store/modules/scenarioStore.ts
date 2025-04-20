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
  calculateScenarioForecast: (deltas?: ScenarioParameterDeltas, options?: {
    attendanceGrowthMode?: 'replace' | 'add',
    cogsMode?: 'multiply' | 'add'
  }) => void;
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

    // Always recalculate baseline forecast with the latest calculation engine
    if (model) {
      // Use the robust generateForecastTimeSeries from financialCalculations.ts
      const baselineForecastData = generateForecastTimeSeries(model);
      set({ baselineForecastData });

      // Also recalculate scenario forecast if a scenario is selected
      if (get().currentScenario) {
        get().calculateScenarioForecast();
      }
    } else {
      // If model is null, clear the forecast data
      set({ baselineForecastData: [], scenarioForecastData: [] });
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
   * Calculate scenario forecast based on provided deltas or current state
   */
  calculateScenarioForecast: (deltas?: ScenarioParameterDeltas, options?: {
    attendanceGrowthMode?: 'replace' | 'add',
    cogsMode?: 'multiply' | 'add'
  }) => {
    // Use provided deltas or fall back to current state
    const baseModel = get().baselineModel;
    const paramDeltas = deltas || get().currentScenario?.parameterDeltas;
    const { currentScenario } = get();

    // Debug log to confirm calculation source
    console.log('[ScenarioStore] Calculating scenario forecast with:', {
      baseModel: !!baseModel,
      paramDeltas,
      scenario: currentScenario ? currentScenario.name : null
    });

    if (!baseModel || !paramDeltas) {
      toast({
        title: 'Calculation Error',
        description: 'Missing base model or scenario parameters',
        variant: 'destructive',
      });
      return;
    }

    try {
      set({ lastUpdated: new Date().getTime() });
      // Apply deltas to base model
      const modifiedModel = applyScenarioDeltas(baseModel, paramDeltas, options);
      // Use robust calculation engine for both scenario and baseline
      const scenarioForecastData = generateForecastTimeSeries(modifiedModel);
      const baselineForecastData = generateForecastTimeSeries(baseModel);

      // Log output for debugging
      console.log('[ScenarioStore] Baseline forecast (first 3):', baselineForecastData.slice(0, 3));
      console.log('[ScenarioStore] Scenario forecast (first 3):', scenarioForecastData.slice(0, 3));

      set({ baselineForecastData });
      set({ scenarioForecastData });
      set({ lastUpdated: new Date().getTime() });
      console.log('[ScenarioStore] Forecast calculation complete.');
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
  deltas: ScenarioParameterDeltas,
  options?: {
    attendanceGrowthMode?: 'replace' | 'add',
    cogsMode?: 'multiply' | 'add'
  }
): FinancialModel {
  console.log('Applying scenario deltas:', deltas, options);

  const attendanceGrowthMode = options?.attendanceGrowthMode || 'replace';
  const cogsMode = options?.cogsMode || 'multiply';

  // Create a deep copy of the baseline model
  const modifiedModel: FinancialModel = JSON.parse(JSON.stringify(baselineModel));

  // Apply marketing spend percent delta
  // Always apply marketing spend adjustments to ensure proper configuration
  console.log(`Applying marketing spend delta: ${deltas.marketingSpendPercent}%`);

  // If we have marketing channels, adjust each channel's budget
  if (modifiedModel.assumptions.marketing?.channels) {
    console.log('Adjusting marketing channels budgets');

    modifiedModel.assumptions.marketing.channels = modifiedModel.assumptions.marketing.channels.map(channel => {
      // Store original value for logging
      const originalBudget = channel.weeklyBudget;

      // Only apply the adjustment if the delta is not zero
      let adjustedBudget = channel.weeklyBudget;
      if (deltas.marketingSpendPercent !== 0) {
        adjustedBudget = channel.weeklyBudget * (1 + deltas.marketingSpendPercent / 100);
      }

      // Apply any channel-specific adjustments
      const channelSpecificDelta = deltas.marketingSpendByChannel[channel.id] || 0;
      let finalBudget = adjustedBudget;
      if (channelSpecificDelta !== 0) {
        finalBudget = adjustedBudget * (1 + channelSpecificDelta / 100);
      }

      console.log(`Channel ${channel.name || channel.id}: Original budget: $${originalBudget.toFixed(2)} -> After global ${deltas.marketingSpendPercent}% change: $${adjustedBudget.toFixed(2)} -> After channel-specific ${channelSpecificDelta}% change: $${finalBudget.toFixed(2)}`);

      return {
        ...channel,
        weeklyBudget: Math.round(finalBudget)
      };
    });

    // Calculate and log total marketing spend before and after
    const originalTotalSpend = baselineModel.assumptions.marketing?.channels?.reduce(
      (total, channel) => total + channel.weeklyBudget, 0
    ) || 0;

    const modifiedTotalSpend = modifiedModel.assumptions.marketing?.channels?.reduce(
      (total, channel) => total + channel.weeklyBudget, 0
    ) || 0;

    console.log(`Total weekly marketing spend: Original: $${originalTotalSpend.toFixed(2)} -> Modified: $${modifiedTotalSpend.toFixed(2)}, Change: ${((modifiedTotalSpend/originalTotalSpend - 1) * 100).toFixed(2)}%`);
  }

  // If we have a high-level marketing budget, adjust it
  if (modifiedModel.assumptions.marketing?.totalBudget) {
    const oldBudget = modifiedModel.assumptions.marketing.totalBudget;
    let newBudget = oldBudget;

    if (deltas.marketingSpendPercent !== 0) {
      newBudget = oldBudget * (1 + deltas.marketingSpendPercent / 100);
    }

    console.log(`Total marketing budget: $${oldBudget.toFixed(2)} -> $${newBudget.toFixed(2)}, Change: ${deltas.marketingSpendPercent}%`);

    modifiedModel.assumptions.marketing.totalBudget = newBudget;
  }

  // Apply pricing percent delta - ALWAYS apply this to ensure it's properly configured
  if (modifiedModel.assumptions.metadata?.perCustomer) {
    console.log(`Applying pricing delta: ${deltas.pricingPercent}%`);

    // Apply pricing delta to ticket price
    if (modifiedModel.assumptions.metadata.perCustomer.ticketPrice !== undefined) {
      const originalTicketPrice = modifiedModel.assumptions.metadata.perCustomer.ticketPrice;

      // Always apply the pricing delta, even if it's 0, to ensure consistent calculation
      modifiedModel.assumptions.metadata.perCustomer.ticketPrice =
        originalTicketPrice * (1 + deltas.pricingPercent / 100);

      console.log(`Ticket price: Original: $${originalTicketPrice.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.perCustomer.ticketPrice.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
    }

    // Also apply to F&B and merchandise if they exist
    if (modifiedModel.assumptions.metadata.perCustomer.fbSpend !== undefined) {
      const originalFbSpend = modifiedModel.assumptions.metadata.perCustomer.fbSpend;

      // Always apply the pricing delta, even if it's 0, to ensure consistent calculation
      modifiedModel.assumptions.metadata.perCustomer.fbSpend =
        originalFbSpend * (1 + deltas.pricingPercent / 100);

      console.log(`F&B spend: Original: $${originalFbSpend.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.perCustomer.fbSpend.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
    }

    if (modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend !== undefined) {
      const originalMerchSpend = modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend;

      // Always apply the pricing delta, even if it's 0, to ensure consistent calculation
      modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend =
        originalMerchSpend * (1 + deltas.pricingPercent / 100);

      console.log(`Merchandise spend: Original: $${originalMerchSpend.toFixed(2)} -> Modified: $${modifiedModel.assumptions.metadata.perCustomer.merchandiseSpend.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
    }

    // Also apply to any revenue streams that might exist
    if (modifiedModel.assumptions.revenueStreams && modifiedModel.assumptions.revenueStreams.length > 0) {
      console.log('Applying pricing delta to revenue streams');

      modifiedModel.assumptions.revenueStreams = modifiedModel.assumptions.revenueStreams.map(stream => {
        if (stream.value !== undefined) {
          const originalValue = stream.value;
          const newValue = originalValue * (1 + deltas.pricingPercent / 100);
          console.log(`Revenue stream ${stream.name}: Original: $${originalValue.toFixed(2)} -> Modified: $${newValue.toFixed(2)}, Change: ${deltas.pricingPercent}%`);
          return { ...stream, value: newValue };
        }
        return stream;
      });
    }
  }

  // Apply attendance growth rate delta
  if (modifiedModel.assumptions.metadata?.growth) {
    const originalRate = modifiedModel.assumptions.metadata.growth.attendanceGrowthRate || 0;
    let newGrowthRate = originalRate;
    if (attendanceGrowthMode === 'replace') {
      newGrowthRate = deltas.attendanceGrowthPercent;
    } else if (attendanceGrowthMode === 'add') {
      newGrowthRate = originalRate + deltas.attendanceGrowthPercent;
    }
    modifiedModel.assumptions.metadata.growth.attendanceGrowthRate = newGrowthRate;
    console.log(`Attendance growth rate: Original: ${originalRate}% -> Modified: ${newGrowthRate}%, Mode: ${attendanceGrowthMode}`);
    // Force enable customer spend growth to ensure growth calculations are used
    modifiedModel.assumptions.metadata.growth.useCustomerSpendGrowth = true;
    console.log(`Enabled useCustomerSpendGrowth: ${modifiedModel.assumptions.metadata.growth.useCustomerSpendGrowth}`);

    // If this is a weekly event model, ensure the attendance growth is properly configured
    if (modifiedModel.assumptions.metadata.type === "WeeklyEvent" ||
        modifiedModel.assumptions.metadata.type === "Weekly") {
      console.log('Configuring weekly event model for attendance growth');

      // Ensure the growth model is properly set to use exponential growth
      if (modifiedModel.assumptions.growthModel) {
        // FORCE Set growth model to use exponential growth with a matching rate
        modifiedModel.assumptions.growthModel.type = 'exponential';

        // Update the growth model rate to match or complement the attendance growth rate
        // Ensure it's active by setting a positive rate
        const growthRate = modifiedModel.assumptions.metadata.growth.attendanceGrowthRate / 100; // Convert to decimal
        modifiedModel.assumptions.growthModel.rate = Math.max(0.01, growthRate);

        console.log('Growth model FORCED to type: exponential, rate:', modifiedModel.assumptions.growthModel.rate);
      }

      // Ensure ticket price growth is enabled and set to a reasonable value if not already set
      if (modifiedModel.assumptions.metadata.growth.ticketPriceGrowth === undefined ||
          modifiedModel.assumptions.metadata.growth.ticketPriceGrowth === 0) {
        modifiedModel.assumptions.metadata.growth.ticketPriceGrowth = 2.0; // Default 2% growth
        console.log(`Set default ticket price growth: ${modifiedModel.assumptions.metadata.growth.ticketPriceGrowth}%`);
      }

      // Ensure F&B spend growth is enabled and set to a reasonable value if not already set
      if (modifiedModel.assumptions.metadata.growth.fbSpendGrowth === undefined ||
          modifiedModel.assumptions.metadata.growth.fbSpendGrowth === 0) {
        modifiedModel.assumptions.metadata.growth.fbSpendGrowth = 2.0; // Default 2% growth
        console.log(`Set default F&B spend growth: ${modifiedModel.assumptions.metadata.growth.fbSpendGrowth}%`);
      }

      // Ensure merchandise spend growth is enabled and set to a reasonable value if not already set
      if (modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth === undefined ||
          modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth === 0) {
        modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth = 2.0; // Default 2% growth
        console.log(`Set default merchandise spend growth: ${modifiedModel.assumptions.metadata.growth.merchandiseSpendGrowth}%`);
      }
    }
  }

  // Apply COGS multiplier delta
  if (modifiedModel.assumptions.metadata?.costs) {
    // F&B COGS
    if (modifiedModel.assumptions.metadata.costs.fbCOGSPercent !== undefined) {
      const originalFbCogs = modifiedModel.assumptions.metadata.costs.fbCOGSPercent;
      let newFbCogs = originalFbCogs;
      if (cogsMode === 'multiply') {
        newFbCogs = originalFbCogs * (1 + deltas.cogsMultiplier / 100);
      } else if (cogsMode === 'add') {
        newFbCogs = originalFbCogs + deltas.cogsMultiplier;
      }
      modifiedModel.assumptions.metadata.costs.fbCOGSPercent = newFbCogs;
      console.log(`F&B COGS: Original: ${originalFbCogs}% -> Modified: ${newFbCogs}%, Mode: ${cogsMode}`);
    }

    // Merchandise COGS
    if (modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent !== undefined) {
      const originalMerchCogs = modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent;
      let newMerchCogs = originalMerchCogs;
      if (cogsMode === 'multiply') {
        newMerchCogs = originalMerchCogs * (1 + deltas.cogsMultiplier / 100);
      } else if (cogsMode === 'add') {
        newMerchCogs = originalMerchCogs + deltas.cogsMultiplier;
      }
      modifiedModel.assumptions.metadata.costs.merchandiseCogsPercent = newMerchCogs;
      console.log(`Merchandise COGS: Original: ${originalMerchCogs}% -> Modified: ${newMerchCogs}%, Mode: ${cogsMode}`);
    }

    // Adjust staff costs if they exist
    if (modifiedModel.assumptions.metadata.costs.staffCostPerPerson !== undefined && deltas.cogsMultiplier !== 0) {
      const originalStaffCost = modifiedModel.assumptions.metadata.costs.staffCostPerPerson;
      let newStaffCost = originalStaffCost;
      if (cogsMode === 'multiply') {
        newStaffCost = originalStaffCost * (1 + deltas.cogsMultiplier / 100);
      } else if (cogsMode === 'add') {
        newStaffCost = originalStaffCost + deltas.cogsMultiplier;
      }
      modifiedModel.assumptions.metadata.costs.staffCostPerPerson = newStaffCost;
      console.log(`Staff cost per person: Original: $${originalStaffCost.toFixed(2)} -> Modified: $${newStaffCost.toFixed(2)}, Mode: ${cogsMode}`);
    }
  }

  // CRITICAL: Fix marketing setup if there's marketing spend
  if (deltas.marketingSpendPercent !== 0) {
    // Ensure marketing mode is properly set
    if (!modifiedModel.assumptions.marketing) {
      console.log('Creating marketing setup because marketing spend changed');
      modifiedModel.assumptions.marketing = {
        allocationMode: 'highLevel',
        channels: [],
        totalBudget: 1000, // Default budget
        budgetApplication: 'spreadEvenly',
        spreadDuration: modifiedModel.assumptions.metadata?.weeks || 12
      };
    }

    // Ensure allocation mode is set
    const validModes = ['channels', 'highLevel'];
    const currentMode = modifiedModel.assumptions.marketing.allocationMode as string;
    if (currentMode === 'none' || !validModes.includes(currentMode)) {
      console.log('Fixing marketing allocation mode from', currentMode, 'to highLevel');
      modifiedModel.assumptions.marketing.allocationMode = 'highLevel';
      if (!modifiedModel.assumptions.marketing.totalBudget) {
        modifiedModel.assumptions.marketing.totalBudget = 1000; // Default budget
      }
      modifiedModel.assumptions.marketing.budgetApplication = 'spreadEvenly';
      modifiedModel.assumptions.marketing.spreadDuration = modifiedModel.assumptions.metadata?.weeks || 12;
    }

    console.log('Marketing setup configured:', modifiedModel.assumptions.marketing);
  }

  return modifiedModel;
}
