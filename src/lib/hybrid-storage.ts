    return db.projects.get(Number(projectId));
  }

  async getAllProjects(): Promise<Project[]> {
    if (isCloudEnabled()) {
      return apiService.getProjects();
    }
    return db.projects.toArray();
  }

  async getModelsForProject(projectId: string | number): Promise<FinancialModel[]> {
    if (isUUID(projectId) && isCloudEnabled()) {
      return apiService.getModelsForProject(projectId);
    // For local projects, it uses the existing getActualsForProject from db.ts
    return getActualsForProject(Number(projectId));
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
    // In a real app, you'd also delete all child models, actuals, etc.
    // For now, we just delete the project itself.
    if (isUUID(projectId) && isCloudEnabled()) {
      // await apiService.deleteProject(String(projectId)); // Uncomment if you have a backend delete endpoint
    }
    await db.projects.delete(Number(projectId));
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    if (isCloudEnabled() && typeof modelData.projectId === 'string') { // Only use API for cloud projects
      return apiService.createModel(modelData);
    }
    const newModelId = await db.financialModels.add(modelData as FinancialModel);
    return (await db.financialModels.get(newModelId))!;
  }
}

export const storageService = new HybridStorageService();
