import Dexie, { Table } from 'dexie';
import { MarketingSetup, ActualsPeriodEntry } from '@/types/models';
import logger from '@/utils/logger';

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
    metadata?: any; // For product-specific data
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
    }).upgrade(() => {
      logger.log("Upgrading DB schema to version 3, changing index for 'actuals' table.");
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
  return await db.projects.toArray();
};

export const getProject = async (id: number): Promise<Project | undefined> => {
  return await db.projects.get(id);
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> => {
  const timestamp = new Date();
  return await db.projects.add({
    ...project,
    createdAt: timestamp,
    updatedAt: timestamp
  });
};

export const updateProject = async (id: number, project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> => {
  await db.projects.update(id, { ...project, updatedAt: new Date() });
  return id;
};

export const deleteProject = async (id: number): Promise<void> => {
  await db.projects.delete(id);
  await db.financialModels.where('projectId').equals(id).delete();
  await db.actualPerformance.where('projectId').equals(id).delete();
  await db.risks.where('projectId').equals(id).delete();
  await db.scenarios.where('projectId').equals(id).delete();
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
  const projectCount = await db.projects.count();
  if (projectCount > 0) return;

  const projectId = await db.projects.add({
    name: "SaaS Marketing Platform",
    description: "A cloud-based marketing automation platform for small businesses",
    productType: "SaaS",
    createdAt: new Date(),
    updatedAt: new Date(),
    targetAudience: "Small and medium businesses with marketing teams of 1-5 people",
    timeline: {
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    }
  });

  const modelId = await db.financialModels.add({
    projectId,
    name: "Base Financial Model",
    assumptions: {
      revenue: [
        {
          name: "Monthly Subscription",
          value: 49.99,
          type: "recurring",
          frequency: "monthly"
        },
        {
          name: "Implementation Fee",
          value: 500,
          type: "fixed",
          frequency: "one-time"
        }
      ],
      costs: [
        {
          name: "Cloud Infrastructure",
          value: 2000,
          type: "fixed",
          category: "operations"
        },
        {
          name: "Customer Success Team",
          value: 5000,
          type: "fixed",
          category: "staffing"
        },
        {
          name: "Marketing Spend",
          value: 3000,
          type: "variable",
          category: "marketing"
        }
      ],
      growthModel: {
        type: "exponential",
        rate: 0.1
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await db.risks.bulkAdd([
    {
      projectId,
      name: "Increased Cloud Costs",
      type: "financial",
      likelihood: "medium",
      impact: "high",
      mitigation: "Negotiate long-term agreements with cloud provider",
      notes: "AWS has announced potential price increases in Q3",
      status: "identified",
      owner: "DevOps Team"
    },
    {
      projectId,
      name: "New Competitor Entry",
      type: "strategic",
      likelihood: "high",
      impact: "medium",
      mitigation: "Accelerate roadmap for differentiating features",
      notes: "Rumors of venture-backed competitor launching in 6 months",
      status: "identified",
      owner: "Product Team"
    }
  ]);

  await db.scenarios.add({
    projectId,
    modelId,
    name: "Aggressive Growth Scenario",
    description: "Assuming higher marketing spend and faster customer acquisition",
    assumptions: {
      revenue: [
        {
          name: "Monthly Subscription",
          value: 59.99,
          type: "recurring",
          frequency: "monthly"
        },
        {
          name: "Implementation Fee",
          value: 500,
          type: "fixed",
          frequency: "one-time"
        }
      ],
      costs: [
        {
          name: "Cloud Infrastructure",
          value: 3000,
          type: "fixed",
          category: "operations"
        },
        {
          name: "Customer Success Team",
          value: 8000,
          type: "fixed",
          category: "staffing"
        },
        {
          name: "Marketing Spend",
          value: 10000,
          type: "variable",
          category: "marketing"
        }
      ],
      growthModel: {
        type: "exponential",
        rate: 0.2
      }
    },
    createdAt: new Date()
  });
};
