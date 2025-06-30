import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DexieStorageService } from '../DexieStorageService'
import { createProjectFixture, createModelFixture } from '@/test/fixtures'
import type { Project, FinancialModel, ActualsPeriodEntry } from '@/lib/db'

// Mock Dexie
vi.mock('@/lib/db', () => ({
  db: {
    projects: {
      toArray: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    financialModels: {
      where: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    actuals: {
      where: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
    },
    transaction: vi.fn(),
  },
}))

describe('DexieStorageService', () => {
  let storageService: DexieStorageService
  let mockDb: any

  beforeEach(async () => {
    storageService = new DexieStorageService()
    const { db } = await import('@/lib/db')
    mockDb = db
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Project Operations', () => {
    it('should get all projects', async () => {
      const mockProjects = [createProjectFixture(), createProjectFixture()]
      mockDb.projects.toArray.mockResolvedValue(mockProjects)

      const result = await storageService.getAllProjects()

      expect(mockDb.projects.toArray).toHaveBeenCalledOnce()
      expect(result).toEqual(mockProjects)
    })

    it('should get a single project by id', async () => {
      const mockProject = createProjectFixture({ id: 'test-id' })
      mockDb.projects.get.mockResolvedValue(mockProject)

      const result = await storageService.getProject('test-id')

      expect(mockDb.projects.get).toHaveBeenCalledWith('test-id')
      expect(result).toEqual(mockProject)
    })

    it('should return null for non-existent project', async () => {
      mockDb.projects.get.mockResolvedValue(undefined)

      const result = await storageService.getProject('non-existent')

      expect(result).toBeNull()
    })

    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        productType: 'Web Application' as const,
        description: 'Test description',
      }
      const createdId = 'new-project-id'
      const createdProject = createProjectFixture({ id: createdId, ...projectData })

      mockDb.projects.add.mockResolvedValue(createdId)
      mockDb.projects.get.mockResolvedValue(createdProject)

      const result = await storageService.createProject(projectData)

      expect(mockDb.projects.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: projectData.name,
          productType: projectData.productType,
          description: projectData.description,
        })
      )
      expect(result).toEqual(createdProject)
    })

    it('should handle create project failure', async () => {
      const projectData = { name: 'Test', productType: 'Web Application' as const }
      mockDb.projects.add.mockResolvedValue('new-id')
      mockDb.projects.get.mockResolvedValue(undefined)

      await expect(storageService.createProject(projectData))
        .rejects.toThrow('Failed to retrieve created project')
    })

    it('should update a project', async () => {
      const updates = { name: 'Updated Name', description: 'Updated description' }
      const updatedProject = createProjectFixture({ id: 'test-id', ...updates })

      mockDb.projects.put.mockResolvedValue(1)
      mockDb.projects.get.mockResolvedValue(updatedProject)

      const result = await storageService.updateProject('test-id', updates)

      expect(mockDb.projects.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id',
          ...updates,
        })
      )
      expect(result).toEqual(updatedProject)
    })

    it('should handle update project failure', async () => {
      mockDb.projects.put.mockResolvedValue(0)

      await expect(storageService.updateProject('test-id', { name: 'Updated' }))
        .rejects.toThrow('Failed to update project')
    })

    it('should delete a project', async () => {
      mockDb.projects.delete.mockResolvedValue(1)

      await storageService.deleteProject('test-id')

      expect(mockDb.projects.delete).toHaveBeenCalledWith('test-id')
    })

    it('should handle delete project failure', async () => {
      mockDb.projects.delete.mockResolvedValue(0)

      await expect(storageService.deleteProject('test-id'))
        .rejects.toThrow('Failed to delete project')
    })
  })

  describe('Financial Model Operations', () => {
    it('should get all models for a project', async () => {
      const mockModels = [
        createModelFixture({ projectId: 'project-1' }),
        createModelFixture({ projectId: 'project-1' }),
      ]
      mockDb.financialModels.where.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockModels),
      })

      const result = await storageService.getProjectModels('project-1')

      expect(mockDb.financialModels.where).toHaveBeenCalledWith('projectId')
      expect(result).toEqual(mockModels)
    })

    it('should get a single model by id', async () => {
      const mockModel = createModelFixture({ id: 'model-1' })
      mockDb.financialModels.get.mockResolvedValue(mockModel)

      const result = await storageService.getModel('model-1')

      expect(mockDb.financialModels.get).toHaveBeenCalledWith('model-1')
      expect(result).toEqual(mockModel)
    })

    it('should create a new model', async () => {
      const modelData = {
        projectId: 'project-1',
        name: 'New Model',
        assumptions: { revenue: [], costs: [] },
      }
      const createdId = 'new-model-id'
      const createdModel = createModelFixture({ id: createdId, ...modelData })

      mockDb.financialModels.add.mockResolvedValue(createdId)
      mockDb.financialModels.get.mockResolvedValue(createdModel)

      const result = await storageService.createModel(modelData)

      expect(mockDb.financialModels.add).toHaveBeenCalledWith(
        expect.objectContaining(modelData)
      )
      expect(result).toEqual(createdModel)
    })

    it('should update a model', async () => {
      const updates = { name: 'Updated Model' }
      const updatedModel = createModelFixture({ id: 'model-1', ...updates })

      mockDb.financialModels.put.mockResolvedValue(1)
      mockDb.financialModels.get.mockResolvedValue(updatedModel)

      const result = await storageService.updateModel('model-1', updates)

      expect(result).toEqual(updatedModel)
    })

    it('should delete a model', async () => {
      mockDb.financialModels.delete.mockResolvedValue(1)

      await storageService.deleteModel('model-1')

      expect(mockDb.financialModels.delete).toHaveBeenCalledWith('model-1')
    })
  })

  describe('Actuals Operations', () => {
    it('should get all actuals for a project', async () => {
      const mockActuals: ActualsPeriodEntry[] = [
        {
          id: 'actual-1',
          projectId: 'project-1',
          period: 1,
          periodType: 'Month',
          revenueActuals: { 'Revenue Stream 1': 1000 },
          costActuals: { 'Cost Item 1': 500 },
        },
      ]
      mockDb.actuals.where.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockActuals),
      })

      const result = await storageService.getProjectActuals('project-1')

      expect(mockDb.actuals.where).toHaveBeenCalledWith('projectId')
      expect(result).toEqual(mockActuals)
    })

    it('should upsert actuals', async () => {
      const actualData = {
        projectId: 'project-1',
        period: 1,
        periodType: 'Month' as const,
        revenueActuals: { 'Revenue': 1000 },
        costActuals: { 'Cost': 500 },
      }
      const createdId = 'actual-id'
      const createdActual = { id: createdId, ...actualData }

      mockDb.actuals.put.mockResolvedValue(createdId)

      const result = await storageService.upsertActuals(actualData)

      expect(mockDb.actuals.put).toHaveBeenCalledWith(
        expect.objectContaining(actualData)
      )
      expect(result).toEqual(createdActual)
    })

    it('should delete actuals for a project and period', async () => {
      mockDb.actuals.where.mockReturnValue({
        delete: vi.fn().mockResolvedValue(1),
      })

      await storageService.deleteActuals('project-1', 1)

      expect(mockDb.actuals.where).toHaveBeenCalledWith({
        projectId: 'project-1',
        period: 1,
      })
    })
  })

  describe('Utility Operations', () => {
    it('should clear all data', async () => {
      mockDb.transaction.mockImplementation((mode, tables, callback) => {
        return callback()
      })

      await storageService.clearAllData()

      expect(mockDb.transaction).toHaveBeenCalledWith(
        'rw',
        [mockDb.projects, mockDb.financialModels, mockDb.actuals],
        expect.any(Function)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockDb.projects.toArray.mockRejectedValue(dbError)

      await expect(storageService.getAllProjects()).rejects.toThrow(dbError)
    })

    it('should handle validation errors', async () => {
      const invalidProject = { name: '', productType: 'Invalid' as any }

      await expect(storageService.createProject(invalidProject))
        .rejects.toThrow()
    })
  })
})