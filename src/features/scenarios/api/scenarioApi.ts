/**
 * Scenario API
 * 
 * This module contains functions for interacting with scenario data.
 */

import { db } from '@/lib/db';
import { 
  Scenario, 
  CreateScenarioInput, 
  UpdateScenarioInput, 
  ScenarioParameterDeltas 
} from '../types/scenarioTypes';

/**
 * Get all scenarios for a project
 * 
 * @param projectId - The ID of the project
 * @returns Promise resolving to an array of scenarios
 */
export async function getScenarios(projectId: number): Promise<Scenario[]> {
  try {
    const scenarios = await db.scenarios
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    return scenarios;
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    throw new Error('Failed to fetch scenarios');
  }
}

/**
 * Get a scenario by ID
 * 
 * @param scenarioId - The ID of the scenario
 * @returns Promise resolving to the scenario or null if not found
 */
export async function getScenarioById(scenarioId: number): Promise<Scenario | null> {
  try {
    const scenario = await db.scenarios.get(scenarioId);
    return scenario || null;
  } catch (error) {
    console.error(`Error fetching scenario ${scenarioId}:`, error);
    throw new Error('Failed to fetch scenario');
  }
}

/**
 * Create a new scenario
 * 
 * @param data - The scenario data
 * @returns Promise resolving to the created scenario
 */
export async function createScenario(data: CreateScenarioInput): Promise<Scenario> {
  try {
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
      ...data,
      parameterDeltas: defaultDeltas,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to database
    const id = await db.scenarios.add(newScenario);
    
    return { ...newScenario, id };
  } catch (error) {
    console.error('Error creating scenario:', error);
    throw new Error('Failed to create scenario');
  }
}

/**
 * Update an existing scenario
 * 
 * @param data - The scenario update data
 * @returns Promise resolving to the updated scenario
 */
export async function updateScenario(data: UpdateScenarioInput): Promise<Scenario> {
  try {
    const { id, ...updates } = data;
    
    // Get the existing scenario
    const existingScenario = await db.scenarios.get(id);
    if (!existingScenario) {
      throw new Error(`Scenario with ID ${id} not found`);
    }
    
    // Create the updated scenario
    const updatedScenario: Scenario = {
      ...existingScenario,
      ...updates,
      parameterDeltas: {
        ...existingScenario.parameterDeltas,
        ...(updates.parameterDeltas || {})
      },
      updatedAt: new Date()
    };
    
    // Update in database
    await db.scenarios.update(id, updatedScenario);
    
    return updatedScenario;
  } catch (error) {
    console.error(`Error updating scenario ${data.id}:`, error);
    throw new Error('Failed to update scenario');
  }
}

/**
 * Delete a scenario
 * 
 * @param scenarioId - The ID of the scenario to delete
 * @returns Promise resolving when the scenario is deleted
 */
export async function deleteScenario(scenarioId: number): Promise<void> {
  try {
    await db.scenarios.delete(scenarioId);
  } catch (error) {
    console.error(`Error deleting scenario ${scenarioId}:`, error);
    throw new Error('Failed to delete scenario');
  }
}

/**
 * Duplicate a scenario
 * 
 * @param scenarioId - The ID of the scenario to duplicate
 * @param newName - The name for the duplicated scenario
 * @returns Promise resolving to the duplicated scenario
 */
export async function duplicateScenario(scenarioId: number, newName: string): Promise<Scenario> {
  try {
    // Get the existing scenario
    const existingScenario = await db.scenarios.get(scenarioId);
    if (!existingScenario) {
      throw new Error(`Scenario with ID ${scenarioId} not found`);
    }
    
    // Create a duplicate with a new name
    const duplicatedScenario: Scenario = {
      ...existingScenario,
      id: undefined, // Remove ID so a new one is generated
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to database
    const id = await db.scenarios.add(duplicatedScenario);
    
    return { ...duplicatedScenario, id };
  } catch (error) {
    console.error(`Error duplicating scenario ${scenarioId}:`, error);
    throw new Error('Failed to duplicate scenario');
  }
}
