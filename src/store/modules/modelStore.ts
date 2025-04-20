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
        console.log('[ModelStore][RAW] Models loaded from IndexedDB (by projectId):', JSON.parse(JSON.stringify(models)));
      } else {
        models = await db.financialModels.toArray();
        console.log('[ModelStore][RAW] All models loaded from IndexedDB:', JSON.parse(JSON.stringify(models)));
      }

      // --- DEBUG LOG ---
      console.log('[ModelStore] Loaded models:', JSON.parse(JSON.stringify(models)));
      if (models.length > 0 && models[0].assumptions?.marketing?.channels) {
        console.log('[ModelStore] Loaded marketing channels:', models[0].assumptions.marketing.channels);
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

      // --- DEBUG LOG ---
      console.log('[ModelStore] Adding model:', JSON.parse(JSON.stringify(newModel)));
      if (newModel.assumptions?.marketing?.channels) {
        console.log('[ModelStore] Adding marketing channels:', newModel.assumptions.marketing.channels);
      }
      // Log the exact object to be saved
      console.log('[ModelStore][RAW] Object to add to IndexedDB:', JSON.parse(JSON.stringify(newModel)));

      const id = await db.financialModels.add(newModel as FinancialModel);
      console.log('[ModelStore][RAW] Model added to IndexedDB with ID:', id);

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

      // --- DEBUG LOG ---
      console.log('[ModelStore] Updating model:', JSON.parse(JSON.stringify(updatedModel)));
      if (updatedModel.assumptions?.marketing?.channels) {
        console.log('[ModelStore] Updating marketing channels:', updatedModel.assumptions.marketing.channels);
      }
      // Log the exact object to be saved
      console.log('[ModelStore][RAW] Object to update in IndexedDB:', JSON.parse(JSON.stringify(updatedModel)));

      await db.financialModels.update(id, updatedModel);
      console.log('[ModelStore][RAW] Model updated in IndexedDB with ID:', id);

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
      console.log('[ModelStore][RAW] Model deleted from IndexedDB with ID:', id);

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
