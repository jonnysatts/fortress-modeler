import Dexie, { Table } from 'dexie';
import { MarketingSetup, ActualsPeriodEntry, ModelMetadata } from '@/types/models';
import { DatabaseError, NotFoundError, ValidationError, logError } from './errors';
import { getDemoData } from './demo-data';
import config from './config';
import { isUUID } from './utils';

// Define interfaces for our database tables
export interface Project {
  id: string; // UUID primary key
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
  id: string; // UUID primary key
  projectId: string; // Project UUID reference
  name: string;
  isPrimary?: boolean; // Whether this model is used for dashboard projections
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
  id: string; // UUID primary key
  projectId: string; // Project UUID reference
  date: Date;
  metrics: {
    [key: string]: number;
  };
  notes?: string;
}

export interface Risk {
  id: string; // UUID primary key
  projectId: string; // Project UUID reference
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
  id: string; // UUID primary key
  projectId: string; // Project UUID reference
  modelId: string; // Model UUID reference
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
  projects!: Table<Project, string>;
  financialModels!: Table<FinancialModel, string>;
  actualPerformance!: Table<ActualPerformance, string>;
  risks!: Table<Risk, string>;
  scenarios!: Table<Scenario, string>;
  actuals!: Table<ActualsPeriodEntry, string>;

  constructor() {
    super('FortressDB');

    this.version(5).stores({
      projects: '++id, &uuid, name, productType, createdAt, updatedAt',
      financialModels: '++id, &uuid, projectId, name, createdAt, updatedAt',
      actualPerformance: '++id, projectId, date',
      risks: '++id, projectId, type, likelihood, impact, status',
      scenarios: '++id, projectId, modelId, name, createdAt',
      actuals: '++id, &[projectId+period], projectId, period'
    });

    this.version(6).stores({
      projects: '++id, &uuid, name, productType, createdAt, updatedAt',
      financialModels: '++id, &uuid, projectId, name, createdAt, updatedAt',
      actualPerformance: '++id, projectId, date',
      risks: '++id, projectId, type, likelihood, impact, status',
      scenarios: '++id, projectId, modelId, name, createdAt',
      actuals: '++id, &[projectId+period], projectId, period'
    }).upgrade(async tx => {
      console.log('🔧 Upgrading to version 6: Ensuring UUID consistency');
      
      // Fix any projects missing UUID field
      const projectsToFix = await tx.table('projects').toArray();
      for (const project of projectsToFix) {
        if (!project.uuid) {
          await tx.table('projects').update(project.id!, {
            uuid: crypto.randomUUID()
          });
        }
      }
      
      // Fix any models missing UUID field
      const modelsToFix = await tx.table('financialModels').toArray();
      for (const model of modelsToFix) {
        if (!model.uuid) {
          await tx.table('financialModels').update(model.id!, {
            uuid: crypto.randomUUID()
          });
        }
      }
    });

    this.version(7).stores({
      projects: '&id, name, productType, createdAt, updatedAt',
      financialModels: '&id, projectId, name, createdAt, updatedAt',
      actualPerformance: '&id, projectId, date',
      risks: '&id, projectId, type, likelihood, impact, status',
      scenarios: '&id, projectId, modelId, name, createdAt',
      actuals: '&id, &[projectId+period], projectId, period'
    }).upgrade(async tx => {
      console.log('🔧 Upgrading to version 7: Converting to UUID-only primary keys');
      
      try {
        // Migrate projects: use uuid as new id
        const projects = await tx.table('projects').toArray();
        await tx.table('projects').clear();
        
        for (const project of projects) {
          const newProject = {
            ...project,
            id: project.uuid || crypto.randomUUID()
          };
          delete newProject.uuid; // Remove old uuid field
          await tx.table('projects').add(newProject);
        }
        
        // Migrate financial models: use uuid as new id, update projectId references
        const models = await tx.table('financialModels').toArray();
        await tx.table('financialModels').clear();
        
        for (const model of models) {
          // Find the project this model belongs to
          const project = projects.find(p => p.id === model.projectId);
          const newModel = {
            ...model,
            id: model.uuid || crypto.randomUUID(),
            projectId: project?.uuid || project?.id || model.projectId
          };
          delete newModel.uuid; // Remove old uuid field
          await tx.table('financialModels').add(newModel);
        }
        
        // Migrate other tables - generate UUIDs for all records
        const tables = ['actualPerformance', 'risks', 'scenarios', 'actuals'];
        for (const tableName of tables) {
          const records = await tx.table(tableName).toArray();
          await tx.table(tableName).clear();
          
          for (const record of records) {
            // Find the project this record belongs to
            const project = projects.find(p => p.id === record.projectId);
            const newRecord = {
              ...record,
              id: crypto.randomUUID(),
              projectId: project?.uuid || project?.id || record.projectId
            };
            
            // Update modelId for scenarios if it exists
            if (tableName === 'scenarios' && record.modelId) {
              const model = models.find(m => m.id === record.modelId);
              newRecord.modelId = model?.uuid || model?.id || record.modelId;
            }
            
            await tx.table(tableName).add(newRecord);
          }
        }
        
        console.log('✅ Successfully migrated to UUID-only schema');
      } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
      }
    });

