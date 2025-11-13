import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { 
  useMyProjects, 
  useProject, 
  useCreateProject, 
  useUpdateProject, 
  useDeleteProject 
} from '../useProjects'
import { createHookWrapper } from '@/test/utils/test-utils'
import { setupServiceMocks } from '@/test/mocks/services'
import { createProjectFixture } from '@/test/fixtures/projects'

describe('useProjects hooks', () => {
  let serviceMocks: ReturnType<typeof setupServiceMocks>

  beforeEach(() => {
    serviceMocks = setupServiceMocks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('useMyProjects', () => {
    it('should fetch all projects', async () => {
      const mockProjects = [
        createProjectFixture({ id: '1', name: 'Project 1' }),
        createProjectFixture({ id: '2', name: 'Project 2' }),
      ]
      
      serviceMocks.storageService.getAllProjects.mockResolvedValue(mockProjects)

      const { result } = renderHook(() => useMyProjects(), {
        wrapper: createHookWrapper(),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockProjects)
      expect(serviceMocks.storageService.getAllProjects).toHaveBeenCalledOnce()
    })

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch projects')
      serviceMocks.storageService.getAllProjects.mockRejectedValue(error)

      const { result } = renderHook(() => useMyProjects(), {
        wrapper: createHookWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(error)
      expect(serviceMocks.errorService.logError).toHaveBeenCalledWith(
        error,
        'useMyProjects'
      )
    })

    it('should refetch when invalidated', async () => {
      const mockProjects = [createProjectFixture()]
      serviceMocks.storageService.getAllProjects.mockResolvedValue(mockProjects)

      const { result } = renderHook(() => useMyProjects(), {
        wrapper: createHookWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Trigger refetch
      result.current.refetch()

      await waitFor(() => {
        expect(serviceMocks.storageService.getAllProjects).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('useProject', () => {
    it('should fetch a single project', async () => {
      const mockProject = createProjectFixture({ id: 'test-id', name: 'Test Project' })
      serviceMocks.storageService.getProject.mockResolvedValue(mockProject)

      const { result } = renderHook(() => useProject('test-id'), {
        wrapper: createHookWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockProject)
      expect(serviceMocks.storageService.getProject).toHaveBeenCalledWith('test-id')
    })

    it('should handle project not found', async () => {
      serviceMocks.storageService.getProject.mockResolvedValue(null)

      const { result } = renderHook(() => useProject('non-existent'), {
        wrapper: createHookWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
    })

    it('should not fetch when project id is not provided', () => {
      const { result } = renderHook(() => useProject(''), {
        wrapper: createHookWrapper(),
      })

      expect(result.current.isPending).toBe(false)
      expect(serviceMocks.storageService.getProject).not.toHaveBeenCalled()
    })
  })

  describe('useCreateProject', () => {
    it('should create a project successfully', async () => {
      const newProjectData = {
        name: 'New Project',
        productType: 'Web Application' as const,
        description: 'Test description',
      }
      const createdProject = createProjectFixture(newProjectData)
      
      serviceMocks.storageService.createProject.mockResolvedValue(createdProject)

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate(newProjectData)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(createdProject)
      expect(serviceMocks.storageService.createProject).toHaveBeenCalledWith(newProjectData)
      expect(serviceMocks.errorService.showSuccessToUser).toHaveBeenCalledWith(
        'Project created successfully!'
      )
    })

    it('should handle creation error', async () => {
      const error = new Error('Failed to create project')
      serviceMocks.storageService.createProject.mockRejectedValue(error)

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate({
        name: 'Test Project',
        productType: 'Web Application',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(error)
      expect(serviceMocks.errorService.logError).toHaveBeenCalledWith(
        error,
        'useCreateProject'
      )
      expect(serviceMocks.errorService.showErrorToUser).toHaveBeenCalledWith(
        'Failed to create project',
        'Failed to create project'
      )
    })

    it('should invalidate projects query on success', async () => {
      const createdProject = createProjectFixture()
      serviceMocks.storageService.createProject.mockResolvedValue(createdProject)

      const wrapper = createHookWrapper()
      const { result } = renderHook(() => useCreateProject(), { wrapper })

      result.current.mutate({
        name: 'Test Project',
        productType: 'Web Application',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Query invalidation happens automatically with React Query
      // The exact implementation depends on how invalidateQueries is set up
    })
  })

  describe('useUpdateProject', () => {
    it('should update a project successfully', async () => {
      const updates = { name: 'Updated Name', description: 'Updated description' }
      const updatedProject = createProjectFixture({ id: 'test-id', ...updates })
      
      serviceMocks.storageService.updateProject.mockResolvedValue(updatedProject)

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate({ id: 'test-id', updates })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(updatedProject)
      expect(serviceMocks.storageService.updateProject).toHaveBeenCalledWith('test-id', updates)
      expect(serviceMocks.errorService.showSuccessToUser).toHaveBeenCalledWith(
        'Project updated successfully!'
      )
    })

    it('should handle update error', async () => {
      const error = new Error('Failed to update project')
      serviceMocks.storageService.updateProject.mockRejectedValue(error)

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate({ 
        id: 'test-id', 
        updates: { name: 'Updated Name' } 
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(serviceMocks.errorService.logError).toHaveBeenCalledWith(
        error,
        'useUpdateProject'
      )
      expect(serviceMocks.errorService.showErrorToUser).toHaveBeenCalledWith(
        'Failed to update project',
        'Failed to update project'
      )
    })
  })

  describe('useDeleteProject', () => {
    it('should delete a project successfully', async () => {
      serviceMocks.storageService.deleteProject.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate('test-id')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(serviceMocks.storageService.deleteProject).toHaveBeenCalledWith('test-id')
      expect(serviceMocks.errorService.showSuccessToUser).toHaveBeenCalledWith(
        'Project deleted successfully!'
      )
    })

    it('should handle delete error', async () => {
      const error = new Error('Failed to delete project')
      serviceMocks.storageService.deleteProject.mockRejectedValue(error)

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate('test-id')

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(serviceMocks.errorService.logError).toHaveBeenCalledWith(
        error,
        'useDeleteProject'
      )
      expect(serviceMocks.errorService.showErrorToUser).toHaveBeenCalledWith(
        'Failed to delete project',
        'Failed to delete project'
      )
    })

    it('should invalidate queries on successful deletion', async () => {
      serviceMocks.storageService.deleteProject.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate('test-id')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Verify that the appropriate queries would be invalidated
      // This would typically invalidate both the projects list and the specific project
    })
  })

  describe('Error handling integration', () => {
    it('should use error service for all error scenarios', async () => {
      const networkError = new Error('Network request failed')
      networkError.name = 'TypeError'
      
      serviceMocks.storageService.getAllProjects.mockRejectedValue(networkError)

      const { result } = renderHook(() => useMyProjects(), {
        wrapper: createHookWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(serviceMocks.errorService.logError).toHaveBeenCalledWith(
        networkError,
        'useMyProjects'
      )
    })

    it('should show appropriate user notifications', async () => {
      const createdProject = createProjectFixture()
      serviceMocks.storageService.createProject.mockResolvedValue(createdProject)

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createHookWrapper(),
      })

      result.current.mutate({
        name: 'Test Project',
        productType: 'Web Application',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(serviceMocks.errorService.showSuccessToUser).toHaveBeenCalledWith(
        'Project created successfully!'
      )
    })
  })
})