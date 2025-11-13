import {
  db,
  FinancialModel,
  Project,
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
} from './db';
import { ActualsPeriodEntry } from '@/types/models';
import { cache, cacheKeys, cacheHelpers } from './cache';
import { performanceMonitor } from './performance';

class StorageService {
  // --- Project Methods ---
  async getProject(projectId: string): Promise<Project | undefined> {
    const cacheKey = cacheKeys.project(projectId);
    const cached = cache.get<Project>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const project = await getProject(projectId);
    if (project) {
      cache.set(cacheKey, project, 10 * 60 * 1000); // Cache for 10 minutes
    }
    
    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    const cacheKey = 'projects:all';
    const cached = cache.get<Project[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const projects = await performanceMonitor.measureDatabaseQuery(
      'getAllProjects',
      () => db.projects.toArray()
    );
    cache.set(cacheKey, projects, 5 * 60 * 1000); // Cache for 5 minutes
    
    return projects;
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return performanceMonitor.measureDatabaseQuery(
      'createProject',
      async () => {
        // Use the proper createProject function that sets UUID, createdAt, and updatedAt
        const newProjectId = await createProject(projectData as Omit<Project, 'id' | 'createdAt' | 'updatedAt'>);
        const createdProject = await db.projects.get(newProjectId);
        if (!createdProject) {
          throw new Error(`Failed to retrieve created project with ID: ${newProjectId}`);
        }
        
        // Invalidate projects cache
        cache.delete('projects:all');
        
        return createdProject;
      }
    );
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
    await updateProject(projectId, projectData);
    const updated = await getProject(projectId);
    if (!updated) {
      throw new Error(`Failed to retrieve updated project with ID: ${projectId}`);
    }
    
    // Invalidate caches
    cacheHelpers.invalidateProject(projectId);
    cache.delete('projects:all');
    
    return updated;
  }

  async deleteProject(projectId: string): Promise<void> {
    await deleteProject(projectId);
    
    // Invalidate caches
    cacheHelpers.invalidateProject(projectId);
    cache.delete('projects:all');
  }

  // --- Model Methods ---
  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    const cacheKey = cacheKeys.projectModels(projectId);
    const cached = cache.get<FinancialModel[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const models = await performanceMonitor.measureDatabaseQuery(
      `getModelsForProject:${projectId}`,
      () => getModelsForProject(projectId)
    );
    cache.set(cacheKey, models, 5 * 60 * 1000); // Cache for 5 minutes
    
    return models;
  }

  async getModel(modelId: string): Promise<FinancialModel | undefined> {
    const cacheKey = cacheKeys.model(modelId);
    const cached = cache.get<FinancialModel>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const model = await getModelById(modelId);
    if (model) {
      cache.set(cacheKey, model, 10 * 60 * 1000); // Cache for 10 minutes
    }
    
    return model;
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    return performanceMonitor.measureDatabaseQuery(
      'createModel',
      async () => {
        const newModelId = await addFinancialModel(modelData as Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>);
        const createdModel = await db.financialModels.get(newModelId);
        if (!createdModel) {
          throw new Error(`Failed to retrieve created model with ID: ${newModelId}`);
        }
        
        // Invalidate caches
        if (createdModel.projectId) {
          cache.delete(cacheKeys.projectModels(createdModel.projectId));
        }
        
        return createdModel;
      }
    );
  }

  async updateModel(modelId: string, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    await updateFinancialModel(modelId, modelData);
    const updated = await getModelById(modelId);
    if (!updated) {
      throw new Error(`Failed to retrieve updated model with ID: ${modelId}`);
    }
    
    // Invalidate caches
    cacheHelpers.invalidateModel(modelId, updated.projectId);
    
    return updated;
  }

  async deleteModel(modelId: string): Promise<void> {
    // Get model first to know which project to invalidate
    const model = await getModelById(modelId);
    
    await deleteFinancialModel(modelId);
    
    // Invalidate caches
    if (model) {
      cacheHelpers.invalidateModel(modelId, model.projectId);
    }
  }

  // --- Actuals Methods ---
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

export const storageService = new StorageService();