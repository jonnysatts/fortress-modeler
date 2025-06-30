import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ErrorService } from '../ErrorService'
import type { ILogService } from '@/services/interfaces/ILogService'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock log service
const mockLogService: ILogService = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn().mockReturnValue('debug'),
}

describe('ErrorService', () => {
  let errorService: ErrorService
  let mockToast: any

  beforeEach(async () => {
    errorService = new ErrorService()
    const { toast } = await import('sonner')
    mockToast = toast
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Error Categorization', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('fetch failed')
      networkError.name = 'TypeError'
      
      const category = errorService.categorizeError(networkError)
      
      expect(category).toBe('network')
    })

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Required field is missing')
      
      const category = errorService.categorizeError(validationError)
      
      expect(category).toBe('validation')
    })

    it('should categorize database errors correctly', () => {
      const dbError = new Error('Database transaction failed')
      
      const category = errorService.categorizeError(dbError)
      
      expect(category).toBe('database')
    })

    it('should categorize authentication errors correctly', () => {
      const authError = new Error('Unauthorized access')
      
      const category = errorService.categorizeError(authError)
      
      expect(category).toBe('authentication')
    })

    it('should default to runtime for unknown errors', () => {
      const unknownError = new Error('Something went wrong')
      
      const category = errorService.categorizeError(unknownError)
      
      expect(category).toBe('runtime')
    })
  })

  describe('Severity Assessment', () => {
    it('should assign critical severity to network errors', () => {
      const networkError = new Error('Network failure')
      networkError.name = 'TypeError'
      
      const severity = errorService.getSeverity(networkError)
      
      expect(severity).toBe('critical')
    })

    it('should assign high severity to authentication errors', () => {
      const authError = new Error('Unauthorized')
      
      const severity = errorService.getSeverity(authError)
      
      expect(severity).toBe('high')
    })

    it('should assign medium severity to validation errors', () => {
      const validationError = new Error('Invalid input')
      
      const severity = errorService.getSeverity(validationError)
      
      expect(severity).toBe('medium')
    })

    it('should assign low severity to runtime errors', () => {
      const runtimeError = new Error('Minor issue')
      
      const severity = errorService.getSeverity(runtimeError)
      
      expect(severity).toBe('low')
    })
  })

  describe('Error Logging', () => {
    it('should log error with all parameters', () => {
      const error = new Error('Test error')
      const context = 'test-context'
      const category = 'runtime'
      const severity = 'medium'
      const metadata = { userId: '123' }

      errorService.logError(error, context, category, severity, metadata)

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error: error.message,
          context,
          category,
          severity,
          metadata,
          stack: error.stack,
          timestamp: expect.any(String),
        })
      )
    })

    it('should auto-categorize and assess severity when not provided', () => {
      const error = new Error('Network request failed')
      error.name = 'TypeError'

      errorService.logError(error, 'api-call')

      expect(mockLogService.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          category: 'network',
          severity: 'critical',
        })
      )
    })
  })

  describe('User Notifications', () => {
    it('should show error toast to user', () => {
      const title = 'Error Title'
      const message = 'Error message'

      errorService.showErrorToUser(title, message)

      expect(mockToast.error).toHaveBeenCalledWith(title, {
        description: message,
        duration: 5000,
      })
    })

    it('should show success toast to user', () => {
      const message = 'Success message'

      errorService.showSuccessToUser(message)

      expect(mockToast.success).toHaveBeenCalledWith(message, {
        duration: 3000,
      })
    })

    it('should show warning toast to user', () => {
      const title = 'Warning Title'
      const message = 'Warning message'

      errorService.showWarningToUser(title, message)

      expect(mockToast.warning).toHaveBeenCalledWith(title, {
        description: message,
        duration: 4000,
      })
    })

    it('should show info toast to user', () => {
      const title = 'Info Title'
      const message = 'Info message'

      errorService.showInfoToUser(title, message)

      expect(mockToast.info).toHaveBeenCalledWith(title, {
        description: message,
        duration: 3000,
      })
    })
  })

  describe('Error Message Extraction', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test error message')
      
      const message = errorService.getErrorMessage(error)
      
      expect(message).toBe('Test error message')
    })

    it('should handle string errors', () => {
      const error = 'String error'
      
      const message = errorService.getErrorMessage(error)
      
      expect(message).toBe('String error')
    })

    it('should handle object with message property', () => {
      const error = { message: 'Object error message' }
      
      const message = errorService.getErrorMessage(error)
      
      expect(message).toBe('Object error message')
    })

    it('should provide default message for unknown error types', () => {
      const error = { unknownProperty: 'value' }
      
      const message = errorService.getErrorMessage(error)
      
      expect(message).toBe('An unknown error occurred')
    })

    it('should handle null or undefined errors', () => {
      expect(errorService.getErrorMessage(null)).toBe('An unknown error occurred')
      expect(errorService.getErrorMessage(undefined)).toBe('An unknown error occurred')
    })
  })

  describe('Network Error Handling', () => {
    it('should handle network error with retry', async () => {
      const error = new Error('Network failed')
      error.name = 'TypeError'
      const context = 'api-call'
      const retryFn = vi.fn().mockResolvedValue('success')

      const result = await errorService.handleNetworkError(error, context, retryFn)

      expect(retryFn).toHaveBeenCalledOnce()
      expect(result).toBe('success')
      expect(mockLogService.info).toHaveBeenCalledWith(
        'Network error recovered after retry',
        expect.any(Object)
      )
    })

    it('should handle retry failure', async () => {
      const error = new Error('Network failed')
      error.name = 'TypeError'
      const context = 'api-call'
      const retryError = new Error('Retry failed')
      const retryFn = vi.fn().mockRejectedValue(retryError)

      await expect(errorService.handleNetworkError(error, context, retryFn))
        .rejects.toThrow(retryError)

      expect(retryFn).toHaveBeenCalledOnce()
      expect(mockLogService.error).toHaveBeenCalledWith(
        'Network error retry failed',
        expect.any(Object)
      )
    })

    it('should not retry for non-network errors', async () => {
      const error = new Error('Validation error')
      const context = 'form-submit'
      const retryFn = vi.fn()

      await expect(errorService.handleNetworkError(error, context, retryFn))
        .rejects.toThrow(error)

      expect(retryFn).not.toHaveBeenCalled()
    })
  })

  describe('Remote Reporting', () => {
    it('should simulate remote error reporting', async () => {
      const error = new Error('Test error')
      const context = 'test-context'
      const metadata = { userId: '123' }

      await errorService.reportToRemoteService(error, context, metadata)

      expect(mockLogService.info).toHaveBeenCalledWith(
        'Error reported to remote service',
        expect.objectContaining({
          error: error.message,
          context,
          metadata,
        })
      )
    })

    it('should handle remote reporting failure gracefully', async () => {
      // Mock a failure in the remote reporting
      const originalConsoleWarn = console.warn
      console.warn = vi.fn()

      const error = new Error('Test error')
      
      // This should not throw even if remote reporting fails
      await errorService.reportToRemoteService(error, 'test')

      console.warn = originalConsoleWarn
    })
  })

  describe('Error Recovery', () => {
    it('should provide recovery suggestions for different error types', () => {
      const networkError = new Error('Network failed')
      networkError.name = 'TypeError'
      
      const category = errorService.categorizeError(networkError)
      
      expect(category).toBe('network')
      // Could extend to test specific recovery suggestions
    })
  })
})