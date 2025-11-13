import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ActualsInputForm } from '../ActualsInputForm'
import { setupServiceMocks } from '@/test/mocks/services'
import { createModelFixture } from '@/test/fixtures/models'
import type { ActualsPeriodEntry } from '@/lib/db'

// Mock the useUpsertActuals hook
vi.mock('@/hooks/useActuals', () => ({
  useUpsertActuals: vi.fn(),
}))

describe('ActualsInputForm', () => {
  let serviceMocks: ReturnType<typeof setupServiceMocks>
  let mockMutate: any
  let mockModel: any
  let mockExistingActuals: ActualsPeriodEntry[]

  beforeEach(() => {
    serviceMocks = setupServiceMocks()
    
    mockMutate = vi.fn()
    const mockUpsertActuals = {
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    }

    vi.mocked(require('@/hooks/useActuals').useUpsertActuals).mockReturnValue(mockUpsertActuals)

    mockModel = createModelFixture({
      id: 'test-model',
      projectId: 'test-project',
      name: 'Test Model',
      assumptions: {
        revenue: [
          { name: 'Subscription Revenue', value: 99.99, type: 'recurring', frequency: 'monthly' },
          { name: 'Setup Fee', value: 199.99, type: 'one-time', frequency: 'one-time' },
        ],
        costs: [
          { name: 'Server Hosting', value: 50.00, type: 'variable', category: 'Infrastructure' },
          { name: 'Staff Salaries', value: 5000.00, type: 'fixed', category: 'Personnel' },
        ],
        growthModel: { type: 'linear', rate: 0.05 },
      },
    })

    mockExistingActuals = []
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Rendering', () => {
    it('should render form with revenue and cost inputs', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      expect(screen.getByText('Enter Actual Performance Data')).toBeInTheDocument()
      
      // Revenue section
      expect(screen.getByText('Revenue Actuals')).toBeInTheDocument()
      expect(screen.getByLabelText('Subscription Revenue')).toBeInTheDocument()
      expect(screen.getByLabelText('Setup Fee')).toBeInTheDocument()
      
      // Cost section
      expect(screen.getByText('Cost Actuals')).toBeInTheDocument()
      expect(screen.getByLabelText('Server Hosting')).toBeInTheDocument()
      expect(screen.getByLabelText('Staff Salaries')).toBeInTheDocument()
    })

    it('should render period selector', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      expect(screen.getByText('Select Month:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should render notes section', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      expect(screen.getByLabelText('Notes for Month 1')).toBeInTheDocument()
    })

    it('should render save button', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      expect(screen.getByRole('button', { name: /Save Actuals for Month 1/i })).toBeInTheDocument()
    })
  })

  describe('Weekly Event Model', () => {
    beforeEach(() => {
      mockModel = createModelFixture({
        assumptions: {
          ...mockModel.assumptions,
          metadata: {
            type: 'WeeklyEvent',
            weeks: 8,
            initialWeeklyAttendance: 100,
          },
        },
      })
    })

    it('should render week selector for weekly events', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      expect(screen.getByText('Select Week:')).toBeInTheDocument()
    })

    it('should render attendance input for weekly events', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      expect(screen.getByText('Attendance Actual')).toBeInTheDocument()
      expect(screen.getByLabelText('Actual Attendance')).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should allow entering revenue values', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const revenueInput = screen.getByLabelText('Subscription Revenue')
      
      await user.clear(revenueInput)
      await user.type(revenueInput, '150.00')

      expect(revenueInput).toHaveValue(150)
    })

    it('should allow entering cost values', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const costInput = screen.getByLabelText('Server Hosting')
      
      await user.clear(costInput)
      await user.type(costInput, '75.50')

      expect(costInput).toHaveValue(75.5)
    })

    it('should allow entering notes', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const notesInput = screen.getByLabelText('Notes for Month 1')
      
      await user.type(notesInput, 'This is a test note')

      expect(notesInput).toHaveValue('This is a test note')
    })

    it('should sanitize text input in notes', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const notesInput = screen.getByLabelText('Notes for Month 1')
      
      await user.type(notesInput, '<script>alert("xss")</script>Safe text')

      expect(notesInput).toHaveValue('Safe text')
    })

    it('should prevent negative values in numeric inputs', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const revenueInput = screen.getByLabelText('Subscription Revenue')
      
      await user.clear(revenueInput)
      await user.type(revenueInput, '-100')

      // Input should be sanitized to 0 or prevented
      expect(revenueInput.value).not.toBe('-100')
    })
  })

  describe('Form Validation', () => {
    it('should disable save button when form is not dirty', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const saveButton = screen.getByRole('button', { name: /Save Actuals for Month 1/i })
      expect(saveButton).toBeDisabled()
    })

    it('should enable save button when form is dirty and valid', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const revenueInput = screen.getByLabelText('Subscription Revenue')
      await user.type(revenueInput, '100')

      const saveButton = screen.getByRole('button', { name: /Save Actuals for Month 1/i })
      
      await waitFor(() => {
        expect(saveButton).toBeEnabled()
      })
    })

    it('should show validation error for notes exceeding 500 characters', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const notesInput = screen.getByLabelText('Notes for Month 1')
      const longText = 'a'.repeat(501)
      
      await user.type(notesInput, longText)

      await waitFor(() => {
        expect(screen.getByText('Notes must be 500 characters or less')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const user = userEvent.setup()
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      // Fill out form
      await user.type(screen.getByLabelText('Subscription Revenue'), '150.00')
      await user.type(screen.getByLabelText('Server Hosting'), '75.50')
      await user.type(screen.getByLabelText('Notes for Month 1'), 'Test notes')

      // Submit form
      const saveButton = screen.getByRole('button', { name: /Save Actuals for Month 1/i })
      await user.click(saveButton)

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test-project',
          period: 1,
          periodType: 'Month',
          revenueActuals: expect.objectContaining({
            'Subscription Revenue': 150,
          }),
          costActuals: expect.objectContaining({
            'Server Hosting': 75.5,
          }),
          notes: 'Test notes',
        }),
        expect.any(Object)
      )
    })

    it('should handle submission error', async () => {
      const user = userEvent.setup()
      const error = new Error('Submission failed')
      
      mockMutate.mockImplementation((data, options) => {
        options.onError(error)
      })
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      await user.type(screen.getByLabelText('Subscription Revenue'), '100')
      
      const saveButton = screen.getByRole('button', { name: /Save Actuals for Month 1/i })
      await user.click(saveButton)

      // Verify error handling would be called
      expect(mockMutate).toHaveBeenCalled()
    })

    it('should handle successful submission', async () => {
      const user = userEvent.setup()
      
      mockMutate.mockImplementation((data, options) => {
        options.onSuccess()
      })
      
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      await user.type(screen.getByLabelText('Subscription Revenue'), '100')
      
      const saveButton = screen.getByRole('button', { name: /Save Actuals for Month 1/i })
      await user.click(saveButton)

      expect(mockMutate).toHaveBeenCalled()
    })
  })

  describe('Existing Data Loading', () => {
    it('should load existing actuals data', () => {
      const existingActuals: ActualsPeriodEntry[] = [
        {
          id: 'existing-1',
          projectId: 'test-project',
          period: 1,
          periodType: 'Month',
          revenueActuals: { 'Subscription Revenue': 120.00 },
          costActuals: { 'Server Hosting': 60.00 },
          notes: 'Existing notes',
        },
      ]

      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={existingActuals}
        />
      )

      expect(screen.getByDisplayValue('120')).toBeInTheDocument()
      expect(screen.getByDisplayValue('60')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing notes')).toBeInTheDocument()
    })

    it('should switch between different periods', async () => {
      const user = userEvent.setup()
      const existingActuals: ActualsPeriodEntry[] = [
        {
          id: 'existing-1',
          projectId: 'test-project',
          period: 1,
          periodType: 'Month',
          revenueActuals: { 'Subscription Revenue': 120.00 },
          costActuals: {},
        },
        {
          id: 'existing-2',
          projectId: 'test-project',
          period: 2,
          periodType: 'Month',
          revenueActuals: { 'Subscription Revenue': 140.00 },
          costActuals: {},
        },
      ]

      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={existingActuals}
        />
      )

      // Initially shows period 1 data
      expect(screen.getByDisplayValue('120')).toBeInTheDocument()

      // Switch to period 2
      const periodSelector = screen.getByRole('combobox')
      await user.click(periodSelector)
      await user.click(screen.getByText('2'))

      // Should show period 2 data
      await waitFor(() => {
        expect(screen.getByDisplayValue('140')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      // All inputs should have associated labels
      expect(screen.getByLabelText('Subscription Revenue')).toBeInTheDocument()
      expect(screen.getByLabelText('Setup Fee')).toBeInTheDocument()
      expect(screen.getByLabelText('Server Hosting')).toBeInTheDocument()
      expect(screen.getByLabelText('Staff Salaries')).toBeInTheDocument()
      expect(screen.getByLabelText('Notes for Month 1')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(
        <ActualsInputForm 
          model={mockModel}
          existingActuals={mockExistingActuals}
        />
      )

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      
      const saveButton = screen.getByRole('button', { name: /Save Actuals for Month 1/i })
      expect(saveButton).toHaveAttribute('type', 'submit')
    })
  })
})