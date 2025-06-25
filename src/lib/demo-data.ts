import { Project, FinancialModel } from './db';

export interface DemoData {
  project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
  financialModel: Omit<FinancialModel, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;
}

export const getDemoData = (): DemoData => {
  const currentDate = new Date();
  const nextYear = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));

  return {
    project: {
      name: "SaaS Marketing Platform",
      description: "A cloud-based marketing automation platform for small businesses",
      productType: "SaaS",
      targetAudience: "Small and medium businesses with marketing teams of 1-5 people",
      timeline: {
        startDate: new Date(),
        endDate: nextYear
      }
    },
    financialModel: {
      name: "Q1 2024 Launch Model",
      description: "Revenue and cost projections for the first quarter of 2024",
      assumptions: {
        revenue: [
          {
            name: "Subscription Revenue",
            value: 25000,
            type: "recurring",
            frequency: "monthly"
          },
          {
            name: "Implementation Fees",
            value: 5000,
            type: "fixed",
            frequency: "one-time"
          },
          {
            name: "Training Services",
            value: 2000,
            type: "variable",
            frequency: "monthly"
          }
        ],
        costs: [
          {
            name: "Cloud Infrastructure",
            value: 3000,
            type: "variable",
            category: "operations"
          },
          {
            name: "Development Team",
            value: 15000,
            type: "fixed",
            category: "staffing"
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
      }
    }
  };
};