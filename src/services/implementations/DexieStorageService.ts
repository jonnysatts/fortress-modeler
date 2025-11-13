import { IStorageService } from '../interfaces/IStorageService';
import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';
import {
  db,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getModelsForProject,
  getModelById,
  addFinancialModel,
  updateFinancialModel,
  deleteFinancialModel,
  getActualsForProject,
  upsertActualsPeriod,
} from '@/lib/db';

/**
 * Dexie-based implementation of the storage service
 * This is the current production implementation using IndexedDB
 */
export class DexieStorageService implements IStorageService {
  // Project Methods
  async getProject(projectId: string): Promise<Project | undefined> {
    return getProject(projectId);
  }

  async getAllProjects(): Promise<Project[]> {
    return db.projects.toArray();
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const newProjectId = await createProject(projectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
    const createdProject = await db.projects.get(newProjectId);
    if (!createdProject) {
      throw new Error(`Failed to retrieve created project with ID: ${newProjectId}`);
    }
    return createdProject;
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
    await updateProject(projectId, projectData);
    const updated = await getProject(projectId);
    if (!updated) {
      throw new Error(`Failed to retrieve updated project with ID: ${projectId}`);
    }
    return updated;
  }

  async deleteProject(projectId: string): Promise<void> {
    await deleteProject(projectId);
  }

  // Model Methods
  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    console.log('🔧 DexieStorageService.getModelsForProject called with projectId:', projectId, 'typeof:', typeof projectId);
    const models = await getModelsForProject(projectId);
    console.log('🔧 DexieStorageService.getModelsForProject found models:', models);
    
    // Debug: Also get ALL models to see what's actually stored
    const allModels = await db.financialModels.toArray();
    console.log('🔧 ALL models in database:', allModels);
    console.log('🔧 Project IDs in database:', allModels.map(m => `${m.projectId} (${typeof m.projectId})`));
    
    return models;
  }

  async getModel(modelId: string): Promise<FinancialModel | undefined> {
    return getModelById(modelId);
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    console.log('🔧 DexieStorageService.createModel called with:', modelData);
    try {
      const newModelId = await addFinancialModel(modelData as Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>);
      console.log('🔧 addFinancialModel returned ID:', newModelId);
      const createdModel = await db.financialModels.get(newModelId);
      console.log('🔧 Retrieved created model:', createdModel);
      if (!createdModel) {
        throw new Error(`Failed to retrieve created model with ID: ${newModelId}`);
      }
      return createdModel;
    } catch (error) {
      console.error('❌ DexieStorageService.createModel failed:', error);
      throw error;
    }
  }

  async updateModel(modelId: string, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    await updateFinancialModel(modelId, modelData);
    const updated = await getModelById(modelId);
    if (!updated) {
      throw new Error(`Failed to retrieve updated model with ID: ${modelId}`);
    }
    return updated;
  }

  async deleteModel(modelId: string): Promise<void> {
    await deleteFinancialModel(modelId);
  }

  // Actuals Methods
  async getActualsForProject(projectId: string): Promise<ActualsPeriodEntry[]> {
    return getActualsForProject(projectId);
  }

  async upsertActualsPeriod(actualData: Omit<ActualsPeriodEntry, 'id'>): Promise<ActualsPeriodEntry> {
    const actualId = await upsertActualsPeriod(actualData);
    const created = await db.actuals.get(actualId);
    if (!created) {
      throw new Error(`Failed to retrieve upserted actual with ID: ${actualId}`);
    }
    return created;
  }
}