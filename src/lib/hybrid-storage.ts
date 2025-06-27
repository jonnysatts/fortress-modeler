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
}

export const storageService = new HybridStorageService();