import type { FinancialModel, ModelAssumptions } from '@/lib/db'

export const basicAssumptions: ModelAssumptions = {
  revenue: [
    {
      name: 'Subscription Revenue',
      value: 99.99,
      type: 'recurring',
      frequency: 'monthly',
    },
    {
      name: 'One-time Setup Fee',
      value: 199.99,
      type: 'one-time',
      frequency: 'one-time',
    },
  ],
  costs: [
    {
      name: 'Server Hosting',
      value: 50.00,
      type: 'variable',
      category: 'Infrastructure',
    },
    {
      name: 'Staff Salaries',
      value: 5000.00,
      type: 'fixed',
      category: 'Personnel',
    },
  ],
  growthModel: {
    type: 'linear',
    rate: 0.05, // 5% monthly growth
  },
}

export const weeklyEventAssumptions: ModelAssumptions = {
  revenue: [
    {
      name: 'Ticket Sales',
      value: 25.00,
      type: 'per-customer',
      frequency: 'weekly',
    },
    {
      name: 'Food & Beverage',
      value: 15.00,
      type: 'per-customer',
      frequency: 'weekly',
    },
    {
      name: 'Merchandise',
      value: 8.00,
      type: 'per-customer',
      frequency: 'weekly',
    },
  ],
  costs: [
    {
      name: 'Venue Rental',
      value: 500.00,
      type: 'fixed',
      category: 'Venue',
    },
    {
      name: 'F&B Cost of Goods',
      value: 5.00,
      type: 'per-customer',
      category: 'Cost of Goods Sold',
    },
    {
      name: 'Staff Costs',
      value: 300.00,
      type: 'fixed',
      category: 'Personnel',
    },
  ],
  growthModel: {
    type: 'exponential',
    rate: 0.02, // 2% weekly growth
  },
  metadata: {
    type: 'WeeklyEvent',
    weeks: 12,
    initialWeeklyAttendance: 100,
  },
}

export const modelFixtures: FinancialModel[] = [
  {
    id: 'test-model-1',
    projectId: 'test-project-1',
    name: 'Basic SaaS Model',
    assumptions: basicAssumptions,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: 'test-model-2',
    projectId: 'test-project-1',
    name: 'Premium SaaS Model',
    assumptions: {
      ...basicAssumptions,
      revenue: [
        {
          name: 'Premium Subscription',
          value: 199.99,
          type: 'recurring',
          frequency: 'monthly',
        },
        {
          name: 'Enterprise Setup',
          value: 999.99,
          type: 'one-time',
          frequency: 'one-time',
        },
      ],
    },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-12'),
  },
  {
    id: 'test-model-3',
    projectId: 'test-project-2',
    name: 'Weekly Event Model',
    assumptions: weeklyEventAssumptions,
    createdAt: new Date('2024-02-02'),
    updatedAt: new Date('2024-02-08'),
  },
]

export const createModelFixture = (overrides: Partial<FinancialModel> = {}): FinancialModel => ({
  id: `test-model-${Date.now()}`,
  projectId: 'test-project-1',
  name: 'Test Model',
  assumptions: basicAssumptions,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})