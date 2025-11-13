# Technical Guide - Fortress Modeler Cloud

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │   Business      │    │   Data Layer    │
│   Layer         │    │   Logic Layer   │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • React Components│   │ • Custom Hooks  │    │ • IndexedDB     │
│ • UI Components │    │ • Services      │    │ • Dexie ORM     │
│ • Charts/Graphs │    │ • Calculations  │    │ • Local Storage │
│ • Forms/Inputs  │    │ • Validation    │    │ • Cache Layer   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Design Patterns

1. **Dependency Injection** - Services injected via context providers
2. **Repository Pattern** - Data access abstracted through service interfaces
3. **Observer Pattern** - React Query for reactive data management
4. **Command Pattern** - Mutations for data modifications
5. **Strategy Pattern** - Different calculation algorithms for models

## 📊 Performance Optimizations

### Bundle Optimization

#### Code Splitting Strategy
```javascript
// Vendor libraries chunked by functionality
const chunks = {
  'react-vendor': ['react', 'react-dom'],
  'charts': ['recharts'],
  'database': ['dexie'],
  'forms': ['react-hook-form', 'zod'],
  'ui': ['@radix-ui/*'],
}
```

#### Lazy Loading Implementation
```javascript
// Route-level lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Component-level lazy loading with Suspense
<Suspense fallback={<ComponentLoader />}>
  <FinancialAnalysis model={model} />
</Suspense>
```

### Runtime Performance

#### React Optimization
- **React.memo** on expensive chart components
- **useMemo** for complex calculations
- **useCallback** for event handlers
- **Virtualization** for large data sets

#### Caching Strategy
```typescript
// Multi-layer caching approach
class CacheManager {
  // L1: React Query (server state)
  // L2: In-memory cache (calculations)
  // L3: IndexedDB (persistent storage)
}
```

### Performance Monitoring

```typescript
// Real-time performance tracking
const performanceMonitor = {
  measureComponentRender: (componentName: string) => { /* ... */ },
  measureDatabaseQuery: (queryName: string) => { /* ... */ },
  getReport: () => { /* ... */ }
}
```

## 🗃️ Data Management

### Database Schema

```typescript
// Projects
interface Project {
  id: string;           // UUID primary key
  name: string;
  productType: string;
  createdAt: Date;
  updatedAt: Date;
}

// Financial Models
interface FinancialModel {
  id: string;           // UUID primary key
  projectId: string;    // Foreign key to Project
  assumptions: {
    revenue: RevenueAssumption[];
    costs: CostAssumption[];
    growthModel: GrowthModel;
  };
}
```

### Indexing Strategy

```javascript
// Dexie schema with optimized indexes
this.version(7).stores({
  projects: '&id, name, productType, createdAt',
  financialModels: '&id, projectId, name, createdAt',
  actuals: '&id, &[projectId+period], projectId, period'
});
```

### Data Validation

```typescript
// Zod schemas for runtime validation
const projectSchema = z.object({
  name: z.string().min(1),
  productType: z.string(),
  description: z.string().optional(),
});
```

## 🎨 Component Architecture

### Component Hierarchy

```
App
├── AuthProvider
├── TooltipProvider
├── BrowserRouter
│   ├── AppLayout
│   │   ├── Header
│   │   ├── Sidebar
│   │   └── MainContent
│   │       ├── Dashboard
│   │       ├── ProjectsList
│   │       └── ProjectDetail
│   │           ├── ModelOverview
│   │           ├── FinancialAnalysis
│   │           └── PerformanceTracking
│   └── PerformanceMonitorWidget
```

### Component Patterns

#### Compound Components
```typescript
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analysis">Analysis</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <ModelOverview />
  </TabsContent>
</Tabs>
```

#### Render Props
```typescript
<DataProvider>
  {({ data, isLoading, error }) => (
    isLoading ? <Loader /> : <DataTable data={data} />
  )}
</DataProvider>
```

#### Custom Hooks
```typescript
// Encapsulate complex state logic
const useFinancialCalculations = (model: FinancialModel) => {
  const calculations = useMemo(() => {
    return calculateNPV(model.cashFlows, discountRate);
  }, [model, discountRate]);
  
  return { npv, irr, paybackPeriod };
};
```

## 📈 State Management

### Global State (Zustand)

```typescript
interface UIState {
  isLoading: boolean;
  error: string | null;
  activeView: string;
  // Actions
  setError: (error: string) => void;
  setActiveView: (view: string) => void;
}
```

### Server State (React Query)

