import { db, FinancialModel, Project, getActualsForProject } from './db';
import { apiService } from './api';
import { config } from './config';
import useStore from '@/store/useStore';
import { ActualsPeriodEntry } from '@/types/models';

// Cache authentication status for 1 second to prevent excessive checks
let authCache: { value: boolean; timestamp: number } | null = null;
const AUTH_CACHE_DURATION = 1000; // 1 second

const isCloudEnabled = () => {
  if (!config.useCloudSync) {
    return false;
  }
  
  // Check cache first
  const now = Date.now();
  if (authCache && (now - authCache.timestamp) < AUTH_CACHE_DURATION) {
    return authCache.value;
  }
  
  // Check if user is authenticated by looking for auth_token in localStorage
  try {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    const hasToken = !!token;
    const hasUserData = !!userData;
    const isAuthenticated = hasToken && hasUserData;
    
    // Update cache
    authCache = { value: isAuthenticated, timestamp: now };
    
    return isAuthenticated;
  } catch (error) {
    console.error("Could not parse auth data from localStorage", error);
    authCache = { value: false, timestamp: now };
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
    const cloudEnabled = isCloudEnabled();
    console.log('📂 HybridStorage.getAllProjects - cloudEnabled:', cloudEnabled);
    
    if (cloudEnabled) {
      try {
        const cloudProjects = await apiService.getProjects();
        console.log('☁️ Loaded projects from cloud:', cloudProjects.length, 'projects');
        return cloudProjects;
      } catch (error) {
        console.error('❌ Failed to load projects from cloud:', error);
        console.log('🔄 Falling back to local projects');
      }
    }
    
    const localProjects = await db.projects.toArray();
    console.log('💾 Loaded projects from local storage:', localProjects.length, 'projects');
    return localProjects;
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const cloudEnabled = isCloudEnabled();
    console.log('🔄 HybridStorage.createProject:', {
      cloudEnabled,
      useCloudSync: config.useCloudSync,
      projectData: { name: projectData.name, productType: projectData.productType }
    });
    
    if (cloudEnabled) {
      console.log('☁️ Creating project in cloud via API');
      try {
        const result = await apiService.createProject(projectData);
        console.log('✅ Cloud project created successfully:', result);
        console.log('✅ Project properties from API:', Object.keys(result || {}));
        if (result) {
          Object.keys(result).forEach(key => {
            console.log(`✅ API property "${key}":`, result[key]);
          });
        }
        return result;
      } catch (error) {
        console.error('❌ Failed to create project in cloud:', error);
        // Fall back to local creation if cloud fails
        console.log('🔄 Falling back to local creation');
      }
    } else {
      console.log('💾 Creating project locally (cloud not enabled)');
    }
    
    // Local creation
    const newProjectId = await db.projects.add(projectData as Project);
    const localProject = await db.projects.get(newProjectId);
    console.log('✅ Local project created:', { id: localProject?.id, name: localProject?.name });
    return localProject!;
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