    this.version(4).stores({
      projects: '++id, name, productType, createdAt, updatedAt',
      financialModels: '++id, &uuid, projectId, name, createdAt, updatedAt',
      actualPerformance: '++id, projectId, date',
      risks: '++id, projectId, type, likelihood, impact, status',
      scenarios: '++id, projectId, modelId, name, createdAt',
      actuals: '++id, &[projectId+period], projectId, period'
    }).upgrade(tx => {
// Upgrade handler for schema version 4: Adds uuid to financialModels
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

export const getProject = async (
  id: string,
): Promise<Project | undefined> => {
  try {
    console.log('🔧 getProject called with UUID:', id);
    
    const result = await db.projects.get(id);
    console.log('🔧 Found project:', result);
    return result;
  } catch (error) {
    logError(error, 'getProject');
    throw new DatabaseError(`Failed to fetch project with ID ${id}`, error);
  }
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    if (!project.name?.trim()) {
      throw new ValidationError('Project name is required');
    }
    if (!project.productType?.trim()) {
      throw new ValidationError('Product type is required');
    }
    
    const timestamp = new Date();
    const id = crypto.randomUUID();
    
    console.log('🔧 Creating project with UUID:', id);
    
    await db.projects.add({
      ...project,
      id, // UUID as primary key
      createdAt: timestamp,
      updatedAt: timestamp
    });
    
    console.log('🔧 Project created with UUID:', id);
    return id;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'createProject');
    throw new DatabaseError('Failed to create project', error);
  }
};

export const updateProject = async (id: string, projectData: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<string> => {
  try {
    const existingProject = await getProject(id);
    if (!existingProject || !existingProject.id) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    const projectId = existingProject.id;

    const updatedCount = await db.projects.update(projectId, { ...projectData, updatedAt: new Date() });
    if (updatedCount === 0) {
      // No error, but can be useful to know no changes were made.
    }

    return projectId;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'updateProject');
    throw new DatabaseError(`Failed to update project with ID ${id}`, error);
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    const existingProject = await getProject(id);
    if (!existingProject || !existingProject.id) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }
    const projectId = existingProject.id;

    // Use transaction for atomicity
    await db.transaction('rw', [db.projects, db.financialModels, db.actualPerformance, db.risks, db.scenarios, db.actuals], async () => {
      await db.projects.delete(projectId);
      await db.financialModels.where('projectId').equals(projectId).delete();
      await db.actualPerformance.where('projectId').equals(projectId).delete();
      await db.risks.where('projectId').equals(projectId).delete();
      await db.scenarios.where('projectId').equals(projectId).delete();
      await db.actuals.where('projectId').equals(projectId).delete();
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'deleteProject');
    throw new DatabaseError(`Failed to delete project with ID ${id}`, error);
  }
};

export const getModelsForProject = async (projectId: string): Promise<FinancialModel[]> => {
  try {
    console.log('🔧 getModelsForProject called with:', projectId, 'type:', typeof projectId);
    
    // First, get the project to understand its actual stored ID
    const project = await getProject(projectId);
    if (!project) {
      console.log('🔧 Project not found:', projectId);
      return [];
    }
    
    console.log('🔧 Found project:', project.id);
    
    // Search models by the project's ID
    const models = await db.financialModels.where('projectId').equals(project.id).toArray();
    
    console.log('🔧 Models found:', models.length);
    
    return models;
  } catch (error) {
    logError(error, 'getModelsForProject');
    throw new DatabaseError(`Failed to get models for project ${projectId}`, error);
  }
};

export const getActualsForProject = async (projectId: string): Promise<ActualsPeriodEntry[]> => {
  const project = await getProject(projectId);
  const searchId = project?.id ?? projectId;
  return db.actuals.where({ projectId: searchId }).toArray();
};

export const upsertActualsPeriod = async (actualEntry: Omit<ActualsPeriodEntry, 'id'>): Promise<string> => {
  const project = await getProject(actualEntry.projectId);
  const searchId = project?.id ?? actualEntry.projectId;

  const existing = await db.actuals.get({
    projectId: searchId,
    period: actualEntry.period
  });

  if (existing?.id) {
    await db.actuals.update(existing.id, { ...actualEntry, projectId: searchId });
    return existing.id;
  } else {
    const id = crypto.randomUUID();
    await db.actuals.add({ ...actualEntry, id, projectId: searchId } as ActualsPeriodEntry);
    return id;
  }
};

// Financial Model operations
export const getModelById = async (
  id: string,
): Promise<FinancialModel | undefined> => {
  try {
    if (!id?.trim()) {
      throw new ValidationError('Invalid model ID provided');
    }
    
    return await db.financialModels.get(id);
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'getModelById');
    throw new DatabaseError(`Failed to fetch model with ID ${id}`, error);
  }
};

