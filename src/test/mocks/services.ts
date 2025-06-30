import { vi } from 'vitest'
import type { 
  IStorageService, 
  IErrorService, 
  ILogService, 
  IConfigService 
} from '@/services/interfaces'
import type { Project, FinancialModel, ActualsPeriodEntry } from '@/lib/db'

// Mock Storage Service
export const createMockStorageService = (): IStorageService => ({
  // Project methods
  getAllProjects: vi.fn().mockResolvedValue([]),
  getProject: vi.fn().mockResolvedValue(null),
  createProject: vi.fn().mockImplementation((project: Partial<Project>) => 
    Promise.resolve({
      id: `mock-project-${Date.now()}`,
      name: 'Mock Project',
      productType: 'Web Application',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...project,
    } as Project)
  ),
  updateProject: vi.fn().mockImplementation((id: string, updates: Partial<Project>) => 
    Promise.resolve({
      id,
      name: 'Updated Mock Project',
      productType: 'Web Application',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...updates,
    } as Project)
  ),
  deleteProject: vi.fn().mockResolvedValue(undefined),

  // Financial Model methods
  getProjectModels: vi.fn().mockResolvedValue([]),
  getModel: vi.fn().mockResolvedValue(null),
  createModel: vi.fn().mockImplementation((model: Partial<FinancialModel>) => 
    Promise.resolve({
      id: `mock-model-${Date.now()}`,
      projectId: 'mock-project-id',
      name: 'Mock Model',
      assumptions: { revenue: [], costs: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...model,
    } as FinancialModel)
  ),
  updateModel: vi.fn().mockImplementation((id: string, updates: Partial<FinancialModel>) => 
    Promise.resolve({
      id,
      projectId: 'mock-project-id',
      name: 'Updated Mock Model',
      assumptions: { revenue: [], costs: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...updates,
    } as FinancialModel)
  ),
  deleteModel: vi.fn().mockResolvedValue(undefined),

  // Actuals methods
  getProjectActuals: vi.fn().mockResolvedValue([]),
  upsertActuals: vi.fn().mockImplementation((actual: Omit<ActualsPeriodEntry, 'id'>) => 
    Promise.resolve({
      id: `mock-actual-${Date.now()}`,
      ...actual,
    } as ActualsPeriodEntry)
  ),
  deleteActuals: vi.fn().mockResolvedValue(undefined),

  // Utility methods
  clearAllData: vi.fn().mockResolvedValue(undefined),
})

// Mock Error Service
export const createMockErrorService = (): IErrorService => ({
  logError: vi.fn(),
  showErrorToUser: vi.fn(),
  showSuccessToUser: vi.fn(),
  showWarningToUser: vi.fn(),
  showInfoToUser: vi.fn(),
  getErrorMessage: vi.fn().mockReturnValue('Mock error message'),
  categorizeError: vi.fn().mockReturnValue('runtime'),
  getSeverity: vi.fn().mockReturnValue('medium'),
  handleNetworkError: vi.fn().mockResolvedValue(undefined),
  reportToRemoteService: vi.fn().mockResolvedValue(undefined),
})

// Mock Log Service
export const createMockLogService = (): ILogService => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn().mockReturnValue('debug'),
})

// Mock Config Service
export const createMockConfigService = (): IConfigService => ({
  isDevelopment: vi.fn().mockReturnValue(true),
  isProduction: vi.fn().mockReturnValue(false),
  getApiUrl: vi.fn().mockReturnValue('http://localhost:3000/api'),
  getAppName: vi.fn().mockReturnValue('Fortress Modeler'),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  getFeatureFlag: vi.fn().mockReturnValue(false),
  getAllConfig: vi.fn().mockReturnValue({
    NODE_ENV: 'test',
    API_URL: 'http://localhost:3000/api',
    APP_NAME: 'Fortress Modeler',
    VERSION: '1.0.0',
  }),
})

// Service container mock
export const createMockServiceContainer = () => {
  const services = new Map()
  
  const mockContainer = {
    register: vi.fn((token: string, factory: () => any, singleton = false) => {
      if (singleton) {
        const instance = factory()
        services.set(token, () => instance)
      } else {
        services.set(token, factory)
      }
    }),
    registerInstance: vi.fn((token: string, instance: any) => {
      services.set(token, () => instance)
    }),
    resolve: vi.fn((token: string) => {
      const factory = services.get(token)
      if (!factory) {
        throw new Error(`Service not found: ${token}`)
      }
      return factory()
    }),
    clear: vi.fn(() => {
      services.clear()
    }),
  }

  // Pre-register default mocks
  mockContainer.registerInstance('STORAGE_SERVICE', createMockStorageService())
  mockContainer.registerInstance('ERROR_SERVICE', createMockErrorService())
  mockContainer.registerInstance('LOG_SERVICE', createMockLogService())
  mockContainer.registerInstance('CONFIG_SERVICE', createMockConfigService())

  return mockContainer
}

// Test utilities for service mocking
export const setupServiceMocks = () => {
  const mockContainer = createMockServiceContainer()
  
  // Mock the service container module
  vi.doMock('@/services/container/ServiceContainer', () => ({
    serviceContainer: mockContainer,
  }))

  return {
    container: mockContainer,
    storageService: mockContainer.resolve('STORAGE_SERVICE'),
    errorService: mockContainer.resolve('ERROR_SERVICE'),
    logService: mockContainer.resolve('LOG_SERVICE'),
    configService: mockContainer.resolve('CONFIG_SERVICE'),
  }
}