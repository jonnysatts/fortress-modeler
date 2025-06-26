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

  // --- Model Endpoints ---
  async getModelsForProject(projectId: string): Promise<FinancialModel[]> {
    const models = await this.request<FinancialModel[]>(`/api/projects/${projectId}/models`);
    return models.map(normalizeModel);
  }

  async getModel(modelId: string): Promise<FinancialModel> {
  // --- Actuals Endpoints ---
  async getActualsForProject(projectId:string): Promise<ActualsPeriodEntry[]> {
    return this.request<ActualsPeriodEntry[]>(`/api/projects/${projectId}/actuals`);
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    const newModel = await this.request<FinancialModel>('/api/models', { method: 'POST', body: JSON.stringify(modelData) });
    return normalizeModel(newModel);
  }

  // --- Sharing Endpoints ---
  async getSharedWithMeProjects(): Promise<{ projects: Project[] }> {
    // Assuming the endpoint returns an object with a 'projects' key
    return this.request<{ projects: Project[] }>(`/api/projects/shared`);
  }

  async getPublicProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>(`/api/projects/public`);
  }
}

export const apiService = new ApiService();
