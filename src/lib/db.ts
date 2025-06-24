import Dexie, { Table } from 'dexie';
import { MarketingSetup, ActualsPeriodEntry, ModelMetadata } from '@/types/models';
import { DatabaseError, NotFoundError, ValidationError, logError } from './errors';
import { getDemoData } from './demo-data';
import config from './config';

// Define interfaces for our database tables
export interface Project {
  id?: number;
  name: string;
  description?: string;
  productType: string;
  createdAt: Date;
  updatedAt: Date;
  targetAudience?: string;
  timeline?: {
    startDate: Date;
    endDate?: Date;
  };
  avatarImage?: string;
}

export interface FinancialModel {
  id?: number;
  projectId: number;
  name: string;
  assumptions: {
    revenue: RevenueAssumption[];
    costs: CostAssumption[];
    growthModel: GrowthModel;
    marketing?: MarketingSetup;
    metadata?: ModelMetadata; // For product-specific data
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueAssumption {
  name: string;
  value: number;
  type: 'fixed' | 'variable' | 'recurring';
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one-time';
}

export interface CostAssumption {
  name: string;
  value: number;
  type: 'fixed' | 'variable' | 'recurring';
  category: 'staffing' | 'marketing' | 'operations' | 'other';
}

export interface GrowthModel {
  type: 'linear' | 'exponential' | 'seasonal';
  rate: number;
  seasonalFactors?: number[];
  individualRates?: {
    [key: string]: number;
  };
}

export interface ActualPerformance {
  id?: number;
  projectId: number;
  date: Date;
  metrics: {
    [key: string]: number;
  };
  notes?: string;
}

export interface Risk {
  id?: number;
  projectId: number;
  name: string;
  type: 'financial' | 'operational' | 'strategic' | 'regulatory' | 'other';
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation?: string;
  notes?: string;
  status: 'identified' | 'mitigated' | 'accepted' | 'transferred';
  owner?: string;
}

export interface Scenario {
  id?: number;
  projectId: number;
  modelId: number;
  name: string;
  description?: string;
  assumptions: {
    revenue: RevenueAssumption[];
    costs: CostAssumption[];
    growthModel: GrowthModel;
  };
  createdAt: Date;
}

export class FortressDB extends Dexie {
  projects!: Table<Project, number>;
  financialModels!: Table<FinancialModel, number>;
  actualPerformance!: Table<ActualPerformance, number>;
  risks!: Table<Risk, number>;
  scenarios!: Table<Scenario, number>;
  actuals!: Table<ActualsPeriodEntry, number>;

  constructor() {
    super('FortressDB');
    this.version(3).stores({
      projects: '++id, name, productType, createdAt, updatedAt',
      financialModels: '++id, projectId, name, createdAt, updatedAt',
      actualPerformance: '++id, projectId, date',
      risks: '++id, projectId, type, likelihood, impact, status',
      scenarios: '++id, projectId, modelId, name, createdAt',
      actuals: '++id, &[projectId+period], projectId, period'
    }).upgrade(tx => {
// Upgrade handler for schema version 3: Changes index for 'actuals' table from modelId+period to projectId+period
    });
    
    this.version(2).stores({
      projects: '++id, name, productType, createdAt, updatedAt',
      financialModels: '++id, projectId, name, createdAt, updatedAt',
      actualPerformance: '++id, projectId, date',
      risks: '++id, projectId, type, likelihood, impact, status',
      scenarios: '++id, projectId, modelId, name, createdAt',
      actuals: '++id, &[modelId+period], modelId, period'
    });

    this.version(1).stores({
      projects: '++id, name, productType, createdAt, updatedAt',
      financialModels: '++id, projectId, name, createdAt, updatedAt',
      actualPerformance: '++id, projectId, date',
      risks: '++id, projectId, type, likelihood, impact, status',
      scenarios: '++id, projectId, modelId, name, createdAt'
    });
  }
}

export const db = new FortressDB();

export const getProjects = async (): Promise<Project[]> => {
  try {
    return await db.projects.toArray();
  } catch (error) {
    logError(error, 'getProjects');
    throw new DatabaseError('Failed to fetch projects', error);
  }
};

export const getProject = async (id: number): Promise<Project | undefined> => {
  try {
    if (!id || id <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }
    const project = await db.projects.get(id);
    return project;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'getProject');
    throw new DatabaseError(`Failed to fetch project with ID ${id}`, error);
  }
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
  try {
    if (!project.name?.trim()) {
      throw new ValidationError('Project name is required');
    }
    if (!project.productType?.trim()) {
      throw new ValidationError('Product type is required');
    }
    
    const timestamp = new Date();
    const projectId = await db.projects.add({
      ...project,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    return projectId;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'createProject');
    throw new DatabaseError('Failed to create project', error);
  }
};

export const updateProject = async (id: number, project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> => {
  try {
    if (!id || id <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }
    
    const existingProject = await db.projects.get(id);
    if (!existingProject) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    
    const updatedCount = await db.projects.update(id, { ...project, updatedAt: new Date() });
    if (updatedCount === 0) {
      throw new DatabaseError('Failed to update project - no changes made');
    }
    
    return id;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'updateProject');
    throw new DatabaseError(`Failed to update project with ID ${id}`, error);
  }
};

export const deleteProject = async (id: number): Promise<void> => {
  try {
    if (!id || id <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }
    
    const existingProject = await db.projects.get(id);
    if (!existingProject) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    
    // Use transaction for atomicity
    await db.transaction('rw', [db.projects, db.financialModels, db.actualPerformance, db.risks, db.scenarios, db.actuals], async () => {
      await db.projects.delete(id);
      await db.financialModels.where('projectId').equals(id).delete();
      await db.actualPerformance.where('projectId').equals(id).delete();
      await db.risks.where('projectId').equals(id).delete();
      await db.scenarios.where('projectId').equals(id).delete();
      await db.actuals.where('projectId').equals(id).delete();
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'deleteProject');
    throw new DatabaseError(`Failed to delete project with ID ${id}`, error);
  }
};

export const getModelsForProject = async (projectId: number): Promise<FinancialModel[]> => {
  return await db.financialModels.where('projectId').equals(projectId).toArray();
};

export const getActualsForProject = async (projectId: number): Promise<ActualsPeriodEntry[]> => {
  return await db.actuals.where({ projectId: projectId }).toArray();
};

export const upsertActualsPeriod = async (actualEntry: Omit<ActualsPeriodEntry, 'id'>): Promise<number> => {
  const existing = await db.actuals.get({ 
    projectId: actualEntry.projectId, 
    period: actualEntry.period 
  });
  
  if (existing?.id) {
    await db.actuals.update(existing.id, actualEntry);
    return existing.id;
  } else {
    return await db.actuals.add(actualEntry as ActualsPeriodEntry);
  }
};

export const addDemoData = async (): Promise<void> => {
  try {
    // Only add demo data if enabled in config
    if (!config.enableDemoData) {
      return;
    }

    const projectCount = await db.projects.count();
    if (projectCount > 0) return;

    const demoData = getDemoData();
    const timestamp = new Date();
    
    // Add demo project
    const projectId = await db.projects.add({
      ...demoData.project,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Add demo financial model
    await db.financialModels.add({
      ...demoData.financialModel,
      projectId,
      createdAt: timestamp,
      updatedAt: timestamp
    });

    if (config.isDevelopment) {
      console.log('Demo data added successfully');
    }
  } catch (error) {
    logError(error, 'addDemoData');
    throw new DatabaseError('Failed to add demo data', error);
  }
};
