# Fortress Financial Modeler - Codebase File Directory

Complete index of key files organized by functionality.

---

## APPLICATION ENTRY POINTS

| File | Purpose |
|------|---------|
| `src/main.tsx` | React app initialization, service bootstrap, QueryClient setup |
| `src/App.tsx` | Main routing, lazy-loaded pages, error boundary wrapper |
| `index.html` | HTML entry point, Vite config |
| `vite.config.ts` | Vite build configuration, SWC plugin, compression |

---

## CORE CONFIGURATION

### Application Config
| File | Purpose |
|------|---------|
| `src/config/app.config.ts` | Feature flags, cloud mode settings, Supabase defaults |
| `.env.example` | Template for environment variables |
| `tailwind.config.ts` | Tailwind design tokens, custom colors (fortress-blue) |
| `postcss.config.js` | PostCSS plugins for Tailwind |
| `tsconfig.app.json` | TypeScript strict mode settings |
| `tsconfig.json` | Root TypeScript config |

### Build & Dev Tools
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, metadata |
| `vitest.config.ts` | Test runner configuration |
| `vitest.e2e.config.ts` | E2E test settings |
| `eslint.config.js` | ESLint rules, Prettier integration |

---

## PAGES (Main UI Routes)

### Dashboard & Analytics
| File | Purpose |
|------|---------|
| `src/pages/Dashboard.tsx` | Portfolio analytics dashboard, KPI cards, filters |
| `src/pages/EnhancedDashboard.tsx` | Alternative dashboard layout |
| `src/pages/SafeDashboard.tsx` | Error-safe dashboard wrapper |

### Projects
| File | Purpose |
|------|---------|
| `src/pages/projects/ProjectsList.tsx` | List all user projects |
| `src/pages/projects/NewProject.tsx` | Create new project form |
| `src/pages/projects/ProjectDetail.tsx` | Main project page (models, actuals, risks, events) |
| `src/pages/projects/EditProject.tsx` | Edit project metadata |
| `src/pages/projects/ProjectCard.tsx` | Project card component for list view |

### Financial Models
| File | Purpose |
|------|---------|
| `src/pages/models/NewFinancialModel.tsx` | Create model form |
| `src/pages/models/EditFinancialModel.tsx` | Edit model assumptions |
| `src/pages/models/FinancialModelDetail.tsx` | View model projections |
| `src/pages/models/components/EventModelForm.tsx` | Event-specific model form |

### Risk Management
| File | Purpose |
|------|---------|
| `src/pages/RisksOverview.tsx` | Portfolio-wide risk overview page |

### Admin & Settings
| File | Purpose |
|------|---------|
| `src/pages/Settings.tsx` | User preferences, export options, category mgmt |
| `src/pages/CategoryManagement.tsx` | Manage customizable categories |

### Authentication
| File | Purpose |
|------|---------|
| `src/pages/Login.tsx` | Google OAuth login page |
| `src/pages/auth/AuthCallback.tsx` | OAuth callback handler |
| `src/pages/auth/SimpleAuthCallback.tsx` | Simplified callback handler |

### Error Pages
| File | Purpose |
|------|---------|
| `src/pages/NotFound.tsx` | 404 page |

---

## COMPONENTS

