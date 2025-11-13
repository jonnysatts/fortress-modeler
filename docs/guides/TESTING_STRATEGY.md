# Fortress Modeler - Testing Strategy & Guidelines

## Overview

This document outlines the comprehensive testing strategy implemented for the Fortress Modeler application as part of Phase 7 of the architectural repair project. The testing framework is designed to ensure high code quality, reliability, and maintainability.

## Testing Philosophy

Our testing approach follows the **Testing Pyramid** principle:

```
         🔺 E2E Tests (Few)
        🔺🔺🔺 Integration Tests (Some)  
   🔺🔺🔺🔺🔺🔺🔺 Unit Tests (Many)
```

- **Unit Tests (70%)**: Fast, isolated tests for individual functions and components
- **Integration Tests (20%)**: Test interactions between components and services
- **End-to-End Tests (10%)**: Full user journey testing with real browser automation

## Testing Stack

### Core Testing Framework
- **Vitest**: Fast unit test runner with native TypeScript support
- **Testing Library**: React component testing with user-centric queries
- **Puppeteer**: End-to-end browser automation
- **MSW (Mock Service Worker)**: API mocking for integration tests

### Supporting Tools
- **@vitest/ui**: Interactive test UI for development
- **@vitest/coverage-v8**: Code coverage reporting
- **@testing-library/user-event**: Realistic user interaction simulation
- **happy-dom/jsdom**: DOM environment for testing

## Test Organization

```
src/
├── test/
│   ├── setup.ts                 # Global test configuration
│   ├── mocks/
│   │   ├── server.ts            # MSW server setup
│   │   ├── handlers.ts          # API mock handlers
│   │   └── services.ts          # Service mocking utilities
│   ├── fixtures/
│   │   ├── projects.ts          # Test data fixtures
│   │   └── models.ts            # Model test data
│   ├── utils/
│   │   └── test-utils.tsx       # Custom render functions
│   └── e2e/
│       ├── setup.ts             # E2E test configuration
│       └── *.test.ts            # E2E test suites
├── components/
│   └── **/__tests__/            # Component tests
├── hooks/
│   └── **/__tests__/            # Hook tests
├── services/
│   └── **/__tests__/            # Service tests
└── lib/
    └── **/__tests__/            # Utility function tests
```

## Testing Categories

### 1. Unit Tests

**Purpose**: Test individual functions, classes, and components in isolation.

**Location**: `src/**/__tests__/*.test.{ts,tsx}`

**Examples**:
- Service implementations (`DexieStorageService`, `ErrorService`)
- Utility functions (`security.ts`, `utils.ts`)
- Pure components and hooks

**Guidelines**:
```typescript
// ✅ Good unit test
describe('sanitizeTextInput', () => {
  it('should remove HTML tags', () => {
    const input = '<script>alert("xss")</script>Hello'
    const result = sanitizeTextInput(input)
    expect(result).toBe('Hello')
  })
})

// ❌ Avoid testing implementation details
it('should call setState with correct parameters', () => {
  // Don't test internal React state management
})
```

### 2. Integration Tests

**Purpose**: Test interactions between components, hooks, and services.

**Examples**:
- React Query hooks with mocked services
- Component integration with dependency injection
- Form submissions with validation

**Service Mocking Pattern**:
```typescript
import { setupServiceMocks } from '@/test/mocks/services'

describe('useProjects integration', () => {
  beforeEach(() => {
    const serviceMocks = setupServiceMocks()
    // Tests use injected mock services
  })
})
```

### 3. Component Tests

**Purpose**: Test React components with realistic user interactions.

**Approach**: Test behavior, not implementation
```typescript
// ✅ Test user behavior
it('should show success message when project is created', async () => {
  const user = userEvent.setup()
  render(<CreateProjectForm />)
  
  await user.type(screen.getByLabelText('Project Name'), 'Test Project')
  await user.click(screen.getByRole('button', { name: 'Create' }))
  
  expect(screen.getByText('Project created successfully')).toBeInTheDocument()
})

// ❌ Don't test implementation details
it('should update state when input changes', () => {
  // Avoid testing internal state changes
})
```

### 4. End-to-End Tests

**Purpose**: Test complete user journeys in a real browser environment.

**Setup**: Puppeteer with Vitest
```typescript
describe('Project Management E2E', () => {
  it('should create, edit, and delete a project', async () => {
    const page = getPage()
    await waitForApp(page)
    
    // Complete user workflow testing
    await createProject(page, 'E2E Test Project')
    await editProject(page, 'Updated Project Name')
    await deleteProject(page)
  })
})
```

## Testing Utilities

### Custom Render Function
```typescript
import { render } from '@/test/utils/test-utils'

// Automatically provides all necessary providers
const { result } = render(<ComponentUnderTest />)
```

### Service Mocking
```typescript
const serviceMocks = setupServiceMocks()

// Mock specific service behavior
serviceMocks.storageService.createProject.mockResolvedValue(mockProject)
```

