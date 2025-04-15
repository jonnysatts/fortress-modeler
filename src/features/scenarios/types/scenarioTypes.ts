/**
 * Scenario Types
 * 
 * This module contains type definitions for the scenario modeling feature.
 */

import { FinancialModel } from '@/lib/db';
import { ForecastPeriodData } from '@/lib/financialCalculations';

/**
 * Parameter deltas for scenarios
 * These are the adjustments applied to the base model
 */
export interface ScenarioParameterDeltas {
  // Marketing adjustments
  marketingSpendPercent: number; // Overall marketing budget adjustment (percentage)
  marketingSpendByChannel: Record<string, number>; // Per-channel adjustments (percentage)

  // Pricing adjustments
  pricingPercent: number; // Average ticket price adjustment (percentage)

  // Attendance adjustments
  attendanceGrowthPercent: number; // Attendance growth rate adjustment (percentage points)

  // Cost adjustments
  cogsMultiplier: number; // Cost of goods sold adjustment (percentage)
}

/**
 * Scenario model
 * Represents a scenario in the system
 */
export interface Scenario {
  id?: number; // Auto-generated ID
  name: string; // User-friendly name
  description?: string; // Optional description
  baseModelId: number; // Reference to the base financial model
  projectId: number; // Reference to the project
  parameterDeltas: ScenarioParameterDeltas; // Parameter adjustments
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}

/**
 * Scenario summary metrics
 * Key metrics calculated for a scenario
 */
export interface ScenarioSummaryMetrics {
  totalRevenue: number; // Total revenue over the forecast period
  totalCosts: number; // Total costs over the forecast period
  totalProfit: number; // Total profit over the forecast period
  profitMargin: number; // Profit margin as a percentage
  breakEvenPeriod: {
    index: number | null; // Period index when break-even occurs (null if never)
    label: string; // Human-readable label for the break-even period
  };
  averageWeeklyRevenue: number; // Average revenue per period
  averageWeeklyCosts: number; // Average costs per period
  averageWeeklyProfit: number; // Average profit per period
}

/**
 * Scenario comparison metrics
 * Metrics showing the difference between baseline and scenario
 */
export interface ScenarioComparisonMetrics {
  revenueDelta: number; // Absolute difference in revenue
  revenueDeltaPercent: number; // Percentage difference in revenue
  costsDelta: number; // Absolute difference in costs
  costsDeltaPercent: number; // Percentage difference in costs
  profitDelta: number; // Absolute difference in profit
  profitDeltaPercent: number; // Percentage difference in profit
  marginDelta: number; // Difference in profit margin (percentage points)
  breakEvenDelta: number; // Difference in break-even period (number of periods)
}

/**
 * Input for creating a new scenario
 */
export interface CreateScenarioInput {
  name: string;
  description?: string;
  projectId: number;
  baseModelId: number;
}

/**
 * Input for updating an existing scenario
 */
export interface UpdateScenarioInput {
  id: number;
  name?: string;
  description?: string;
  parameterDeltas?: Partial<ScenarioParameterDeltas>;
}

/**
 * Forecast data for a scenario
 */
export interface ScenarioForecastData {
  baselineData: ForecastPeriodData[];
  scenarioData: ForecastPeriodData[];
  summaryMetrics: ScenarioSummaryMetrics;
  comparisonMetrics: ScenarioComparisonMetrics;
}

/**
 * Parameter relationship definition
 * Defines how changing one parameter affects another
 */
export interface ParameterRelationship {
  targetParam: keyof ScenarioParameterDeltas;
  description: string;
  calculateSuggestion: (sourceValue: number, ...args: any[]) => number;
}

/**
 * Scenario editor state
 */
export interface ScenarioEditorState {
  localDeltas: ScenarioParameterDeltas;
  isDirty: boolean;
  isSaving: boolean;
  activeTab: string;
  hasUnsavedChanges: boolean;
}

/**
 * Scenario store state
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
}