### Layout Components
| File | Purpose |
|------|---------|
| `src/components/layout/AppLayout.tsx` | Main app layout (sidebar, content area) |
| `src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `src/components/layout/MobileNav.tsx` | Mobile navigation |

### Navigation
| File | Purpose |
|------|---------|
| `src/components/navigation/Breadcrumb.tsx` | Breadcrumb navigation |

### Dashboard Components
| File | Purpose |
|------|---------|
| `src/components/dashboard/KPICard.tsx` | KPI metric cards |
| `src/components/dashboard/ForecastAccuracyCard.tsx` | Forecast accuracy metrics |
| `src/components/dashboard/ProjectHealthCard.tsx` | Project health indicators |
| `src/components/dashboard/VarianceTrendChart.tsx` | Variance trend visualization |
| `src/components/dashboard/RiskInsights.tsx` | Risk summary insights |

### Financial Model Components
| File | Purpose |
|------|---------|
| `src/components/models/ModelOverview.tsx` | Model summary and metrics |
| `src/components/models/ModelProjections.tsx` | Financial projections table |
| `src/components/models/ModelComparison.tsx` | Compare multiple models |
| `src/components/models/FinancialMatrix.tsx` | Detailed financial matrix |
| `src/components/models/FinancialAnalysis.tsx` | Analysis dashboard |
| `src/components/models/PerformanceAnalysis.tsx` | Performance vs. projection |
| `src/components/models/CostTrends.tsx` | Cost trend visualization |
| `src/components/models/RevenueTrends.tsx` | Revenue trend visualization |
| `src/components/models/CostBreakdownView.tsx` | Cost breakdown chart |
| `src/components/models/RevenueBreakdownView.tsx` | Revenue breakdown chart |
| `src/components/models/CategoryBreakdown.tsx` | Category-level breakdown |
| `src/components/models/ActualsInputForm.tsx` | Enter periodic actual results |
| `src/components/models/ActualsDisplayTable.tsx` | Display actual results |
| `src/components/models/MarketingChannelsForm.tsx` | Marketing budget allocation |
| `src/components/models/CriticalAssumptions.tsx` | Key assumptions summary |
| `src/components/models/GrowthIndicators.tsx` | Growth metrics |
| `src/components/models/RiskIndicators.tsx` | Risk indicators |
| `src/components/models/MetricsCard.tsx` | Generic metric card |
| `src/components/models/ExportModal.tsx` | Export report options |

### Special Events Components
| File | Purpose |
|------|---------|
| `src/components/events/SpecialEventForecastForm.tsx` | Enter event forecast data |
| `src/components/events/SpecialEventActualForm.tsx` | Enter post-event actual results |
| `src/components/events/MilestoneTracker.tsx` | Event milestone management |

### Risk Management Components
| File | Purpose |
|------|---------|
| `src/components/risk/RiskAssessmentTab.tsx` | Risk assessment UI |
| `src/components/risk/ProjectRiskDashboard.tsx` | Project risk overview |
| `src/components/risk/RiskHeatMap.tsx` | Risk heat map visualization |
| `src/components/risk/RiskCard.tsx` | Individual risk display |
| `src/components/risk/AddRiskModal.tsx` | Create new risk |
| `src/components/risk/EditRiskModal.tsx` | Edit existing risk |

### Project Components
| File | Purpose |
|------|---------|
| `src/components/projects/ProjectOverview.tsx` | Project summary |
| `src/components/projects/ScenarioOverview.tsx` | Scenario comparison |
| `src/components/projects/ShareProjectModal.tsx` | Project sharing dialog |

### Financial Components
| File | Purpose |
|------|---------|
| `src/components/financial/BreakEvenAnalysis.tsx` | Break-even calculations |
| `src/components/financial/CashFlowChart.tsx` | Cash flow visualization |
| `src/components/financial/CashFlowTable.tsx` | Cash flow data table |
| `src/components/financial/MetricCard.tsx` | Generic metric display |
| `src/components/financial/ScenarioComparison.tsx` | Scenario comparison |
| `src/components/financial/SensitivityAnalysis.tsx` | Sensitivity analysis |

### Error Handling
| File | Purpose |
|------|---------|
| `src/components/ErrorBoundary.tsx` | React error boundary |
| `src/components/SimpleErrorBoundary.tsx` | Simplified error boundary |

### App Management
| File | Purpose |
|------|---------|
| `src/components/AppLoader.tsx` | App loading screen |
| `src/components/PerformanceMonitor.tsx` | Performance metrics widget |
| `src/components/ProtectedRoute.tsx` | Route authentication guard |

### UI Components (Radix UI & shadcn)
| File | Purpose |
|------|---------|
| `src/components/ui/button.tsx` | Button component |
| `src/components/ui/card.tsx` | Card container |
| `src/components/ui/dialog.tsx` | Modal dialog |
| `src/components/ui/form.tsx` | Form wrapper |
| `src/components/ui/input.tsx` | Text input |
| `src/components/ui/select.tsx` | Select dropdown |
| `src/components/ui/tabs.tsx` | Tabbed interface |
| `src/components/ui/badge.tsx` | Badge label |
| `src/components/ui/alert.tsx` | Alert message |
| `src/components/ui/tooltip.tsx` | Tooltip |
| `src/components/ui/EmptyState.tsx` | Empty state placeholder |
| `src/components/ui/toaster.tsx` | Toast notifications (Sonner) |
| `src/components/ui/sonner.tsx` | Sonner toast provider |
| (+ 20+ more Radix UI components) | |

---

## HOOKS (Custom React Hooks)

### Project Management
| File | Purpose |
|------|---------|
| `src/hooks/useProjects.ts` | Fetch, create, update, delete projects |
| `src/hooks/useProject.ts` | Get single project |
| `src/hooks/useModels.ts` | Fetch/create financial models |
| `src/hooks/useActuals.ts` | Fetch/create actual results |

### Data Entry
| File | Purpose |
|------|---------|
| `src/hooks/useActuals.ts` | Period actuals management |

### Analytics & Performance
| File | Purpose |
|------|---------|
| `src/hooks/usePortfolioAnalytics.ts` | Portfolio-wide metrics |
| `src/hooks/useForecastAccuracy.ts` | Forecast accuracy calculations |
| `src/hooks/useVarianceTrends.ts` | Variance trend analysis |
| `src/hooks/useProjectHealth.ts` | Project health scoring |

### Risk Management
| File | Purpose |
|------|---------|
| `src/hooks/useRisks.ts` | Risk CRUD operations |
| `src/hooks/useAutomaticRiskIndicators.ts` | Automatic risk monitoring |

### Categories & Settings
| File | Purpose |
|------|---------|
| `src/hooks/useCategories.ts` | Manage customizable categories |
| `src/hooks/useUserSettings.ts` | User preferences |

### Authentication
| File | Purpose |
|------|---------|
| `src/hooks/useSupabaseAuth.tsx` | Supabase authentication |
| `src/hooks/useAuth.tsx` | General auth context |

### Utilities
| File | Purpose |
|------|---------|
| `src/hooks/useBreadcrumbs.ts` | Breadcrumb state |
| `src/hooks/use-toast.ts` | Toast notifications |
| `src/hooks/useImageUpload.ts` | Image upload handling |
| `src/hooks/useKeyboardShortcuts.ts` | Keyboard shortcuts |
| `src/hooks/useAppLoader.tsx` | App initialization state |
| `src/hooks/useRealtimeProject.ts` | Real-time project updates |
| `src/hooks/useRealtimePresence.ts` | Who's online tracking |

---

## SERVICES (Business Logic)

### Core Services
| File | Purpose |
|------|---------|
| `src/services/index.ts` | Service exports |
| `src/services/bootstrap.ts` | Service initialization |
| `src/services/singleton.ts` | Singleton patterns |

### Data & Storage
| File | Purpose |
|------|---------|
| `src/services/implementations/DexieStorageService.ts` | IndexedDB storage |
| `src/services/implementations/SupabaseStorageService.ts` | Supabase storage |
| `src/services/implementations/SupabaseRealtimeService.ts` | Real-time subscriptions |

### Analytics Services
| File | Purpose |
|------|---------|
| `src/services/DashboardAnalyticsService.ts` | Dashboard KPI calculations |
| `src/services/ForecastAccuracyService.ts` | MAPE calculations |
| `src/services/VarianceTrendService.ts` | Variance analysis |
| `src/services/ProjectHealthService.ts` | Health score automation |

### Risk Services
| File | Purpose |
|------|---------|
| `src/services/RiskService.ts` | Risk CRUD, heat maps, trends |
| `src/services/ProjectRiskService.ts` | Project-level risk operations |
| `src/services/AutomaticRiskIndicatorService.ts` | Auto risk monitoring |

### Other Services
| File | Purpose |
|------|---------|
| `src/services/CategoryService.ts` | Category management |
| `src/services/ReportService.ts` | Report generation |

### Error Handling
| File | Purpose |
|------|---------|
| `src/services/implementations/ErrorService.ts` | Error logging |
| `src/services/implementations/GlobalErrorHandler.ts` | Global error handler |
| `src/services/implementations/ErrorRecoveryService.ts` | Error recovery logic |
| `src/services/implementations/LogService.ts` | Logging service |

### Configuration
| File | Purpose |
|------|---------|
| `src/services/implementations/ConfigService.ts` | Configuration management |
| `src/services/container/ServiceContainer.ts` | Dependency injection |
| `src/services/providers/ServiceProvider.tsx` | React service provider |

---

## TYPE DEFINITIONS

| File | Purpose |
|------|---------|
| `src/types/models.ts` | FinancialModel, RevenueStream, CostCategory, ActualsPeriod types |
| `src/types/risk.ts` | ProjectRisk, RiskCategory, MitigationAction types |
| `src/types/specialEvents.ts` | SpecialEvent, Forecast, Actual, EventVariance types |
| `src/types/trends.ts` | TrendDataPoint type |
| `src/types/user.ts` | User, UserProfile types |

---

## LIBRARY & UTILITIES

### Database
| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Dexie database schema, IndexedDB operations |
| `src/lib/supabase.ts` | Supabase client, auth helpers, DB helpers |

### Utilities
| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Common utilities (cn, formatters) |
| `src/lib/constants.ts` | Application constants |
| `src/lib/config.ts` | Config loader |
| `src/lib/cache.ts` | Caching utilities |
| `src/lib/security.ts` | Security utilities |
| `src/lib/storage.ts` | Browser storage helpers |

### Export & Reporting
| File | Purpose |
|------|---------|
| `src/lib/exports/core/EnhancedPDFGenerator.ts` | Enhanced PDF export |
| `src/lib/exports/core/EnhancedExcelGenerator.ts` | Enhanced Excel export |
| `src/lib/exports/core/CanvasComponentRenderer.ts` | Canvas rendering |
| `src/lib/board-ready-export.ts` | Board-ready PDF export |
| `src/lib/rich-pdf-export.ts` | Rich PDF export |
| `src/lib/enhanced-excel-export.ts` | Advanced Excel export |
| `src/lib/simple-export.ts` | Simple format export |
| `src/lib/export.ts` | Main export interface |

### Financial Calculations
| File | Purpose |
|------|---------|
| `src/lib/financial-calculations.ts` | Financial analysis functions |

### Data Models
| File | Purpose |
|------|---------|
| `src/components/models/breakdownCalculations.ts` | Cost/revenue breakdown logic |

---

## STORE (State Management)

| File | Purpose |
|------|---------|
| `src/store/useUIStore.ts` | UI state (themes, modals, etc.) |

---

## STYLES

| File | Purpose |
|------|---------|
| `src/App.css` | App-level CSS |
| `src/index.css` | Global styles, Tailwind imports |

---

## SUPABASE (Database Migrations & Seeding)

### Migrations
| File | Purpose |
|------|---------|
| `/supabase/migrations/20250101_base_schema_complete.sql` | Core database schema |
| `/supabase/migrations/20250114_enhance_special_events_comprehensive_FIXED.sql` | Special events enhancements |
| `/supabase/migrations/20250711062225_change_success_rating_check.sql` | Success rating constraint |
| `/supabase/migrations/20250715_eliminate_circular_rls_dependency.sql` | RLS policy fix |
| `/supabase/migrations/20250719_fix_get_shared_projects_ambiguity_join.sql` | Query fix |
| `/supabase/migrations/20250720_fix_get_user_projects_ambiguity.sql` | Query fix |
| `/supabase/migrations/20250721055950_add_cogs_standardization_to_special_events.sql` | COGS standardization |
| `/supabase/migrations/20250722_fix_special_events_rls_policies.sql` | RLS policy fix |
| `/supabase/migrations/20250723_add_configurable_categories.sql` | Category management |
| `/supabase/migrations/20250724_standardize_success_rating_1_to_10.sql` | Success rating standardization |
| `/supabase/migrations/20250725_create_user_settings.sql` | User settings table |

### Seed Data
| File | Purpose |
|------|---------|
| `/supabase/seed.sql` | Sample data for development |

### Configuration
| File | Purpose |
|------|---------|
| `/supabase/config.toml` | Supabase local config |

---

## BACKEND SERVER (Optional)

### Main Server Files
| File | Purpose |
|------|---------|
| `/server/src/index.ts` | Express server entry |
| `/server/src/simple-server.ts` | Simplified server |

### API Routes
| File | Purpose |
|------|---------|
| `/server/src/api/health.ts` | Health check endpoint |
| `/server/src/api/projects.routes.ts` | Project API routes |
| `/server/src/api/models.routes.ts` | Model API routes |
| `/server/src/api/sync.routes.ts` | Sync API routes |
| `/server/src/api/maintenance.routes.ts` | Admin API routes |

### Services
| File | Purpose |
|------|---------|
| `/server/src/services/project.service.ts` | Project business logic |
| `/server/src/services/financial-model.service.ts` | Model business logic |
| `/server/src/services/sync.service.ts` | Sync logic |
| `/server/src/services/secrets.service.ts` | Secrets management |

### Database
| File | Purpose |
|------|---------|
| `/server/src/db/connection.ts` | Database connection |

### Types & Config
| File | Purpose |
|------|---------|
| `/server/src/types/models.ts` | Server-side type definitions |
| `/server/src/types/common.ts` | Common types |
| `/server/package.json` | Server dependencies |

---

## SCRIPTS

| File | Purpose |
|------|---------|
| `scripts/dev-with-port-check.cjs` | Development server with port validation |
| `scripts/check-deps.ts` | Dependency verification |
| `scripts/migrate-legacy-data.js` | Legacy data migration |
| `scripts/setup-migration.js` | Migration setup |
| `scripts/test-openai-key.js` | OpenAI key validation |
| `scripts/openai-codex-review.js` | Code review automation |

---

## DOCUMENTATION

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `docs/USER_GUIDE.md` | User workflows |
| `docs/INSTALLATION_GUIDE.md` | Setup instructions |
| `docs/PROJECT_STRUCTURE.md` | Code organization |
| `docs/DATABASE_SCHEMA_AUDIT_2025.md` | Database details |
| (+ 10+ more doc files) | Various guides |

---

## CONFIGURATION & DEPLOYMENT

| File | Purpose |
|------|---------|
| `Dockerfile` | Docker configuration |
| `netlify.toml` | Netlify deployment config |
| `frontend-nginx.conf` | Nginx configuration |
| `.gcloudignore` | Google Cloud ignore rules |
| `.gitignore` | Git ignore rules |
| `launch-fortress.sh` | Bash launch script |
| `launch-fortress.command` | macOS launch script |
| `setup.sh` | Setup script |

---

**Total Files Referenced: 200+**  
**Lines of Code: ~50,000+**  
**Test Coverage: Partial (hooks, services, utilities)**

