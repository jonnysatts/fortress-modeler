import {
  db,
  FinancialModel,
  Project,
  getProject,
  updateProject,
  deleteProject,
  getModelsForProject,
  getModelById,
  addFinancialModel,
  updateFinancialModel,
  deleteFinancialModel,
  getActualsForProject,
} from './db';
import { ActualsPeriodEntry } from '@/types/models';

class HybridStorageService {
  // --- Project Methods ---
  async getProjectLocal(projectId: string | number): Promise<Project | undefined> {
    return getProject(projectId);
  }

  async getAllProjectsLocal(): Promise<Project[]> {
    return db.projects.toArray();
  }

  async createProjectLocal(projectData: Partial<Project>): Promise<Project> {
    const newProjectId = await db.projects.add(projectData as Project);
    return (await db.projects.get(newProjectId))!;
  }

  async updateProjectLocal(projectId: string | number, projectData: Partial<Project>): Promise<Project> {
    await updateProject(projectId, projectData);
    const updated = await getProject(projectId);
    return updated!;
  }

  async deleteProjectLocal(projectId: string | number): Promise<void> {
    await deleteProject(projectId);
  }

  // --- Model Methods ---
  async getModelsForProjectLocal(projectId: string | number): Promise<FinancialModel[]> {
    return getModelsForProject(projectId);
  }

  async getModelLocal(modelId: string | number): Promise<FinancialModel | undefined> {
    return getModelById(modelId);
  }

  async createModelLocal(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    const newModelId = await db.financialModels.add(modelData as FinancialModel);
    return (await db.financialModels.get(newModelId))!;
  }

  async updateModelLocal(modelId: string | number, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    await updateFinancialModel(modelId, modelData);
    const updated = await getModelById(modelId);
    return updated!;
  }

  async deleteModelLocal(modelId: string | number): Promise<void> {
    await deleteFinancialModel(modelId);
  }

  // --- Actuals Methods ---
  async getActualsForProjectLocal(projectId: string | number): Promise<ActualsPeriodEntry[]> {
    return getActualsForProject(projectId);
  }

  // --- Backward Compatibility Aliases ---
  async getProject(projectId: string | number): Promise<Project | undefined> {
    return this.getProjectLocal(projectId);
  }

  async getAllProjects(): Promise<Project[]> {
    return this.getAllProjectsLocal();
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return this.createProjectLocal(projectData);
  }

  async updateProject(projectId: string | number, projectData: Partial<Project>): Promise<Project> {
    return this.updateProjectLocal(projectId, projectData);
  }

  async deleteProject(projectId: string | number): Promise<void> {
    return this.deleteProjectLocal(projectId);
  }

  async getModelsForProject(projectId: string | number): Promise<FinancialModel[]> {
    return this.getModelsForProjectLocal(projectId);
  }

  async getModel(modelId: string | number): Promise<FinancialModel | undefined> {
    return this.getModelLocal(modelId);
  }

  async createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    return this.createModelLocal(modelData);
  }

  async updateModel(modelId: string | number, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    return this.updateModelLocal(modelId, modelData);
  }

  async deleteModel(modelId: string | number): Promise<void> {
    return this.deleteModelLocal(modelId);
  }

  async getActualsForProject(projectId: string | number): Promise<ActualsPeriodEntry[]> {
    return this.getActualsForProjectLocal(projectId);
  }
}

export const storageService = new HybridStorageService();
