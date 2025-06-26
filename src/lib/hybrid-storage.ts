// Hybrid storage service that can use either local IndexedDB or cloud API
import { Project, FinancialModel } from './db';
import { config } from './config';
import { apiService } from './api';
import * as localDb from './db';

export interface StorageService {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Models
  getModelsForProject(projectId: string): Promise<FinancialModel[]>;
  getModel(id: string): Promise<FinancialModel | null>;
  createModel(model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialModel>;
  updateModel(id: string, updates: Partial<FinancialModel>): Promise<FinancialModel>;
  deleteModel(id: string): Promise<void>;

  // Sync
  syncWithCloud?(): Promise<void>;
}

class LocalStorageService implements StorageService {
  async getProjects(): Promise<Project[]> {
    return localDb.getProjects();
  }

  async getProject(id: string | number): Promise<Project | null> {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(idNum)) return null;
        const project = await localDb.getProject(idNum);
    return project || null;
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const id = await localDb.createProject(project);
    const created = await localDb.getProject(id);
    if (!created) throw new Error('Failed to create project');
    return created;
  }

  async updateProject(id: string | number, updates: Partial<Project>): Promise<Project> {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(idNum)) throw new Error('Invalid project ID');
    await localDb.updateProject(idNum, updates);
    const updated = await localDb.getProject(idNum);
    if (!updated) throw new Error('Failed to update project');
    return updated;
  }

  async deleteProject(id: string | number): Promise<void> {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(idNum)) throw new Error('Invalid project ID');
    await localDb.deleteProject(idNum);
  }

  async getModelsForProject(projectId: string | number): Promise<FinancialModel[]> {
    const idNum = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
    if (isNaN(idNum)) return [];
    return localDb.getModelsForProject(idNum);
  }

  async getModel(id: string | number): Promise<FinancialModel | null> {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(idNum)) return null;
        const model = await localDb.getModelById(idNum);
    return model || null;
  }

  async createModel(model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialModel> {
    const id = await localDb.addFinancialModel(model);
    const created = await localDb.getModelById(id);
    if (!created) throw new Error('Failed to create model');
    return created;
  }

  async updateModel(id: string | number, updates: Partial<FinancialModel>): Promise<FinancialModel> {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(idNum)) throw new Error('Invalid model ID');
    await localDb.updateFinancialModel(idNum, updates);
    const updated = await localDb.getModelById(idNum);
    if (!updated) throw new Error('Failed to update model');
    return updated;
  }

  async deleteModel(id: string | number): Promise<void> {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(idNum)) throw new Error('Invalid model ID');
    await localDb.deleteFinancialModel(idNum);
  }
}

class CloudStorageService implements StorageService {
  async getProjects(): Promise<Project[]> {
    const response = await apiService.getProjects();
    return response.projects;
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      const response = await apiService.getProject(id);
      console.log('API Response for getProject:', response);
      return response.project;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const response = await apiService.createProject(project);
    return response.project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const response = await apiService.updateProject(id, updates);
    return response.project;
  }

