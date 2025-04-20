/**
 * Scenario Parameter Relationships
 * Defines relationships between different scenario parameters
 * and calculates suggested changes based on these relationships.
 */

import { ScenarioParameterDeltas } from '@/types/scenarios';

/**
 * Relationship type for parameter changes
 */
export interface ParameterRelationship {
  // The parameter that will be affected
  targetParam: keyof ScenarioParameterDeltas;
  
  // Description of the relationship for the UI
  description: string;
  
  // Function to calculate the suggested change
  calculateSuggestion: (
    sourceValue: number, 
    currentTargetValue: number,
    allDeltas: ScenarioParameterDeltas
  ) => number;
}

/**
 * Relationship map defines how changing one parameter affects others
 */
export const parameterRelationships: Record<keyof ScenarioParameterDeltas, ParameterRelationship[]> = {
  // Marketing spend affects attendance growth
  marketingSpendPercent: [
    {
      targetParam: 'attendanceGrowthPercent',
      description: 'Increased marketing typically leads to higher attendance',
      calculateSuggestion: (marketingChange, currentAttendance) => {
        // Simple model: 10% increase in marketing leads to ~2% increase in attendance
        // This is a simplified model - in reality, this would be based on historical data
        const attendanceImpact = marketingChange * 0.2;
        return Math.round(attendanceImpact * 10) / 10; // Round to 1 decimal place
      }
    }
  ],
  
  // Price changes affect attendance
  pricingPercent: [
    {
      targetParam: 'attendanceGrowthPercent',
      description: 'Price increases typically reduce attendance (price elasticity)',
      calculateSuggestion: (priceChange, currentAttendance) => {
        // Simple elasticity model: 10% price increase leads to ~5% decrease in attendance
        // Elasticity of -0.5
        const attendanceImpact = priceChange * -0.5;
        return Math.round(attendanceImpact * 10) / 10; // Round to 1 decimal place
      }
    }
  ],
  
  // Attendance growth has no direct effect on other parameters
  attendanceGrowthPercent: [],
  
  // COGS changes have no direct effect on other parameters
  cogsMultiplier: [],
  
  // Channel-specific marketing spend has no direct effect on other parameters
  marketingSpendByChannel: []
};

/**
 * Calculate suggested parameter changes based on a change to a source parameter
 * @param param The parameter that was changed
 * @param value The new value of the source parameter
 * @param localDeltas The current state of all deltas
 * @param options Calculation mode options for attendance growth and cogs
 * @returns An object with suggested changes to other parameters
 */
export function calculateRelatedChanges(
  param: keyof ScenarioParameterDeltas,
  value: number,
  localDeltas: ScenarioParameterDeltas,
  options?: {
    attendanceGrowthMode?: 'replace' | 'add',
    cogsMode?: 'multiply' | 'add'
  }
): Partial<ScenarioParameterDeltas> {
  // Example: if marketingSpendPercent changes, suggest a related attendance growth adjustment
  const suggestions: Partial<ScenarioParameterDeltas> = {};

  if (param === 'marketingSpendPercent') {
    // If marketing spend goes up, attendance growth might also go up
    // If attendance growth mode is 'replace', suggest a new value; if 'add', suggest an increment
    if (options?.attendanceGrowthMode === 'replace') {
      suggestions.attendanceGrowthPercent = Math.max(0, value * 0.2); // e.g., 20% of marketing change
    } else {
      suggestions.attendanceGrowthPercent = (localDeltas.attendanceGrowthPercent || 0) + value * 0.2;
    }
  }
  if (param === 'pricingPercent') {
    // If pricing goes up, attendance growth might go down
    if (options?.attendanceGrowthMode === 'replace') {
      suggestions.attendanceGrowthPercent = Math.max(0, localDeltas.attendanceGrowthPercent - value * 0.1);
    } else {
      suggestions.attendanceGrowthPercent = (localDeltas.attendanceGrowthPercent || 0) - value * 0.1;
    }
  }
  if (param === 'cogsMultiplier') {
    // Suggest nothing for now, but could add logic for related changes
  }
  // More sophisticated logic can be added here

  return suggestions;
}
