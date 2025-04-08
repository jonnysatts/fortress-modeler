import { StateCreator } from 'zustand';
import { FinancialModel, db } from '@/lib/db';
import { BaseState, createInitialBaseState } from '../types';

// Define the Model Store slice
export interface ModelState extends BaseState {
  // State
  models: FinancialModel[];
  currentModel: FinancialModel | null;

  // Actions
  loadModels: (projectId?: number) => Promise<FinancialModel[]>;
  loadModelsForProject: (projectId: number) => Promise<FinancialModel[]>;
  loadModelById: (id: number) => Promise<FinancialModel | null>;
  setCurrentModel: (model: FinancialModel | null) => void;
  addModel: (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateModel: (id: number, updates: Partial<FinancialModel>) => Promise<void>;
  deleteModel: (id: number) => Promise<void>;
}

// Create the model store slice
export const createModelSlice: StateCreator<ModelState> = (set, get) => ({
  // Initial state
  ...createInitialBaseState(),
  models: [],
  currentModel: null,

  // Actions
  loadModels: async (projectId?: number) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      let models: FinancialModel[];

      if (projectId) {
        models = await db.financialModels.where('projectId').equals(projectId).toArray();
      } else {
        models = await db.financialModels.toArray();
      }

      set(state => ({
        models,
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));

      return models;
    } catch (error) {
      console.error('Error loading models:', error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to load models: ${error}` }
      }));
      return [];
    }
  },

  loadModelsForProject: async (projectId: number) => {
    try {
      console.log(`[ModelStore] Loading models for project ${projectId}`);
      const models = await db.financialModels.where('projectId').equals(projectId).toArray();
      console.log(`[ModelStore] Found ${models.length} models for project ${projectId}`);
      return models;
    } catch (error) {
      console.error(`[ModelStore] Error loading models for project ${projectId}:`, error);
      return [];
    }
  },

  loadModelById: async (id: number) => {
    try {
      set(state => ({ loading: { isLoading: true } }));
      const model = await db.financialModels.get(id);

      if (model) {
        set(state => ({
          loading: { isLoading: false },
          error: { isError: false, message: null }
        }));
        return model;
      } else {
        set(state => ({
          loading: { isLoading: false },
          error: { isError: true, message: `Model with ID ${id} not found` }
        }));
        return null;
      }
    } catch (error) {
      console.error(`Error loading model ${id}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to load model: ${error}` }
      }));
      return null;
    }
  },

  setCurrentModel: (model: FinancialModel | null) => {
    set(state => ({ currentModel: model }));
  },

  addModel: async (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      const now = new Date();
      const newModel = {
        ...model,
        createdAt: now,
        updatedAt: now
      };

      const id = await db.financialModels.add(newModel as FinancialModel);

      // Refresh the models list
      await get().loadModels(model.projectId);

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));

      return id;
    } catch (error) {
      console.error('Error adding model:', error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to add model: ${error}` }
      }));
      throw error;
    }
  },

  updateModel: async (id: number, updates: Partial<FinancialModel>) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      const updatedModel = {
        ...updates,
        updatedAt: new Date()
      };

      await db.financialModels.update(id, updatedModel);

      // Update current model if it's the one being updated
      const { currentModel } = get();
      if (currentModel && currentModel.id === id) {
        const updated = await db.financialModels.get(id);
        if (updated) {
          set(state => ({ currentModel: updated }));
        }
      }

      // Refresh the models list
      const model = await db.financialModels.get(id);
      if (model) {
        await get().loadModels(model.projectId);
      }

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error updating model ${id}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to update model: ${error}` }
      }));
      throw error;
    }
  },

  deleteModel: async (id: number) => {
    try {
      set(state => ({ loading: { isLoading: true } }));

      // Get the model to know which project it belongs to
      const model = await db.financialModels.get(id);
      const projectId = model?.projectId;

      // Delete the model
      await db.financialModels.delete(id);

      // Clear current model if it's the one being deleted
      const { currentModel } = get();
      if (currentModel && currentModel.id === id) {
        set(state => ({ currentModel: null }));
      }

      // Refresh the models list
      if (projectId) {
        await get().loadModels(projectId);
      }

      set(state => ({
        loading: { isLoading: false },
        error: { isError: false, message: null }
      }));
    } catch (error) {
      console.error(`Error deleting model ${id}:`, error);
      set(state => ({
        loading: { isLoading: false },
        error: { isError: true, message: `Failed to delete model: ${error}` }
      }));
      throw error;
    }
  }
});