  async deleteProject(id: string): Promise<void> {
    await apiService.deleteProject(id);
  }

  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    // Use the backend API endpoint to get models filtered by project
    const response = await apiService.getModelsForProject(projectId);
    return response.models;
  }

  async getModel(id: string): Promise<FinancialModel | null> {
    try {
      const response = await apiService.getModel(id);
      return response.model;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createModel(model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialModel> {
    const response = await apiService.createModel(model);
    return response.model;
  }

  async updateModel(id: string, updates: Partial<FinancialModel>): Promise<FinancialModel> {
    const response = await apiService.updateModel(id, updates);
    return response.model;
  }

  async deleteModel(id: string): Promise<void> {
    await apiService.deleteModel(id);
  }

  async syncWithCloud(): Promise<void> {
    // This is already the cloud service, so sync is automatic
    console.log('Cloud storage service - sync not needed');
  }
}

class HybridStorageService implements StorageService {
  private local = new LocalStorageService();
  private cloud = new CloudStorageService();

  async getProjects(): Promise<Project[]> {
    try {
      // Try cloud first, fallback to local
      return await this.cloud.getProjects();
    } catch (error) {
      console.warn('Cloud storage unavailable, falling back to local:', error);
      return await this.local.getProjects();
    }
  }

  async getProject(id: string): Promise<Project | null> {
    try {
      return await this.cloud.getProject(id);
    } catch (error) {
      console.warn('Cloud storage unavailable, checking if local fallback is possible:', error);
      // Only fallback to local storage for numeric IDs (not UUIDs)
      const numericId = typeof id === 'string' ? parseInt(id, 10) : NaN;
      if (!isNaN(numericId) && numericId > 0) {
        console.log('Falling back to local storage for numeric ID:', numericId);
        return await this.local.getProject(numericId);
      } else {
        console.log('Cannot fallback to local storage for UUID:', id);
        throw error; // Re-throw the original cloud error for UUID projects
      }
    }
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const cloudProject = await this.cloud.createProject(project);
      // Also save locally for offline access when ID is numeric
      try {
        if (cloudProject.id !== undefined) {
          const idNum = typeof cloudProject.id === 'string' ? parseInt(cloudProject.id, 10) : cloudProject.id;
          if (!isNaN(idNum)) {
            await this.local.createProject({ ...project, id: idNum } as any);
          }
        }
      } catch (localError) {
        console.warn('Failed to save to local storage:', localError);
      }
      return cloudProject;
    } catch (error) {
      console.warn('Cloud storage unavailable, saving locally:', error);
      return await this.local.createProject(project);
    }
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      const updated = await this.cloud.updateProject(id, updates);
      // Also update locally when ID is numeric
      try {
        const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
        if (!isNaN(idNum)) {
          await this.local.updateProject(idNum, updates);
        }
      } catch (localError) {
        console.warn('Failed to update local storage:', localError);
      }
      return updated;
    } catch (error) {
      console.warn('Cloud storage unavailable, updating locally:', error);
      return await this.local.updateProject(id, updates);
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await this.cloud.deleteProject(id);
      // Also delete locally when ID is numeric
      try {
        const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
        if (!isNaN(idNum)) {
          await this.local.deleteProject(idNum);
        }
      } catch (localError) {
        console.warn('Failed to delete from local storage:', localError);
      }
    } catch (error) {
      console.warn('Cloud storage unavailable, deleting locally:', error);
      await this.local.deleteProject(id);
    }
  }

  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    try {
      return await this.cloud.getModelsForProject(projectId);
    } catch (error) {
      console.warn('Cloud storage unavailable, falling back to local:', error);
      return await this.local.getModelsForProject(projectId);
    }
  }

  async getModel(id: string): Promise<FinancialModel | null> {
    try {
      return await this.cloud.getModel(id);
    } catch (error) {
      console.warn('Cloud storage unavailable, falling back to local:', error);
      return await this.local.getModel(id);
    }
  }

  async createModel(model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialModel> {
    try {
      const cloudModel = await this.cloud.createModel(model);
      // Also save locally
      try {
        if (cloudModel.id !== undefined) {
          const idNum = typeof cloudModel.id === 'string' ? parseInt(cloudModel.id, 10) : cloudModel.id;
          if (!isNaN(idNum)) {
            await this.local.createModel({ ...model, id: idNum } as any);
          }
        }
      } catch (localError) {
        console.warn('Failed to save to local storage:', localError);
      }
      return cloudModel;
    } catch (error) {
      console.warn('Cloud storage unavailable, saving locally:', error);
      return await this.local.createModel(model);
    }
  }

  async updateModel(id: string, updates: Partial<FinancialModel>): Promise<FinancialModel> {
    try {
      const updated = await this.cloud.updateModel(id, updates);
      // Also update locally
      try {
        const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
        if (!isNaN(idNum)) {
          await this.local.updateModel(idNum, updates);
        }
      } catch (localError) {
        console.warn('Failed to update local storage:', localError);
      }
      return updated;
    } catch (error) {
      console.warn('Cloud storage unavailable, updating locally:', error);
      return await this.local.updateModel(id, updates);
    }
  }

  async deleteModel(id: string): Promise<void> {
    try {
      await this.cloud.deleteModel(id);
      // Also delete locally
      try {
        const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
        if (!isNaN(idNum)) {
          await this.local.deleteModel(idNum);
        }
      } catch (localError) {
        console.warn('Failed to delete from local storage:', localError);
      }
    } catch (error) {
      console.warn('Cloud storage unavailable, deleting locally:', error);
      await this.local.deleteModel(id);
    }
  }

  async syncWithCloud(): Promise<void> {
    try {
      // Get all local data
      const localProjects = await this.local.getProjects();
      const localModels: FinancialModel[] = [];
      
      for (const project of localProjects) {
        if (project.id !== undefined) {
          const models = await this.local.getModelsForProject(project.id.toString());
          localModels.push(...models);
        }
      }

      // Sync with cloud
      const response = await apiService.syncData({
        projects: localProjects,
        models: localModels,
        lastSyncTimestamp: localStorage.getItem('lastSyncTimestamp') || undefined,
      });

      // Update local storage with synced data
      if (response.syncedProjects) {
        for (const project of response.syncedProjects) {
          try {
            if (project.id !== undefined) {
              const idNum = typeof project.id === 'string' ? parseInt(project.id, 10) : project.id;
              if (!isNaN(idNum)) {
                await this.local.updateProject(idNum, project);
              }
            }
          } catch (error) {
            console.warn('Failed to update local project:', project.id, error);
          }
        }
      }

      if (response.syncedModels) {
        for (const model of response.syncedModels) {
          try {
            if (model.id !== undefined) {
              const idNum = typeof model.id === 'string' ? parseInt(model.id, 10) : model.id;
              if (!isNaN(idNum)) {
                await this.local.updateModel(idNum, model);
              }
            }
          } catch (error) {
            console.warn('Failed to update local model:', model.id, error);
          }
        }
      }

      // Store last sync timestamp
      localStorage.setItem('lastSyncTimestamp', response.lastSyncTimestamp);

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }
}

// Create the appropriate storage service based on configuration
function createStorageService(): StorageService {
  if (config.useCloudSync) {
    return new HybridStorageService();
  } else {
    return new LocalStorageService();
  }
}

export const storageService = createStorageService();