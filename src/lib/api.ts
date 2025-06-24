import { config } from './config';
import { Project, FinancialModel } from '../types/models';

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  success?: boolean;
}

class ApiService {
  private apiUrl: string;
  
  constructor() {
    this.apiUrl = config.apiUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...defaultOptions,
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'API request failed');
    }

    return data;
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/health');
  }

  async detailedHealthCheck(): Promise<any> {
    return this.request('/health/detailed');
  }

  // Projects API
  async getProjects(): Promise<{ projects: Project[]; total: number }> {
    return this.request('/api/projects');
  }

  async getProject(id: string): Promise<{ project: Project }> {
    return this.request(`/api/projects/${id}`);
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ project: Project }> {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async updateProject(id: string, project: Partial<Project>): Promise<{ project: Project }> {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Financial Models API
  async getModels(): Promise<{ models: FinancialModel[]; total: number }> {
    return this.request('/api/models');
  }

  async getModel(id: string): Promise<{ model: FinancialModel }> {
    return this.request(`/api/models/${id}`);
  }

  async createModel(model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ model: FinancialModel }> {
    return this.request('/api/models', {
      method: 'POST',
      body: JSON.stringify(model),
    });
  }

  async updateModel(id: string, model: Partial<FinancialModel>): Promise<{ model: FinancialModel }> {
    return this.request(`/api/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(model),
    });
  }

  async deleteModel(id: string): Promise<void> {
    return this.request(`/api/models/${id}`, {
      method: 'DELETE',
    });
  }

  // Sync API
  async syncData(data: {
    projects?: Project[];
    models?: FinancialModel[];
    lastSyncTimestamp?: string;
  }): Promise<{
    status: string;
    conflicts?: any[];
    syncedProjects?: Project[];
    syncedModels?: FinancialModel[];
    lastSyncTimestamp: string;
  }> {
    return this.request('/api/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSyncStatus(): Promise<{
    status: string;
    lastSync?: string;
    pendingChanges: number;
    conflicts: number;
  }> {
    return this.request('/api/sync/status');
  }

  async forceSyncAll(): Promise<{
    status: string;
    syncedProjects: Project[];
    syncedModels: FinancialModel[];
    lastSyncTimestamp: string;
  }> {
    return this.request('/api/sync/full', {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();