import { config } from './config';
import { FinancialModel, ActualsPeriodEntry, Project } from '@/types/models';
import { normalizeModel, normalizeProject } from './normalizeProject';

// A helper function to get the auth token.
// In a real app, this would come from your auth context or secure storage.
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const { state } = JSON.parse(authData);
      return state.token;
    }
  } catch (error) {
    console.error("Could not parse auth token from localStorage", error);
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

  // --- Model Endpoints ---
  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    const models = await this.request<FinancialModel[]>(`/api/projects/${projectId}/models`);
    return models.map(normalizeModel);
  }

  async getModel(modelId: string): Promise<FinancialModel> {
    const model = await this.request<FinancialModel>(`/api/models/${modelId}`);
    return normalizeModel(model);
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.request<void>(`/api/models/${modelId}`, { method: 'DELETE' });
  }

  // --- Actuals Endpoints ---
  async getActualsForProject(projectId:string): Promise<ActualsPeriodEntry[]> {
    return this.request<ActualsPeriodEntry[]>(`/api/projects/${projectId}/actuals`);
  }
}

export const apiService = new ApiService();