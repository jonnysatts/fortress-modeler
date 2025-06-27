import { db, FinancialModel, Project, getActualsForProject } from './db';
import { apiService } from './api';
import { config } from './config';
import useStore from '@/store/useStore';
import { ActualsPeriodEntry } from '@/types/models';

const isCloudEnabled = () => {
  if (!config.useCloudSync) return false;
  
  // Check if user is authenticated by looking for a valid token
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const { state } = JSON.parse(authData);
      return !!state.token;
    }
  } catch (error) {
    console.error("Could not parse auth token from localStorage", error);
  }
  return false;
};
const isUUID = (id: string | number): id is string => 
  typeof id === 'string' && id.includes('-') && id.length === 36;

class HybridStorageService {
  // --- Project Methods ---
  async getProject(projectId: string | number): Promise<Project | undefined> {
    if (isUUID(projectId) && isCloudEnabled()) {
      return apiService.getProject(projectId);
    }
    return db.projects.get(Number(projectId));
  }

  async getAllProjects(): Promise<Project[]> {
    if (isCloudEnabled()) {
      return apiService.getProjects();
    }
    return db.projects.toArray();
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    if (isCloudEnabled()) {
      return apiService.createProject(projectData);
    }
    // Local creation
    const newProjectId = await db.projects.add(projectData as Project);
    return (await db.projects.get(newProjectId))!;
  }

  async updateProject(projectId: string | number, projectData: Partial<Project>): Promise<Project> {
    if (isUUID(projectId) && isCloudEnabled()) {
      return apiService.updateProject(String(projectId), projectData);
    }
    await db.projects.update(Number(projectId), projectData);
    return (await db.projects.get(Number(projectId)))!;
  }

  async deleteProject(projectId: string | number): Promise<void> {
    if (isUUID(projectId) && isCloudEnabled()) {
      await apiService.deleteProject(String(projectId));
    }
    // Also delete local copy if it exists
    await db.projects.delete(Number(projectId));
  }

  // --- Model Methods ---
  async getModelsForProject(projectId: string | number): Promise<FinancialModel[]> {
    if (isUUID(projectId) && isCloudEnabled()) {
      return apiService.getModelsForProject(projectId);
    }
    return db.financialModels.where('projectId').equals(Number(projectId)).toArray();
  }

  async getModel(modelId: string | number): Promise<FinancialModel | undefined> {
    if (isUUID(modelId) && isCloudEnabled()) {
      return apiService.getModel(modelId);
    }
    // For local models, we might query by local ID or UUID if stored.
    if (isUUID(modelId)) {
        return db.financialModels.where('uuid').equals(modelId).first();
    }
    return db.financialModels.get(Number(modelId));
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    if (isCloudEnabled() && typeof modelData.projectId === 'string') { // Only use API for cloud projects
      return apiService.createModel(modelData);
    }
    const newModelId = await db.financialModels.add(modelData as FinancialModel);
    return (await db.financialModels.get(newModelId))!;
  }

  async deleteModel(modelId: string | number): Promise<void> {
    if (isUUID(modelId) && isCloudEnabled()) {
      await apiService.deleteModel(modelId);
      // Also delete from local cache if it exists
      const localModel = await db.financialModels.where('uuid').equals(modelId).first();
      if (localModel?.id) {
        await db.financialModels.delete(localModel.id);
      }
    } else {
      // For local models, delete by primary key (number)
      await db.financialModels.delete(Number(modelId));
    }
  }

  // --- Actuals Methods ---
  async getActualsForProject(projectId: string | number): Promise<ActualsPeriodEntry[]> {
    if (isUUID(projectId) && isCloudEnabled()) {
      return apiService.getActualsForProject(projectId);
    }
    // For local projects, it uses the existing getActualsForProject from db.ts
    return getActualsForProject(Number(projectId));
  }
}

export const storageService = new HybridStorageService();