export const addFinancialModel = async (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Validate project ID
    if (!model.projectId?.trim()) {
      throw new ValidationError('Project ID is required');
    }
    if (!model.name?.trim()) {
      throw new ValidationError('Model name is required');
    }

    const timestamp = new Date();
    const id = crypto.randomUUID();
    
    await db.financialModels.add({
      ...model,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return id;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    logError(error, 'addFinancialModel');
    throw new DatabaseError('Failed to create financial model', error);
  }
};

export const updateFinancialModel = async (
  id: string,
  updates: Partial<Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<string> => {
  try {
    const model = await getModelById(id);
    if (!model || !model.id) {
      throw new NotFoundError(`Financial model with ID ${id} not found`);
    }

    const updatedCount = await db.financialModels.update(model.id, {
      ...updates,
      updatedAt: new Date(),
    });
    if (updatedCount === 0) {
      // No error, but can be useful to know no changes were made.
    }

    return model.id;
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'updateFinancialModel');
    throw new DatabaseError(`Failed to update financial model with ID ${id}`, error);
  }
};

export const deleteFinancialModel = async (id: string): Promise<void> => {
  try {
    const model = await getModelById(id);
    if (!model || !model.id) {
      throw new NotFoundError(`Financial model with ID ${id} not found`);
    }

    await db.financialModels.delete(model.id);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'deleteFinancialModel');
    throw new DatabaseError(`Failed to delete financial model with ID ${id}`, error);
  }
};

// Set a model as primary for dashboard projections
export const setPrimaryFinancialModel = async (modelId: string): Promise<void> => {
  try {
    if (!modelId?.trim()) {
      throw new ValidationError('Invalid model ID provided');
    }

    // Import dynamically to avoid circular dependencies
    const { isCloudModeEnabled } = await import('./config');
    const cloudMode = isCloudModeEnabled();

    if (cloudMode) {
      // Use Supabase for cloud mode
      const { SupabaseStorageService } = await import('@/services/implementations/SupabaseStorageService');
      const supabaseStorage = new SupabaseStorageService();
      
      // Get the model to find its project
      const model = await supabaseStorage.getModel(modelId);
      if (!model) {
        throw new NotFoundError(`Financial model with ID ${modelId} not found`);
      }

      // Get all models for the project
      const projectModels = await supabaseStorage.getModelsForProject(model.projectId);
      
      // Update all models: unset existing primary and set new primary
      for (const projectModel of projectModels) {
        if (projectModel.id === modelId) {
          await supabaseStorage.updateModel(projectModel.id, { 
            ...projectModel, 
            isPrimary: true 
          });
        } else if (projectModel.isPrimary) {
          await supabaseStorage.updateModel(projectModel.id, { 
            ...projectModel, 
            isPrimary: false 
          });
        }
      }
      
      console.log(`✅ Set model ${model.name} as primary for project ${model.projectId} (Supabase)`);
    } else {
      // Use IndexedDB for local mode
      const model = await getModelById(modelId);
      if (!model) {
        throw new NotFoundError(`Financial model with ID ${modelId} not found`);
      }

      // First, unset any existing primary model for this project
      const projectModels = await getModelsForProject(model.projectId);
      for (const projectModel of projectModels) {
        if (projectModel.isPrimary) {
          await db.financialModels.update(projectModel.id, { isPrimary: false });
        }
      }

      // Set the specified model as primary
      await db.financialModels.update(modelId, { isPrimary: true });
      
      console.log(`✅ Set model ${model.name} as primary for project ${model.projectId} (IndexedDB)`);
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
    logError(error, 'setPrimaryFinancialModel');
    throw new DatabaseError(`Failed to set primary financial model with ID ${modelId}`, error);
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
      uuid: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Add demo financial model
    await db.financialModels.add({
      ...demoData.financialModel,
      uuid: crypto.randomUUID(),
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
