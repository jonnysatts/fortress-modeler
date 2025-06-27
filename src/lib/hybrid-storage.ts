import { db, FinancialModel, Project, getActualsForProject } from './db';
import { ActualsPeriodEntry } from '@/types/models';

const isUUID = (id: string | number): id is string => 
  typeof id === 'string' && id.includes('-') && id.length === 36;

class HybridStorageService {
  // --- Project Methods ---
  async getProjectLocal(projectId: string | number): Promise<Project | undefined> {
    return db.projects.get(Number(projectId));
  }

  async getAllProjectsLocal(): Promise<Project[]> {
    return db.projects.toArray();
  }

  async createProjectLocal(projectData: Partial<Project>): Promise<Project> {
    const newProjectId = await db.projects.add(projectData as Project);
    return (await db.projects.get(newProjectId))!;
  }

  async updateProjectLocal(projectId: string | number, projectData: Partial<Project>): Promise<Project> {
    await db.projects.update(Number(projectId), projectData);
    return (await db.projects.get(Number(projectId)))!;
  }

  async deleteProjectLocal(projectId: string | number): Promise<void> {
    await db.projects.delete(Number(projectId));
  }

  // --- Model Methods ---
  async getModelsForProjectLocal(projectId: string | number): Promise<FinancialModel[]> {
    return db.financialModels.where('projectId').equals(Number(projectId)).toArray();
  }

  async getModelLocal(modelId: string | number): Promise<FinancialModel | undefined> {
    if (isUUID(modelId)) {
        return db.financialModels.where('uuid').equals(modelId).first();
    }
    return db.financialModels.get(Number(modelId));
  }

  async createModelLocal(modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    const newModelId = await db.financialModels.add(modelData as FinancialModel);
    return (await db.financialModels.get(newModelId))!;
  }

  async updateModelLocal(modelId: string | number, modelData: Partial<FinancialModel>): Promise<FinancialModel> {
    if (isUUID(modelId)) {
        const localModel = await db.financialModels.where('uuid').equals(modelId).first();
        if (localModel?.id) {
            await db.financialModels.update(localModel.id, modelData);
            return (await db.financialModels.get(localModel.id))!;
        }
        throw new Error(`Model with UUID ${modelId} not found`);
    }
    await db.financialModels.update(Number(modelId), modelData);
    return (await db.financialModels.get(Number(modelId)))!;
  }

  async deleteModelLocal(modelId: string | number): Promise<void> {
    if (isUUID(modelId)) {
        const localModel = await db.financialModels.where('uuid').equals(modelId).first();
        if (localModel?.id) {
            await db.financialModels.delete(localModel.id);
        }
    } else {
        await db.financialModels.delete(Number(modelId));
    }
  }

  // --- Actuals Methods ---
  async getActualsForProjectLocal(projectId: string | number): Promise<ActualsPeriodEntry[]> {
    return getActualsForProject(Number(projectId));
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