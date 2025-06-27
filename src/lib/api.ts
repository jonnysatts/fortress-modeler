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
    const projects = await this.request<Project[]>(`/api/projects`);
    return projects.map(normalizeProject);
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const newProject = await this.request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(projectData) });
    return normalizeProject(newProject);
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
    const models = await this.request<FinancialModel[]>(`/api/projects/${projectId}/models`);
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