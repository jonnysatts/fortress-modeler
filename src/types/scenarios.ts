/**
 * Scenarios Types
 * Types for the Scenarios feature
 */

/**
 * Parameter deltas for scenarios
 * These are the adjustments applied to the base model
 */
export interface ScenarioParameterDeltas {
  // Marketing adjustments
  marketingSpendPercent: number; // Overall marketing budget adjustment
  marketingSpendByChannel: Record<string, number>; // Per-channel adjustments

  // Pricing adjustments
  pricingPercent: number; // Average ticket price adjustment
  ticketPriceDeltaType?: 'percent' | 'absolute'; // How to interpret the delta
  ticketPriceDelta?: number; // Value (percent or dollars)

  // Attendance adjustments
  attendanceGrowthPercent: number; // Attendance growth rate adjustment

  // Cost adjustments
  cogsMultiplier: number; // Cost of goods sold adjustment

  // Per-attendee revenue deltas for scenario modeling
  fbSpendDeltaType?: 'percent' | 'absolute';
  fbSpendDelta?: number;
  merchSpendDeltaType?: 'percent' | 'absolute';
  merchSpendDelta?: number;
}

/**
 * Scenario model
 * Represents a scenario in the system
 */
export interface Scenario {
  id?: number; // Auto-generated ID
  name: string; // User-friendly name
  description?: string; // Optional description
  modelId: number; // Reference to the base financial model
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
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  breakEvenPeriod: {
    index: number | null;
    label: string;
  };
  averageWeeklyRevenue: number;
  averageWeeklyCosts: number;
  averageWeeklyProfit: number;
}

/**
 * Scenario comparison metrics
 * Metrics showing the difference between baseline and scenario
 */
export interface ScenarioComparisonMetrics {
  revenueDelta: number;
  revenueDeltaPercent: number;
  costsDelta: number;
  costsDeltaPercent: number;
  profitDelta: number;
  profitDeltaPercent: number;
  marginDelta: number;
  breakEvenDelta: number;
}
