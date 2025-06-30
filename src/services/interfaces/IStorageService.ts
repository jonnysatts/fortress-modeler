import { Project, FinancialModel } from '@/lib/db';
import { ActualsPeriodEntry } from '@/types/models';

/**
 * Storage service interface for all data persistence operations
 * This abstraction allows for different storage implementations (Dexie, API, etc.)
 */
export interface IStorageService {
  // Project Methods
  getProject(projectId: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  createProject(projectData: Partial<Project>): Promise<Project>;
  updateProject(projectId: string, projectData: Partial<Project>): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;

  // Model Methods
  getModelsForProject(projectId: string): Promise<FinancialModel[]>;
  getModel(modelId: string): Promise<FinancialModel | undefined>;
  createModel(modelData: Partial<FinancialModel>): Promise<FinancialModel>;
  updateModel(modelId: string, modelData: Partial<FinancialModel>): Promise<FinancialModel>;
  deleteModel(modelId: string): Promise<void>;

  // Actuals Methods
  getActualsForProject(projectId: string): Promise<ActualsPeriodEntry[]>;
  upsertActualsPeriod(actualData: Omit<ActualsPeriodEntry, 'id'>): Promise<ActualsPeriodEntry>;
}