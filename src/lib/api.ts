import { config } from './config';
import { FinancialModel, ActualsPeriodEntry, Project } from '@/types/models';
import { normalizeModel, normalizeProject } from './normalizeProject';

// A helper function to get the auth token.
// In a real app, this would come from your auth context or secure storage.
const getAuthToken = (): string | null => {
  try {
    const token = localStorage.getItem('auth_token');
    return token;
  } catch (error) {
    console.error("Could not get auth token from localStorage", error);
  }
  return null;
};

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});
    headers.append('Content-Type', 'application/json');
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `${response.status} ${response.statusText}` }));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // --- Project Endpoints ---
  async getProject(projectId: string): Promise<Project> {
    const project = await this.request<Project>(`/api/projects/${projectId}`);
    return normalizeProject(project);
  }

  async getProjects(): Promise<Project[]> {
    const response = await this.request<any>(`/api/projects`);
    console.log('🔍 API getProjects response:', response);
    
    // Handle different response formats
    let projects: any[];
    if (Array.isArray(response)) {
      projects = response;
    } else if (response && Array.isArray(response.projects)) {
      projects = response.projects;
    } else if (response && Array.isArray(response.data)) {
      projects = response.data;
    } else {
      console.error('❌ Unexpected API response format:', response);
      throw new Error('Invalid projects response format');
    }
    
    console.log('📊 Processing', projects.length, 'projects from API');
    return projects.map(normalizeProject);
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const response = await this.request<any>('/api/projects', { method: 'POST', body: JSON.stringify(projectData) });
    console.log('🔍 API createProject response:', response);
    
    // Handle wrapped response format
    let project: any;
    if (response && response.project) {
      project = response.project;
    } else if (Array.isArray(response)) {
      project = response[0]; // In case it's an array
    } else {
      project = response; // Direct project object
    }
    
    console.log('📦 Extracted project from response:', project);
    return normalizeProject(project);
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<Project> {
    const updatedProject = await this.request<Project>(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(projectData) });
    return normalizeProject(updatedProject);
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.request<void>(`/api/projects/${projectId}`, { method: 'DELETE' });
  }

  // --- Model Endpoints ---
  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    const response = await this.request<any>(`/api/projects/${projectId}/models`);
    console.log('🔍 API getModelsForProject response:', response);
    
    // Handle wrapped response format
    let models: any[];
    if (Array.isArray(response)) {
      models = response;
    } else if (response && Array.isArray(response.models)) {
      models = response.models;
    } else {
      console.error('❌ Unexpected models response format:', response);
      return [];
    }
    
    return models.map(normalizeModel);
  }

  async getModel(modelId: string): Promise<FinancialModel> {
    const model = await this.request<FinancialModel>(`/api/models/${modelId}`);
    return normalizeModel(model);
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    const newModel = await this.request<FinancialModel>('/api/models', { method: 'POST', body: JSON.stringify(modelData) });
    return normalizeModel(newModel);
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.request<void>(`/api/models/${modelId}`, { method: 'DELETE' });
  }

  // --- Actuals Endpoints ---
  async getActualsForProject(projectId: string): Promise<ActualsPeriodEntry[]> {
    return this.request<ActualsPeriodEntry[]>(`/api/projects/${projectId}/actuals`);
  }

  // --- Sharing Endpoints ---
  async getSharedWithMeProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>(`/api/projects/shared`);
  }

  async getPublicProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>(`/api/projects/public`);
  }
}

export const apiService = new ApiService();