### Test Fixtures
```typescript
import { createProjectFixture } from '@/test/fixtures/projects'

const testProject = createProjectFixture({
  name: 'Custom Test Project',
  productType: 'SaaS'
})
```

## Coverage Requirements

### Global Thresholds
- **Lines**: 70% minimum
- **Functions**: 70% minimum  
- **Branches**: 70% minimum
- **Statements**: 70% minimum

### Critical Area Thresholds
- **Services** (`src/services/**`): 85% minimum
- **Security** (`src/lib/security.ts`): 90% minimum

### Coverage Exclusions
- UI components from external libraries (`src/components/ui/**`)
- Configuration files (`*.config.ts`)
- Test files themselves
- Main entry point (`src/main.tsx`)

## Running Tests

### Development Commands
```bash
# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### CI/CD Pipeline
Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

Pipeline includes:
1. **Unit/Integration Tests** (Node.js 18.x, 20.x)
2. **E2E Tests** (Ubuntu latest)
3. **Security Scanning** (npm audit + CodeQL)
4. **Build Testing** (Production + Development builds)
5. **Quality Gates** (Coverage thresholds)
6. **Performance Testing** (Lighthouse CI)

## Best Practices

### 1. Test Naming
```typescript
// ✅ Descriptive test names
describe('ActualsInputForm', () => {
  it('should sanitize malicious input in notes field', () => {})
  it('should prevent negative values in revenue inputs', () => {})
  it('should save actuals when form is valid and submitted', () => {})
})
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('should create project with valid data', async () => {
  // Arrange
  const projectData = { name: 'Test', productType: 'SaaS' }
  const mockProject = createProjectFixture(projectData)
  serviceMocks.storageService.createProject.mockResolvedValue(mockProject)
  
  // Act
  const { result } = renderHook(() => useCreateProject())
  result.current.mutate(projectData)
  
  // Assert
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual(mockProject)
  })
})
```

### 3. Test Independence
- Each test should be independent and not rely on other tests
- Use `beforeEach`/`afterEach` for setup/cleanup
- Reset mocks between tests

### 4. User-Centric Testing
```typescript
// ✅ Test what users see and do
screen.getByRole('button', { name: 'Save Project' })
screen.getByLabelText('Project Name')
screen.getByText('Project created successfully')

// ❌ Avoid testing IDs or classes
screen.getByTestId('save-btn')
screen.getByClassName('project-form')
```

### 5. Async Testing
```typescript
// ✅ Proper async handling
await waitFor(() => {
  expect(result.current.isSuccess).toBe(true)
})

// ❌ Avoid arbitrary timeouts
setTimeout(() => {
  expect(result.current.isSuccess).toBe(true)
}, 1000)
```

## Debugging Tests

### VS Code Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["--reporter=verbose"],
  "console": "integratedTerminal"
}
```

### Test Debugging Tips
1. Use `screen.debug()` to see DOM output
2. Add `await new Promise(resolve => setTimeout(resolve, 5000))` to pause tests
3. Use `test.only()` to run single tests
4. Check browser console in E2E tests with `page.on('console', console.log)`

## Continuous Improvement

### Metrics Tracking
- Test execution time
- Coverage trends
- Flaky test identification
- E2E test stability

### Review Process
1. **Code Review**: All test code reviewed for quality
2. **Coverage Review**: Ensure new code meets coverage requirements
3. **Performance Review**: Monitor test execution time
4. **Maintenance**: Regular cleanup of obsolete tests

## Common Patterns

### Testing Hooks with Services
```typescript
const { result } = renderHook(() => useMyProjects(), {
  wrapper: createHookWrapper()
})
```

### Testing Form Validation
```typescript
const user = userEvent.setup()
await user.type(screen.getByLabelText('Email'), 'invalid-email')
await user.click(screen.getByRole('button', { name: 'Submit' }))
expect(screen.getByText('Please enter a valid email')).toBeInTheDocument()
```

### Testing Error States
```typescript
serviceMocks.storageService.getAllProjects.mockRejectedValue(new Error('Network error'))
// Test error handling behavior
```

## Security Testing

All security utilities are thoroughly tested:
- Input sanitization functions
- XSS prevention measures
- Rate limiting functionality
- Authentication/authorization flows

## Accessibility Testing

Tests include accessibility considerations:
- Proper ARIA labels and roles
- Keyboard navigation
- Screen reader compatibility
- Color contrast (via visual regression testing)

## Future Enhancements

Planned testing improvements:
1. **Visual Regression Testing** with Playwright or similar
2. **Performance Testing** integration with Lighthouse CI
3. **Load Testing** for data-heavy scenarios
4. **Cross-browser Testing** expansion
5. **Mobile Testing** automation

---

This testing strategy ensures the Fortress Modeler application maintains high quality, reliability, and user experience through comprehensive automated testing at all levels.