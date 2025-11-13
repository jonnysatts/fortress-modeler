import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateProject,
  useCreateSpecialEventForecast,
  useCreateSpecialEventActual,
  useUpdateSpecialEventMilestone
} from '../useProjects'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test/utils/test-utils'
import { setupServiceMocks } from '@/test/mocks/services'
import { createProjectFixture } from '@/test/fixtures/projects'
import type { SpecialEventForecast, SpecialEventActual, SpecialEventMilestone } from '@/lib/db'

let serviceMocks: ReturnType<typeof setupServiceMocks>

vi.mock('@/services/singleton', () => ({
  getSupabaseStorageService: () => serviceMocks.storageService,
  resetSupabaseStorageService: vi.fn(),
}))

const createWrapper = ({
  initialEntries = ['/'],
  queryClient = createTestQueryClient(),
} = {}) => {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}

describe('special event hooks', () => {

  beforeEach(() => {
    serviceMocks = setupServiceMocks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should create a special event project', async () => {
    const newProject = createProjectFixture({ event_type: 'special', event_date: new Date('2024-05-01') })
    serviceMocks.storageService.createProject.mockResolvedValue(newProject)

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      name: newProject.name,
      productType: newProject.productType,
      event_type: 'special',
      event_date: newProject.event_date,
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(serviceMocks.storageService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'special' })
    )
  })

  it('should submit forecast form data', async () => {
    const forecastData: Partial<SpecialEventForecast> = {
      project_id: 'project1',
      forecast_fnb_revenue: 1000,
    }
    const created = { id: 'forecast1', created_at: new Date(), ...forecastData } as SpecialEventForecast
    serviceMocks.storageService.createSpecialEventForecast.mockResolvedValue(created)

    const { result } = renderHook(() => useCreateSpecialEventForecast(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(forecastData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(serviceMocks.storageService.createSpecialEventForecast).toHaveBeenCalledWith(forecastData)
  })

  it('should submit actual form data', async () => {
    const actualData: Partial<SpecialEventActual> = {
      project_id: 'project1',
      actual_fnb_revenue: 800,
    }
    const created = { id: 'actual1', created_at: new Date(), ...actualData } as SpecialEventActual
    serviceMocks.storageService.createSpecialEventActual.mockResolvedValue(created)

    const { result } = renderHook(() => useCreateSpecialEventActual(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(actualData)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(serviceMocks.storageService.createSpecialEventActual).toHaveBeenCalledWith(actualData)
  })

  it('should update milestones', async () => {
    const milestoneUpdate: Partial<SpecialEventMilestone> = {
      milestone_label: 'Completed',
      completed: true,
    }
    const updated = { id: 'milestone1', project_id: 'project1', ...milestoneUpdate } as SpecialEventMilestone
    serviceMocks.storageService.updateSpecialEventMilestone.mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdateSpecialEventMilestone(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 'milestone1', data: milestoneUpdate })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(serviceMocks.storageService.updateSpecialEventMilestone).toHaveBeenCalledWith(
      'milestone1',
      milestoneUpdate
    )
  })
})
