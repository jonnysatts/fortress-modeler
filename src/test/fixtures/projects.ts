import type { Project } from '@/lib/db'

export const projectFixtures: Project[] = [
  {
    id: 'test-project-1',
    name: 'E-commerce Platform',
    description: 'A comprehensive e-commerce solution',
    productType: 'Web Application',
    targetAudience: 'Online shoppers',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'test-project-2',
    name: 'Mobile Food Delivery',
    description: 'Food delivery mobile application',
    productType: 'Mobile App',
    targetAudience: 'Food enthusiasts',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'test-project-3',
    name: 'SaaS Analytics Tool',
    description: 'Business analytics and reporting tool',
    productType: 'SaaS',
    targetAudience: 'Business analysts',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-05'),
  },
]

export const createProjectFixture = (overrides: Partial<Project> = {}): Project => ({
  id: `test-project-${Date.now()}`,
  name: 'Test Project',
  description: 'A test project for unit testing',
  productType: 'Web Application',
  targetAudience: 'Test users',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})