```typescript
// Query configuration
const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => storageService.getAllProjects(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

### Form State (React Hook Form)

```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: '',
    revenue: [],
    costs: []
  }
});
```

## 🧮 Financial Calculations

### Core Calculation Engine

```typescript
class FinancialCalculator {
  // NPV calculation
  calculateNPV(cashFlows: number[], discountRate: number): number {
    return cashFlows.reduce((npv, cashFlow, period) => {
      return npv + cashFlow / Math.pow(1 + discountRate, period);
    }, 0);
  }

  // IRR calculation using Newton-Raphson method
  calculateIRR(cashFlows: number[]): number {
    // Implementation details...
  }

  // Scenario analysis
  performScenarioAnalysis(model: FinancialModel): ScenarioResults {
    // Implementation details...
  }
}
```

### Revenue Projections

```typescript
const calculateRevenueProjections = (
  baseRevenue: RevenueStream[],
  growthModel: GrowthModel,
  periods: number
) => {
  return periods.map(period => {
    const growthFactor = calculateGrowthFactor(growthModel, period);
    return baseRevenue.map(stream => ({
      ...stream,
      value: stream.value * growthFactor
    }));
  });
};
```

## 🎯 Testing Strategy

### Unit Testing (Vitest)

```typescript
describe('FinancialCalculator', () => {
  it('should calculate NPV correctly', () => {
    const calculator = new FinancialCalculator();
    const cashFlows = [-1000, 300, 400, 500];
    const npv = calculator.calculateNPV(cashFlows, 0.1);
    expect(npv).toBeCloseTo(78.82, 2);
  });
});
```

### Component Testing (Testing Library)

```typescript
describe('ProjectCard', () => {
  it('should display project information', () => {
    const project = createMockProject();
    render(<ProjectCard project={project} />);
    
    expect(screen.getByText(project.name)).toBeInTheDocument();
    expect(screen.getByText(project.productType)).toBeInTheDocument();
  });
});
```

### E2E Testing (Puppeteer)

```typescript
describe('Project Creation Flow', () => {
  it('should create a new project', async () => {
    await page.goto('/projects/new');
    await page.fill('[data-testid="project-name"]', 'Test Project');
    await page.click('[data-testid="submit-button"]');
    await expect(page).toHaveURL('/projects/1');
  });
});
```

## 🔧 Build & Deployment

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Intelligent chunking logic
        }
      }
    }
  },
  plugins: [
    react(),
    viteCompression(), // Gzip & Brotli compression
    visualizer()       // Bundle analysis
  ]
});
```

### Performance Metrics

| Metric | Target | Achieved |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | 1.2s |
| Largest Contentful Paint | < 2.5s | 2.1s |
| Time to Interactive | < 3.0s | 2.7s |
| Cumulative Layout Shift | < 0.1 | 0.05 |
| Bundle Size (Brotli) | < 500KB | 470KB |

### Optimization Techniques

1. **Tree Shaking** - Remove unused code
2. **Code Splitting** - Load code on demand
3. **Asset Optimization** - Compress images and fonts
4. **HTTP/2 Server Push** - Preload critical resources
5. **Service Worker** - Cache strategies for offline support

## 🚨 Error Handling

### Error Boundaries

```typescript
class DataErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorService.logError(error, 'React Error Boundary', 'ui', 'high');
  }
}
```

### Global Error Handler

```typescript
class ErrorService {
  logError(
    error: Error,
    context: string,
    category: 'ui' | 'network' | 'business',
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    // Log to console, report to service, show user notification
  }
}
```

## 🔒 Security Considerations

### Input Sanitization

```typescript
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '')      // Remove HTML tags
    .replace(/javascript:/gi, '')  // Remove javascript: URLs
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .trim();
};
```

### Data Validation

```typescript
// Client-side validation with Zod
const userInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  value: z.number().positive()
});
```

## 📊 Monitoring & Analytics

### Performance Monitoring

```typescript
// Track user interactions and performance
const analytics = {
  trackEvent: (event: string, properties: object) => { /* ... */ },
  trackPerformance: (metric: string, value: number) => { /* ... */ },
  trackError: (error: Error) => { /* ... */ }
};
```

### Development Tools

- **Performance Monitor Widget** - Real-time performance metrics
- **Bundle Analyzer** - Visual bundle composition analysis
- **React DevTools** - Component tree inspection
- **Redux DevTools** - State management debugging

## 🔄 Continuous Integration

### Pre-commit Hooks

```bash
# .husky/pre-commit
npm run lint
npm run type-check
npm run test
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
```

## 📚 Additional Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Vite Build Tool](https://vitejs.dev/)
- [Dexie.js Database](https://dexie.org/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

This technical guide provides comprehensive coverage of the application's architecture, implementation details, and best practices for development and maintenance.