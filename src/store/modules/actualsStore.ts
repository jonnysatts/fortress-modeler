import { StateCreator } from 'zustand';
import { db } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import { BaseState, createInitialBaseState } from '../types';

// Define the Actuals Store slice
export interface ActualsState extends BaseState {
  // State
  actuals: ActualsPeriodEntry[];

  // Actions
  loadActuals: (projectId: number) => Promise<ActualsPeriodEntry[]>;
  loadActualsForProject: (projectId: number) => Promise<ActualsPeriodEntry[]>;
  addActual: (actual: Omit<ActualsPeriodEntry, 'id'>) => Promise<number>;
  updateActual: (id: number, updates: Partial<ActualsPeriodEntry>) => Promise<void>;
  deleteActual: (id: number) => Promise<void>;
  getActualsForPeriod: (projectId: number, period: number) => Promise<ActualsPeriodEntry | undefined>;
}

// Create the actuals store slice
export const createActualsSlice: StateCreator<ActualsState> = (set, get) => ({
  // Initial state
  ...createInitialBaseState(),
  actuals: [],

  // Actions
  loadActuals: async (projectId: number) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      const actuals = await db.actuals
        .where('projectId')
        .equals(projectId)
        .toArray();

      set(state => ({
        actuals,
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));

      console.log(`[Store] Found ${actuals.length} actuals entries.`);
      return actuals;
    } catch (error) {
      console.error(`Error loading actuals for project ${projectId}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to load actuals: ${error}` }
      }));
      return [];
    }
  },

  loadActualsForProject: async (projectId: number) => {
    try {
      console.log(`[ActualsStore] Loading actuals for project ${projectId}`);
      const actuals = await db.actuals
        .where('projectId')
        .equals(projectId)
        .toArray();
      console.log(`[ActualsStore] Found ${actuals.length} actuals for project ${projectId}`);
      return actuals;
    } catch (error) {
      console.error(`[ActualsStore] Error loading actuals for project ${projectId}:`, error);
      return [];
    }
  },

  addActual: async (actual: Omit<ActualsPeriodEntry, 'id'>) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      const now = new Date();
      const newActual = {
        ...actual
      };

      const id = await db.actuals.add(newActual as ActualsPeriodEntry);

      // Refresh the actuals list
      await get().loadActuals(actual.projectId);

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));

      return id;
    } catch (error) {
      console.error('Error adding actual:', error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to add actual: ${error}` }
      }));
      throw error;
    }
  },

  updateActual: async (id: number, updates: Partial<ActualsPeriodEntry>) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      // Get the actual to know which project it belongs to
      const actual = await db.actuals.get(id);
      if (!actual) {
        throw new Error(`Actual with ID ${id} not found`);
      }

      const updatedActual = {
        ...updates
      };

      await db.actuals.update(id, updatedActual);

      // Refresh the actuals list
      await get().loadActuals(actual.projectId);

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error updating actual ${id}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to update actual: ${error}` }
      }));
      throw error;
    }
  },

  deleteActual: async (id: number) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      // Get the actual to know which project it belongs to
      const actual = await db.actuals.get(id);
      if (!actual) {
        throw new Error(`Actual with ID ${id} not found`);
      }

      // Delete the actual
      await db.actuals.delete(id);

      // Refresh the actuals list
      await get().loadActuals(actual.projectId);

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error deleting actual ${id}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to delete actual: ${error}` }
      }));
      throw error;
    }
  },

  getActualsForPeriod: async (projectId: number, period: number): Promise<ActualsPeriodEntry | undefined> => {
    try {
      // First check if we already have the actuals loaded
      let { actuals } = get();

      // If not, load them
      if (actuals.length === 0) {
        actuals = await get().loadActuals(projectId);
      }

      // Find the actual for the specified period
      return actuals.find(a => a.projectId === projectId && a.period === period);
    } catch (error) {
      console.error(`Error getting actuals for period ${period}:`, error);
      return undefined;
    }
  }
});
