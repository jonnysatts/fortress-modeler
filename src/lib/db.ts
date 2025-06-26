import Dexie, { Table } from 'dexie';
import { MarketingSetup, ActualsPeriodEntry, ModelMetadata } from '@/types/models';
import { DatabaseError, NotFoundError, ValidationError, logError } from './errors';
import { getDemoData } from './demo-data';
import config from './config';

// Define interfaces for our database tables
export interface Project {
  id?: number | string;
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
  // Sharing and visibility fields
  is_public?: boolean;
  shared_by?: string;
  owner_email?: string;
  share_count?: number;
  permission?: 'owner' | 'view' | 'edit';
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

export const getProject = async (id: number | string): Promise<Project | undefined> => {
  try {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!idNum || isNaN(idNum) || idNum <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }
    const project = await db.projects.get(idNum);
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

export const updateProject = async (id: number | string, project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> => {
  try {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!idNum || isNaN(idNum) || idNum <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }

    const existingProject = await db.projects.get(idNum);
    if (!existingProject) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }

    const updatedCount = await db.projects.update(idNum, { ...project, updatedAt: new Date() });
    if (updatedCount === 0) {
      throw new DatabaseError('Failed to update project - no changes made');
    }

    return idNum;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'updateProject');
    throw new DatabaseError(`Failed to update project with ID ${id}`, error);
  }
};

export const deleteProject = async (id: number | string): Promise<void> => {
  try {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!idNum || isNaN(idNum) || idNum <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }

    const existingProject = await db.projects.get(idNum);
    if (!existingProject) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }

    // Use transaction for atomicity
    await db.transaction('rw', [db.projects, db.financialModels, db.actualPerformance, db.risks, db.scenarios, db.actuals], async () => {
      await db.projects.delete(idNum);
      await db.financialModels.where('projectId').equals(idNum).delete();
      await db.actualPerformance.where('projectId').equals(idNum).delete();
      await db.risks.where('projectId').equals(idNum).delete();
      await db.scenarios.where('projectId').equals(idNum).delete();
      await db.actuals.where('projectId').equals(idNum).delete();
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'deleteProject');
    throw new DatabaseError(`Failed to delete project with ID ${id}`, error);
  }
};

export const getModelsForProject = async (projectId: number | string): Promise<FinancialModel[]> => {
  const idNum = typeof projectId === 'string' ? parseInt(projectId, 10) : projectId;
  if (!idNum || isNaN(idNum) || idNum <= 0) {
    throw new ValidationError('Invalid project ID provided');
  }
  return await db.financialModels.where('projectId').equals(idNum).toArray();
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

// Financial Model operations
export const getModelById = async (id: number): Promise<FinancialModel | undefined> => {
  try {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError('Invalid model ID provided');
    }
    return await db.financialModels.get(id);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'getModelById');
    throw new DatabaseError(`Failed to fetch model with ID ${id}`, error);
  }
};

export const addFinancialModel = async (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
  try {
    if (!model.projectId || isNaN(model.projectId) || model.projectId <= 0) {
      throw new ValidationError('Invalid project ID provided');
    }
    if (!model.name?.trim()) {
      throw new ValidationError('Model name is required');
    }

    const timestamp = new Date();
    const modelId = await db.financialModels.add({
      ...model,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return modelId;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'addFinancialModel');
    throw new DatabaseError('Failed to create financial model', error);
  }
};

export const updateFinancialModel = async (id: number, updates: Partial<Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> => {
  try {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError('Invalid model ID provided');
    }

    const existingModel = await db.financialModels.get(id);
    if (!existingModel) {
      throw new NotFoundError(`Financial model with ID ${id} not found`);
    }

    const updatedCount = await db.financialModels.update(id, { ...updates, updatedAt: new Date() });
    if (updatedCount === 0) {
      throw new DatabaseError('Failed to update financial model - no changes made');
    }

    return id;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'updateFinancialModel');
    throw new DatabaseError(`Failed to update financial model with ID ${id}`, error);
  }
};

export const deleteFinancialModel = async (id: number): Promise<void> => {
  try {
    if (!id || isNaN(id) || id <= 0) {
      throw new ValidationError('Invalid model ID provided');
    }

    const existingModel = await db.financialModels.get(id);
    if (!existingModel) {
      throw new NotFoundError(`Financial model with ID ${id} not found`);
    }

    await db.financialModels.delete(id);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'deleteFinancialModel');
    throw new DatabaseError(`Failed to delete financial model with ID ${id}`, error);
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
