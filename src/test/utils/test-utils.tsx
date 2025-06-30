import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ServiceProvider } from '@/services/providers/ServiceProvider'
import { setupServiceMocks } from '../mocks/services'

// Setup service mocks for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: ReactNode
  initialEntries?: string[]
  queryClient?: QueryClient
}

const AllTheProviders = ({ 
  children, 
  initialEntries = ['/'],
  queryClient = createTestQueryClient()
}: AllTheProvidersProps) => {
  // Setup service mocks
  const serviceMocks = setupServiceMocks()

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ServiceProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ServiceProvider>
    </MemoryRouter>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { initialEntries, queryClient, ...renderOptions } = options || {}
  
  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders 
        {...props} 
        initialEntries={initialEntries}
        queryClient={queryClient}
      />
    ),
    ...renderOptions,
  })
}

// Mock implementations for common browser APIs
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

export const mockMediaQuery = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock localStorage/sessionStorage
export const mockStorage = (type: 'localStorage' | 'sessionStorage' = 'localStorage') => {
  const storage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  }
  
  Object.defineProperty(window, type, {
    value: storage,
  })
  
  return storage
}

// Mock file operations
export const mockFileReader = () => {
  const mockFileReader = {
    readAsDataURL: vi.fn(),
    readAsText: vi.fn(),
    result: null,
    error: null,
    onload: null,
    onerror: null,
    onabort: null,
    onloadstart: null,
    onloadend: null,
    onprogress: null,
    readyState: 0,
    EMPTY: 0,
    LOADING: 1,
    DONE: 2,
    abort: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  
  global.FileReader = vi.fn(() => mockFileReader) as any
  return mockFileReader
}

// Mock canvas context
export const mockCanvasContext = () => {
  const mockContext = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  }
  
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext)
  return mockContext
}

// Utility to wait for React Query to settle
export const waitForQueryToSettle = async (queryClient: QueryClient) => {
  await queryClient.getQueryCache().findAll().forEach(query => {
    if (query.state.status === 'pending') {
      query.cancel()
    }
  })
}

// Create a wrapper that provides all necessary context for testing hooks
export const createHookWrapper = ({ 
  initialEntries = ['/'],
  queryClient = createTestQueryClient()
} = {}) => {
  return ({ children }: { children: ReactNode }) => (
    <AllTheProviders 
      initialEntries={initialEntries}
      queryClient={queryClient}
    >
      {children}
    </AllTheProviders>
  )
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
export { createTestQueryClient }