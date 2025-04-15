/**
 * Scenario Parameter Relationships
 * 
 * Defines relationships between different scenario parameters
 * and calculates suggested changes based on these relationships.
 */

import { ScenarioParameterDeltas, ParameterRelationship } from '../types/scenarioTypes';

/**
 * Relationship map defines how changing one parameter affects others
 */
export const parameterRelationships: Record<keyof ScenarioParameterDeltas, ParameterRelationship[]> = {
  // Marketing spend affects attendance growth
  marketingSpendPercent: [
    {
      targetParam: 'attendanceGrowthPercent',
      description: 'Increased marketing typically leads to higher attendance',
      calculateSuggestion: (marketingChange) => {
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
      calculateSuggestion: (priceChange) => {
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
 * 
 * @param sourceParam - The parameter that was changed
 * @param sourceValue - The new value of the source parameter
 * @param currentDeltas - The current state of all deltas
 * @returns An object with suggested changes to other parameters
 */
export function calculateRelatedChanges(
  sourceParam: keyof ScenarioParameterDeltas,
  sourceValue: number,
  currentDeltas: ScenarioParameterDeltas
): Partial<ScenarioParameterDeltas> {
  console.log(`Calculating related changes for ${sourceParam} = ${sourceValue}`);
  
  // Get relationships for the source parameter
  const relationships = parameterRelationships[sourceParam] || [];
  
  console.log(`Found ${relationships.length} relationships for ${sourceParam}`);
  
  if (relationships.length === 0) {
    return {}; // No relationships defined
  }
  
  // Calculate suggested changes for each relationship
  const suggestedChanges: Partial<ScenarioParameterDeltas> = {};
  
  relationships.forEach(relationship => {
    const targetParam = relationship.targetParam;
    const currentTargetValue = currentDeltas[targetParam];
    
    // Handle special case for marketingSpendByChannel which is an object
    if (targetParam === 'marketingSpendByChannel') {
      // Skip for now as this is a complex object
      return;
    }
    
    const suggestedValue = relationship.calculateSuggestion(
      sourceValue, 
      currentTargetValue as number,
      currentDeltas
    );
    
    console.log(`Suggested value for ${targetParam}: ${suggestedValue} (current: ${currentTargetValue})`);
    
    // Always suggest if there's any change at all
    if (Math.abs(suggestedValue - (currentTargetValue as number)) > 0.01) {
      // Ensure we're setting the right type based on parameter
      if (typeof suggestedValue === 'number') {
        (suggestedChanges as any)[targetParam] = suggestedValue;
      }
    }
  });
  
  console.log('Final suggested changes:', suggestedChanges);
  
  return suggestedChanges;
}

/**
 * Get a description of the relationship between two parameters
 * 
 * @param sourceParam - The source parameter
 * @param targetParam - The target parameter
 * @returns A description of the relationship or null if none exists
 */
export function getRelationshipDescription(
  sourceParam: keyof ScenarioParameterDeltas,
  targetParam: keyof ScenarioParameterDeltas
): string | null {
  const relationships = parameterRelationships[sourceParam] || [];
  const relationship = relationships.find(r => r.targetParam === targetParam);
  
  return relationship ? relationship.description : null;
}
